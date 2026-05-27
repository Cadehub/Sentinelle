import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Camera, Send, X, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { useNotifications } from "../lib/NotificationsContext";
import locationsData from "../../locations.json";

const ALERT_TYPES = ["Vol", "Perte", "Objet Trouvé", "Agression", "Accident", "Urgence Médicale", "Incendie", "Kidnapping", "Drame", "Autre"];
const CITIES = Object.keys(locationsData) as (keyof typeof locationsData)[];

export default function Publish() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [type, setType] = useState(ALERT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState(CITIES[0] || "");
  const [neighborhood, setNeighborhood] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  
  const [similarAlerts, setSimilarAlerts] = useState<any[]>([]);
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication state
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (neighborhood.length < 3) {
      setSimilarAlerts([]);
      return;
    }

    const checkSimilar = async () => {
      setCheckingSimilar(true);
      try {
        const { data, error } = await supabase
          .from("alerts")
          .select("id, title, city, neighborhood")
          .eq("city", city)
          .ilike("neighborhood", `%${neighborhood}%`)
          .eq("status", "actif")
          .limit(3);
        
        if (!error && data) {
          setSimilarAlerts(data);
        }
      } catch (err) {
        console.error("Erreur de vérification des redondances:", err);
      } finally {
        setCheckingSimilar(false);
      }
    }

    const timeout = setTimeout(checkSimilar, 800);
    return () => clearTimeout(timeout);
  }, [city, neighborhood]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // Add new files
      setImageFiles(prev => [...prev, ...fileArray]);
      
      // Generate previews
      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1080;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!session) {
        throw new Error("Authentification requise pour publier.");
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      if (!token) throw new Error("Jeton d'authentification manquant.");

      // ÉTAPE 0: Récupérer les alertes récentes du quartier pour détection des doublons
      console.log("[Publish] Step 0: Fetching recent alerts from neighborhood...");
      const { data: recentAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('id, title, description, type, created_at')
        .eq('city', city)
        .eq('neighborhood', neighborhood)
        .eq('status', 'actif')
        .order('created_at', { ascending: false })
        .limit(10);

      const recentAlertsPayload = alertsError ? [] : (recentAlerts || []);
      console.log("[Publish] Found", recentAlertsPayload.length, "recent alerts in neighborhood");

      // ÉTAPE 1: Appel Edge Function pour analyse IA uniquement (pas d'insertion)
      console.log("[Publish] Step 1: Calling publish-alert for IA analysis...");
      
      let imageBase64 = null;
      if (imageFiles.length > 0) {
        imageBase64 = await compressImage(imageFiles[0]);
      }

      const aiPayload = {
        title,
        description,
        type,
        city,
        neighborhood,
        duration_days: durationDays,
        imageBase64,
        recentAlerts: recentAlertsPayload
      };

      const fnUrl = import.meta.env.VITE_SUPABASE_URL 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-alert`
        : 'https://wcrkcuugancklxirqfyl.supabase.co/functions/v1/publish-alert';

      const aiResponse = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(aiPayload)
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        if (aiResponse.status === 400) {
          addNotification({
            title: "Alerte de Modération",
            body: "Votre signalement a été rejeté. Veuillez respecter les règles de publication."
          });
        }
        throw new Error(errorData.error || "Erreur lors de l'analyse IA.");
      }

      const aiAnalysis = await aiResponse.json();
      console.log("[Publish] Step 1 OK - IA Analysis:", aiAnalysis.ai_analysis);

      // ÉTAPE 1.5: Vérifier si l'IA a rejeté le contenu
      if (aiAnalysis.ai_analysis?.is_safe === false) {
        throw new Error(`Alerte refusée: ${aiAnalysis.ai_analysis.reason}`);
      }

      // ÉTAPE 1.6: Vérifier si un doublon existe
      if (aiAnalysis.ai_analysis?.is_duplicate === true) {
        console.log("[Publish] Duplicate detected:", aiAnalysis.ai_analysis.duplicate_id);
        const userChoice = window.confirm(
          "Une alerte similaire existe déjà dans ce quartier.\n\n" +
          "Cliquez OK pour voir l'alerte existante, ou Annuler pour publier votre alerte quand même."
        );
        
        if (userChoice) {
          // Redirection vers l'alerte existante
          navigate(`/alert/${aiAnalysis.ai_analysis.duplicate_id}`);
          setLoading(false);
          return;
        }
        // Sinon, continuer avec la publication
        console.log("[Publish] User chose to publish despite duplicate");
      }

      // ÉTAPE 2: Insertion directe en BDD (après approbation IA)
      console.log("[Publish] Step 2: Inserting alert directly to database...");
      
      let imageUrl = null;
      if (imageFiles.length > 0 && imageBase64) {
        // Tentative d'upload première image si elle existe
        try {
          const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY || '';
          if (imgbbKey) {
            const formData = new FormData();
            const imageData = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            formData.append('image', imageData);

            const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
              method: 'POST',
              body: formData,
            });

            if (imgbbRes.ok) {
              const imgbbData = await imgbbRes.json();
              if (imgbbData.success && imgbbData.data?.url) {
                imageUrl = imgbbData.data.url;
              }
            }
          }
        } catch (imgErr) {
          console.warn("[Publish] Image upload warning:", imgErr);
        }
      }

      // Récupération sécurisée de l'ID utilisateur (RLS requirement)
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        throw new Error("Vous devez être connecté pour publier une alerte.");
      }

      console.log("[Publish] User authenticated:", currentUser.id);

      // Extraction des données validées par l'Edge Function
      const detectedType = aiAnalysis.ai_analysis?.detected_type || type || 'Autre';
      const severity = aiAnalysis.ai_analysis?.severity || 'medium';
      const correctedText = aiAnalysis.ai_analysis?.corrected_text || description;

      // Calcul date expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // INSERTION RÉELLE EN BDD (avec user_id pour RLS)
      const alertPayload = {
        title: title.trim(),
        description: correctedText.trim(),
        type: detectedType,
        city: city || 'Douala',
        neighborhood: neighborhood || 'Non spécifié',
        contact: 'Chat Interne',
        duration_days: durationDays,
        expires_at: expiresAt.toISOString(),
        image_url: imageUrl || null,
        status: 'actif',
        user_id: currentUser.id // CRUCIAL pour RLS policy
      };

      console.log("[Publish] Inserting alert payload:", alertPayload);

      const { data: insertedAlert, error: insertError } = await supabase
        .from('alerts')
        .insert([alertPayload])
        .select();

      if (insertError) {
        console.error("[Publish] Insert error:", insertError);
        throw new Error(`Erreur BDD: ${insertError.message}`);
      }

      if (!insertedAlert || insertedAlert.length === 0) {
        throw new Error("Alerte créée mais données manquantes.");
      }

      const alertId = insertedAlert[0].id;
      console.log("[Publish] Step 2 OK - Alert inserted:", alertId);

      // ÉTAPE 3: Upload image via ImgBB (via Edge Function)
      if (alertId && imageFiles.length > 0) {
        try {
          console.log("[Publish] Step 3: Uploading image via ImgBB...");
          
          const selectedFile = imageFiles[0];
          const formData = new FormData();
          formData.append('file', selectedFile);

          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-alert-images', {
            body: formData,
          });

          if (uploadError) {
            console.error("[Publish] Upload-alert-images error:", uploadError);
          } else if (uploadData?.success && uploadData?.imageUrl) {
            // Mise à jour de l'alerte avec l'URL ImgBB
            const { error: updateError } = await supabase
              .from('alerts')
              .update({ image_url: uploadData.imageUrl })
              .eq('id', alertId);

            if (updateError) {
              console.warn("[Publish] Image URL update warning:", updateError);
            } else {
              console.log("[Publish] Step 3 OK - Image uploaded:", uploadData.imageUrl);
            }
          } else {
            console.warn("[Publish] Upload response missing success or imageUrl:", uploadData);
          }
        } catch (imgErr) {
          console.warn("[Publish] Image upload warning (non-fatal):", imgErr);
          addNotification({
            title: "Attention",
            body: "L'alerte a été publiée mais l'image n'a pas pu être uploadée."
          });
        }
      }

      // Succès!
      console.log("[Publish] All steps completed successfully!");
      addNotification({
        title: "Succès",
        body: "Votre alerte a été publiée avec succès!"
      });
      
      // Reset form
      setTitle("");
      setDescription("");
      setNeighborhood("");
      setImageFiles([]);
      setImagePreviews([]);
      
      navigate("/");
    } catch (err: any) {
      console.error("[Publish] Error:", err);
      setError(err.message || "Une erreur est survenue lors de la publication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 px-3 sm:px-4 md:px-0 animate-in slide-in-from-bottom-8 duration-700">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-light italic font-serif tracking-tight mb-2">Signaler un incident</h1>
        <p className="text-[9px] sm:text-sm text-[var(--text-secondary)] font-medium">
          Vos informations sont vérifiées par notre IA de modération avant publication finale.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        
        {error && (
          <div className="bg-red-500/10 text-red-500 p-3 sm:p-4 rounded-xl border border-red-500/20 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium text-xs sm:text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6 bg-[var(--bg-card)] p-4 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[32px] border border-[var(--border-color-strong)]">
          {/* Nature de l'alerte */}
          <div className="space-y-3">
            <label className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              1. Nature de l'alerte
            </label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {ALERT_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all active:scale-95 border",
                    type === t
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                      : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Titre Synthétique</label>
            <input
              required
              type="text"
              className="w-full bg-transparent border-b border-[var(--border-color)] p-2 text-xl font-medium focus:outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
              placeholder="Ex: Vol de véhicule Toyota Corolla..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Localisation</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City Select */}
              <select
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[16px] p-4 text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors appearance-none"
                value={city}
                onChange={e => {
                  setCity(e.target.value);
                  setNeighborhood("");
                }}
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Neighborhood Select */}
              <select
                required
                disabled={!city}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[16px] p-4 text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
              >
                <option value="">-- Sélectionner un quartier --</option>
                {city && locationsData[city as keyof typeof locationsData]?.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          
          {similarAlerts.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-[16px] animate-in fade-in">
              <div className="flex items-center gap-2 text-yellow-500 mb-2">
                <AlertCircle size={16} />
                <h3 className="text-[11px] font-bold uppercase tracking-widest">Alertes similaires proches</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Une alerte semblable existe déjà. Contribuez plutôt à celle-ci pour éviter les doublons.</p>
              <div className="space-y-2">
                {similarAlerts.map(alert => (
                   <a key={alert.id} href={`/alert/${alert.id}`} target="_blank" rel="noreferrer" className="block text-xs font-semibold p-2 bg-[var(--bg-primary)] rounded-[8px] hover:bg-yellow-500/10 transition-colors border border-[var(--border-color)]">
                     {alert.title} — {alert.neighborhood}
                   </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color-strong)]">
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              2. Détails & Description
            </label>
            <textarea
              required
              rows={4}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[16px] p-4 text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)] resize-none"
              placeholder="Décrivez précisément l'incident, les personnes impliquées ou les objets..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Photo */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Preuves visuelles (Optionnel - jusqu'à 10 images)</label>
            
            {/* Image gallery/previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-[var(--border-color)]">
                    <img src={preview} alt={`Preview ${idx}`} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                        setImageFiles(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add images button - only show if less than 10 images */}
            {imagePreviews.length < 10 && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-[var(--border-color-strong)] rounded-[16px] flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all active:scale-[0.98]"
                >
                  <Camera size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ajouter {imagePreviews.length === 0 ? 'des photos' : 'plus de photos'}</span>
                </button>
                <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageChange} />
              </>
            )}
          </div>
        </div>

        <div className="space-y-6 bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color-strong)]">
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              3. Durée de validité
            </label>
            <select
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color-strong)] rounded-[16px] p-4 focus:outline-none focus:border-[var(--text-primary)] transition-colors appearance-none"
              value={durationDays}
              onChange={e => setDurationDays(Number(e.target.value))}
            >
              <option value={7}>Actif pendant 7 jours</option>
              <option value={14}>Actif pendant 14 jours</option>
              <option value={30}>Actif pendant 30 jours</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] h-14 rounded-full flex items-center justify-center gap-2 font-bold uppercase tracking-widest hover:bg-[var(--text-primary)]/90 transition-all active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
        >
          {loading ? (
            <span className="animate-pulse">Génération en cours...</span>
          ) : (
            <>
              Diffuser l'alerte
              <Send size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
