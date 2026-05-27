import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { MessageCircle, Share2, MapPin, Clock, ArrowLeft, Send, Edit, Trash2, Loader } from "lucide-react";
import { cn } from "../lib/utils";
import { formatDistanceToNow, parseISO, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { useAuth } from "../lib/AuthContext";
import { usePreferences } from "../lib/preferences";
import { useNotifications } from "../lib/NotificationsContext";
import ShareStoryModal from "../components/ShareStoryModal";
import EditAlertModal from "../components/EditAlertModal";
import ImageLightbox from "../components/ImageLightbox";

export default function AlertDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<any>(null);
  const [alertImages, setAlertImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [storyImageUrl, setStoryImageUrl] = useState<string>("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const visualRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { addNotification } = useNotifications();

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }
        if (data) setAlert(data);

        // Charger les images associées
        const { data: images, error: imagesError } = await supabase
          .from("alert_images")
          .select("*")
          .eq("alert_id", id)
          .order("image_order", { ascending: true });

        if (!imagesError && images) {
          setAlertImages(images);
        }
      } catch (e) {
        console.warn("Could not fetch from real Supabase for ID:", id);
      } finally {
        setLoading(false);
      }
    };

    fetchAlert();
  }, [id]);

  const getAllImages = () => {
    const images = [];
    if (alert?.image_url) {
      images.push({ image_url: alert.image_url, image_order: -1 });
    }
    images.push(...alertImages);
    return images;
  };

  const allImages = getAllImages();
  const mainImage = allImages.length > 0 ? allImages[mainImageIndex] : null;

  const swapWithMain = (index: number) => {
    setMainImageIndex(index);
  };

  const generateStoryImage = async () => {
    if (!storyRef.current) return null;
    try {
      const dataUrl = await toPng(storyRef.current, {
        pixelRatio: 2,
        backgroundColor: "#000000"
      });
      return dataUrl;
    } catch (err) {
      console.error("Erreur lors de la génération de l'image story:", err);
      return null;
    }
  };

  const downloadImage = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Erreur lors de la copie dans le presse-papiers:", err);
      return false;
    }
  };

  const handleShareStory = async () => {
    setGeneratingVisual(true);
    try {
      // 1. Générer l'image story
      const imageUrl = await generateStoryImage();
      if (!imageUrl) {
        alert("Impossible de générer l'image story. Veuillez réessayer.");
        return;
      }

      // 2. Télécharger automatiquement l'image
      const timestamp = new Date().getTime();
      downloadImage(imageUrl, `story-sentinelle-${alert.id}-${timestamp}.png`);

      // 3. Copier le lien unique dans le presse-papiers
      const alertLink = `${window.location.origin}/alert/${alert.id}`;
      await copyToClipboard(alertLink);

      // 4. Afficher le modal de partage
      setStoryImageUrl(imageUrl);
      setIsShareModalOpen(true);
    } finally {
      setGeneratingVisual(false);
    }
  };

  const handleUpdateAlert = async (formData: any) => {
    setIsUpdating(true);
    try {
      if (!user) {
        throw new Error("Non authentifié");
      }

      const { id, title, description, type, city, neighborhood, duration_days, status, newImages } = formData;

      // Préparer les données à mettre à jour
      const updateData: any = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (type) updateData.type = type;
      if (city) updateData.city = city;
      if (neighborhood) updateData.neighborhood = neighborhood;
      if (status) updateData.status = status;

      // Calculer la nouvelle date d'expiration
      if (duration_days) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days));
        updateData.expires_at = expiresAt.toISOString();
      }

      // Mettre à jour directement avec Supabase (RLS va vérifier que c'est l'auteur)
      const { data: updatedAlert, error } = await supabase
        .from("alerts")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedAlert) {
        throw new Error("Alerte non trouvée ou vous n'êtes pas autorisé à la modifier");
      }

      // Upload new images if any
      if (newImages && newImages.length > 0) {
        console.log('Uploading', newImages.length, 'images via Edge Function');
        
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(
            `${supabaseUrl}/functions/v1/upload-alert-images`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ images: newImages }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Edge Function error:", errorData);
            throw new Error("Erreur lors de l'upload des images");
          }

          const { urls } = await response.json();
          console.log('Images uploaded:', urls);

          // Save to alert_images table
          for (let i = 0; i < urls.length; i++) {
            const { error: insertError } = await supabase.from('alert_images').insert({
              alert_id: id,
              image_url: urls[i],
              image_order: i,
              created_at: new Date().toISOString()
            });
            
            if (insertError) {
              console.error("Erreur insert alert_images:", insertError);
            } else {
              console.log("Image saved to DB:", urls[i]);
            }
          }
        } catch (err) {
          console.error("Erreur lors du traitement des images:", err);
          addNotification({
            title: "Attention",
            body: "Les images n'ont pas pu être uploadées, mais l'alerte a été modifiée"
          });
        }
      }

      setAlert(updatedAlert);
      setIsEditModalOpen(false);

      // Recharger les images
      const { data: images } = await supabase
        .from("alert_images")
        .select("*")
        .eq("alert_id", id)
        .order("image_order", { ascending: true });
      
      if (images) {
        setAlertImages(images);
      }

      addNotification({
        title: "Succès",
        body: "Alerte mise à jour avec succès"
      });
    } catch (error: any) {
      console.error("Erreur:", error);
      addNotification({
        title: "Erreur",
        body: error.message || "Erreur lors de la mise à jour"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAlert = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette alerte ? Cette action est irréversible.")) {
      return;
    }

    setIsDeleting(true);
    try {
      console.log("[AlertDetails] Deleting alert:", alert.id);

      // Suppression directe via le client Supabase (RLS policy vérifie la propriété)
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alert.id);

      if (error) {
        console.error("[AlertDetails] Delete error:", error);
        throw error;
      }

      console.log("[AlertDetails] Alert deleted successfully");
      addNotification({
        title: "Succès",
        body: "Alerte supprimée avec succès"
      });
      
      navigate("/");
    } catch (error: any) {
      console.error("[AlertDetails] Error:", error);
      addNotification({
        title: "Erreur",
        body: error.message || "Erreur lors de la suppression"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="py-20 text-center animate-pulse">Chargement en cours...</div>;
  if (!alert) return <div className="py-20 text-center text-red-500 font-bold">Alerte introuvable ou expirée.</div>;

  const isCritical = alert.type.toLowerCase().includes("urgence") || alert.type.toLowerCase().includes("agression") || alert.type.toLowerCase().includes("critique");
  const isOwner = user && user.id === alert.user_id;

  const handleStartChat = async () => {
    setRoomLoading(true);

    try {
      // ====== VÉRIFICATION 1: Utilisateur connecté ======
      if (!user || !user.id) {
        console.error("Erreur : Aucun utilisateur connecté");
        console.error("Valeur user:", user);
        addNotification({
          title: "Erreur d'authentification",
          body: "Vous devez être connecté pour démarrer une conversation"
        });
        setRoomLoading(false);
        return;
      }

      // ====== VÉRIFICATION 2: Alerte valide ======
      if (!alert || !alert.id) {
        console.error("Erreur : L'alerte n'est pas définie");
        console.error("Valeur alert:", alert);
        addNotification({
          title: "Erreur",
          body: "L'alerte n'existe pas ou a été supprimée"
        });
        setRoomLoading(false);
        return;
      }

      // ====== VÉRIFICATION 3: Auteur de l'alerte défini ======
      if (!alert.user_id) {
        console.error("Erreur : L'auteur de l'alerte n'est pas défini");
        console.error("Valeur alert.user_id:", alert.user_id);
        addNotification({
          title: "Erreur",
          body: "Impossible de démarrer une conversation : auteur de l'alerte manquant"
        });
        setRoomLoading(false);
        return;
      }

      // ====== VÉRIFICATION 4: Pas de conversation avec soi-même ======
      if (user.id === alert.user_id) {
        console.warn("Tentative de créer une conversation avec soi-même");
        addNotification({
          title: "Impossible",
          body: "Vous ne pouvez pas converser avec vous-même"
        });
        setRoomLoading(false);
        return;
      }

      // ====== LOG: Données avant envoi ======
      console.log("Tentative de création de salon avec :", {
        alert_id: alert.id,
        finder_id: user.id,
        owner_id: alert.user_id
      });

      // ====== ÉTAPE 1: Vérification de l'existence du salon ======
      const { data: existingRoom, error: checkError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("alert_id", alert.id)
        .eq("finder_id", user.id)
        .maybeSingle();

      if (checkError) {
        console.error("Erreur lors de la vérification du salon :", checkError);
        throw checkError;
      }

      if (existingRoom) {
        console.log("Salon existant trouvé, redirection vers :", existingRoom.id);
        navigate(`/discussions/${existingRoom.id}`);
        setRoomLoading(false);
        return;
      }

      // ====== ÉTAPE 2: Insertion du nouveau salon ======
      const { data: newRoom, error: createError } = await supabase
        .from("chat_rooms")
        .insert([
          {
            alert_id: alert.id,
            finder_id: user.id,
            owner_id: alert.user_id
          }
        ])
        .select("*")
        .single();

      // Handle 409 Conflict (room already exists - race condition)
      if (createError?.code === "409" || createError?.message?.includes("409")) {
        console.warn("Conflit 409: Le salon existe probablement déjà (race condition). Recherche du salon existant...");
        
        // Retry GET to find the room that was just created
        const { data: retryRoom, error: retryError } = await supabase
          .from("chat_rooms")
          .select("*")
          .eq("alert_id", alert.id)
          .eq("finder_id", user.id)
          .maybeSingle();
        
        if (retryError) {
          console.error("Erreur lors de la recherche du salon après conflit 409:", retryError);
          throw retryError;
        }
        
        if (retryRoom) {
          console.log("[INFO] Salon trouvé après conflit, redirection vers :", retryRoom.id);
          navigate(`/discussions/${retryRoom.id}`);
          setRoomLoading(false);
          return;
        }
      }

      if (createError) {
        console.error("[ERROR] ERREUR SUPABASE - Détails complets :");
        console.error("  Message:", createError.message);
        console.error("  Détails:", createError.details);
        console.error("  Hint:", createError.hint);
        console.error("  Code:", createError.code);
        console.error("  Objet complet:", createError);
        throw new Error(`Impossible de créer la conversation: ${createError.message}`);
      }

      if (!newRoom || !newRoom.id) {
        console.error("Erreur : Aucune données retournée après insertion");
        throw new Error("La conversation a été créée mais sans ID");
      }

      console.log("[INFO] Salon créé avec succès, ID:", newRoom.id);
      navigate(`/discussions/${newRoom.id}`);

    } catch (error: any) {
      console.error("[ERROR] ERREUR GÉNÉRALE dans handleStartChat:");
      console.error("  Type:", error?.constructor?.name);
      console.error("  Message:", error?.message);
      console.error("  Objet complet:", error);

      addNotification({
        title: "Erreur",
        body: error?.message || "Impossible de créer ou rejoindre la conversation"
      });
    } finally {
      setRoomLoading(false);
    }
  };

  const canStartDiscussion = user && user.id !== alert.user_id;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-all active:scale-95">
        <ArrowLeft size={16} /> Retour au flux
      </Link>

      {alert.status === 'résolu' && (
        <div className="mb-8 p-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20">
            <Send size={14} />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest">Alerte Résolue</h3>
            <p className="text-xs opacity-80">Cette alerte n'est plus active suite à une mise à jour de l'auteur.</p>
          </div>
        </div>
      )}

      <div className={cn(
        "bg-[var(--bg-card)] border border-[var(--border-color-strong)] overflow-hidden rounded-[32px] animate-in fade-in zoom-in-95 duration-500",
        isCritical && "shadow-xl border-red-500/30",
        alert.status === 'résolu' && "opacity-50 grayscale pointer-events-none"
      )}>
        {mainImage && (
          <div className="w-full bg-[var(--bg-primary)]">
            {/* Image principale - object-contain pour voir l'image complète */}
            <div 
              className="w-full max-h-[600px] flex items-center justify-center bg-[var(--bg-primary)] cursor-zoom-in overflow-hidden"
              onClick={() => {
                setSelectedImage({
                  url: mainImage.image_url,
                  alt: alert.title
                });
                setLightboxOpen(true);
              }}
            >
              <img 
                src={mainImage.image_url} 
                alt={alert.title} 
                className="max-w-full max-h-[600px] object-contain"
              />
            </div>
            
            {/* Galerie des thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 p-4 bg-[var(--bg-primary)] overflow-x-auto border-t border-[var(--border-color)]">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => swapWithMain(idx)}
                    className={cn(
                      "shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all active:scale-95",
                      mainImageIndex === idx
                        ? "border-[var(--text-primary)] ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-primary)]"
                        : "border-[var(--border-color)] hover:border-[var(--text-secondary)]"
                    )}
                  >
                    <img 
                      src={img.image_url} 
                      alt={`Vignette ${idx + 1}`} 
                      className="w-full h-full object-contain bg-[var(--bg-card)]"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-8 md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <span className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
              isCritical ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-[var(--text-primary)] border-[var(--border-color)] bg-[var(--bg-primary)]"
            )}>
              {alert.type}
            </span>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-mono uppercase tracking-widest opacity-80">
              <Clock size={14} />
              <Countdown expiresAt={alert.expires_at} />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-light italic font-serif tracking-tight mb-8 leading-[1.1]">
            {alert.title}
          </h1>

          <div className="flex items-center gap-3 text-sm font-mono border-b border-[var(--border-color)] pb-8 mb-8 opacity-70">
            <MapPin size={18} />
            <span className="uppercase tracking-widest">{alert.neighborhood}, {alert.city}</span>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed mb-12">
            <p>{alert.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {canStartDiscussion && (
              <button
                onClick={handleStartChat}
                disabled={roomLoading}
                className="w-full h-14 rounded-full flex items-center justify-center gap-3 font-semibold uppercase tracking-widest text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {roomLoading ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Chargement...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    Contacter le {isOwner ? 'découvreur' : 'propriétaire'}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                Diffusez l'information
              </p>
              <button
                onClick={handleShareStory}
                disabled={generatingVisual}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-all active:scale-95 disabled:active:scale-100 disabled:opacity-50"
              >
                {generatingVisual ? "Génération..." : (
                  <>
                    <Share2 size={14} />
                    Story WhatsApp
                  </>
                )}
              </button>
            </div>

            {user && alert.user_id === user.id && (
              <div className="flex gap-2 pt-4 border-t border-[var(--border-color)]">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  disabled={isUpdating || isDeleting}
                >
                  <Edit size={14} />
                  Modifier
                </button>
                <button
                  onClick={handleDeleteAlert}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  disabled={isDeleting || isUpdating}
                >
                  <Trash2 size={14} />
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden h-0 opacity-0 pointer-events-none">
        <div ref={visualRef} className="w-[1080px] h-[1920px] bg-[#0A0A0A] text-white p-20 flex flex-col justify-between relative font-sans">
          
          {alert.image_url && (
            <div className="absolute inset-0 z-0">
              <img src={alert.image_url} alt="Bg" className="w-full h-full object-cover blur-2xl scale-110 opacity-30" />
            </div>
          )}

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header with Logo & Contact */}
            <div className="flex items-center justify-between border-b border-white/20 pb-8">
              <div className="flex items-center gap-6">
                {/* Logo Sentinelle */}
                <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center rounded-3xl shadow-lg shadow-red-600/50 relative">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-bold text-red-600 text-2xl relative">
                    S
                  </div>
                </div>
                <div>
                  <span className="font-bold text-5xl tracking-tighter uppercase text-white">Sentinelle</span>
                  <p className="text-lg text-red-400 mt-2 font-semibold">Alerte Citoyenne</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "px-8 py-3 rounded-full text-2xl font-bold uppercase tracking-widest border-2 block mb-4",
                  isCritical ? "text-red-500 border-red-500/50 bg-red-500/10" : "text-white border-white/30"
                )}>
                   {alert.type}
                </span>
                {/* Contact Info Box */}
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                  <p className="text-sm text-white/60 uppercase mb-1 tracking-wider font-semibold">Accédez à la plateforme</p>
                  <p className="text-3xl font-bold text-white font-mono">SENTINELLE</p>
                  <p className="text-xs text-blue-400 mt-2 uppercase font-bold tracking-wider">Discussion Sécurisée</p>
                </div>
              </div>
            </div>

            <div className="space-y-12 my-auto">
              {alert.image_url && (
                <img src={alert.image_url} alt="Proof" className="w-full h-[600px] object-cover rounded-[64px] border-4 border-white/10" />
              )}
              <h1 className="text-[100px] font-light italic font-serif leading-[0.9] tracking-tighter">
                {alert.title}
              </h1>
              
              <div className="inline-flex items-center gap-4 bg-white/10 px-8 py-6 rounded-full">
                <MapPin size={40} />
                <span className="text-4xl uppercase tracking-widest">{alert.neighborhood}, {alert.city}</span>
              </div>
            </div>

            <div className="border-t border-white/20 pt-12 flex items-center justify-between mt-auto">
              <div className="max-w-xl">
                <h3 className="text-4xl font-bold mb-4 uppercase tracking-tighter">Aidez-nous à agir.</h3>
                <p className="text-2xl text-white/60">Scannez ce QR code avec votre appareil photo pour accéder aux coordonnées et réagir instantanément sur la plateforme.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl">
                <QRCodeSVG value={`${window.location.origin}/alert/${alert.id}`} size={250} level="M" />
              </div>
            </div>
          </div>
        </div>

        {/* Story Generator avec Logo - Compact */}
        <div ref={storyRef} className="w-[540px] bg-gradient-to-b from-slate-900 to-black text-white p-6 flex flex-col justify-between relative font-sans overflow-hidden">
          {/* Background Image with Blur */}
          {(alert.image_url || (alertImages && alertImages.length > 0)) && (
            <div className="absolute inset-0 z-0">
              <img
                src={alert.image_url ? alert.image_url : alertImages[0]?.image_url}
                alt="Bg"
                className="w-full h-full object-cover blur-2xl scale-110 opacity-25"
              />
            </div>
          )}

          <div className="relative z-10 flex flex-col">
            {/* Top Section - Logo & Title */}
            <div className="space-y-2 mb-4">
              {/* Logo from Cloudinary */}
              <div className="flex justify-center">
                <img
                  src="https://res.cloudinary.com/droxtvmsy/image/upload/v1779060713/1779060412626_qkpguh.png"
                  alt="Sentinelle Logo"
                  className="h-16 object-contain"
                />
              </div>
              
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold uppercase tracking-tighter">SENTINELLE</h2>
                <p className="text-red-400 text-xs font-semibold">Alerte Citoyenne</p>
              </div>
            </div>

            {/* Middle Section - Alert Content with Images - Compact */}
            <div className="space-y-3 flex-1">

              {/* Main Image - object-contain pour voir l'image complète */}
              {(alert.image_url || (alertImages && alertImages.length > 0)) && (
                <div className="space-y-2">
                  <img
                    src={alert.image_url ? alert.image_url : alertImages[0]?.image_url}
                    alt="Preuve Principale"
                    className="w-full max-h-[300px] object-contain rounded-2xl border-2 border-white/30 shadow-lg bg-black/50"
                  />
                  
                  {/* Gallery Grid - Show additional images if available */}
                  {alertImages.length > 1 && (
                    <div className="grid grid-cols-3 gap-1">
                      {alertImages.slice(1, 4).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.image_url}
                          alt={`Preuve ${idx + 2}`}
                          className="w-full h-12 object-contain rounded-lg border border-white/20 bg-black/50"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className={cn(
                  "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border",
                  isCritical ? "text-red-500 border-red-500/50 bg-red-500/10" : "text-white border-white/30"
                )}>
                  {alert.type}
                </span>
              </div>

              <h1 className="text-xl font-light italic font-serif leading-tight">
                {alert.title}
              </h1>

              <div className="flex items-center gap-2 text-xs">
                <MapPin size={14} />
                <span className="uppercase tracking-widest font-semibold">{alert.neighborhood}, {alert.city}</span>
              </div>
            </div>

            {/* Bottom Section - CTA - Compact */}
            <div className="text-center space-y-1 border-t border-white/20 pt-3 mt-4">
              <p className="text-xs font-semibold text-white/80">Partagez cette alerte</p>
              <p className="text-[11px] text-white/60">Sentinelle - Plateforme d'alerte citoyenne</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShareStoryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        alertId={alert?.id || ""}
        alertTitle={alert?.title || ""}
        storyImageUrl={storyImageUrl}
      />

      <EditAlertModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        alert={alert}
        onSave={handleUpdateAlert}
        loading={isUpdating}
      />

      <ImageLightbox
        isOpen={lightboxOpen}
        imageUrl={selectedImage?.url || ""}
        imageAlt={selectedImage?.alt || ""}
        onClose={() => {
          setLightboxOpen(false);
          setSelectedImage(null);
        }}
      />
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  try {
    const date = parseISO(expiresAt);
    if (isPast(date)) return <span>Expiré</span>;
    return <span>Expire {formatDistanceToNow(date, { locale: fr })}</span>;
  } catch (e) {
    return <span>-</span>;
  }
}
