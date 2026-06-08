import { X, Camera } from "lucide-react";
import { useState, useRef } from "react";

const CATEGORY_MAPPING: Record<string, string[]> = {
  "Documents": ["Carte Nationale d'Identité (CNI)", "Passeport", "Permis de conduire", "Acte de naissance", "Diplôme / Attestation", "Carte d'étudiant"],
  "Électronique": ["Téléphone portable / Smartphone", "Ordinateur portable", "Tablette", "Écouteurs / Casque", "Powerbank / Chargeur"],
  "Moyens de transport": ["Clé de voiture", "Clé de moto", "Documents de bord (Carte grise, Assurance)", "Vélo"],
  "Effets personnels": ["Portefeuille", "Sac à main / Sac à dos", "Trousseau de clés (Maison)", "Bijoux / Montre", "Lunettes"],
  "Argent & Cartes": ["Numéraire / Cash", "Carte bancaire (Visa, Mastercard)", "Carte de retrait locale"],
};

interface EditAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: any;
  onSave: (data: any) => Promise<void>;
  loading?: boolean;
}

export default function EditAlertModal({
  isOpen,
  onClose,
  alert,
  onSave,
  loading = false,
}: EditAlertModalProps) {
  const [formData, setFormData] = useState({
    title: alert?.title || "",
    description: alert?.description || "",
    main_type: alert?.main_type || alert?.type || "",
    type: alert?.type || alert?.main_type || "",
    sub_type: alert?.sub_type || "",
    item_category: alert?.item_category || "",
    city: alert?.city || "",
    neighborhood: alert?.neighborhood || "",
    contact: alert?.contact || "",
    duration_days: "7",
    status: alert?.status || "actif",
  });
  
  const [imagePreviews, setImagePreviews] = useState<string[]>(alert?.image_url ? [alert.image_url] : []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "main_type" ? { type: value } : {}),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // Add new files
      setNewImages(prev => [...prev, ...fileArray]);
      
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

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    // If it's a new image, remove it from newImages too
    if (index >= (alert?.image_url ? 1 : 0)) {
      setNewImages(prev => prev.filter((_, i) => i !== (index - (alert?.image_url ? 1 : 0))));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        id: alert.id,
        type: formData.main_type || formData.type,
        main_type: formData.main_type || formData.type,
        sub_type: formData.sub_type || null,
        item_category: formData.item_category || null,
      };

      // Compress new images if any
      if (newImages.length > 0) {
        const compressedImages = [];
        for (const file of newImages) {
          const base64 = await compressImage(file);
          compressedImages.push(base64);
        }
        payload.newImages = compressedImages;
      }

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-label="Backdrop"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div
          className="bg-[var(--bg-card)] border border-[var(--border-color-strong)] rounded-[32px] max-w-2xl w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300 shadow-xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-bold uppercase tracking-widest">
              Modifier l'alerte
            </h2>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-[var(--bg-primary)] rounded-full transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                Titre de l'alerte
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                placeholder="Ex: Agression en cours"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors resize-none"
                placeholder="Décrivez l'incident en détail..."
              />
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Statut principal
                </label>
                <select
                  name="main_type"
                  value={formData.main_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                >
                  <option value="">Sélectionner...</option>
                  <option value="lost">Perdu</option>
                  <option value="found">Trouvé</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Statut
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                >
                  <option value="actif">Actif</option>
                  <option value="résolu">Résolu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Catégorie
                </label>
                <select
                  name="sub_type"
                  value={formData.sub_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                >
                  <option value="">Sélectionner...</option>
                  <option value="document">Document</option>
                  <option value="object">Objet</option>
                  <option value="person">Personne</option>
                  <option value="vehicle">Véhicule</option>
                  <option value="animal">Animal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Sous-catégorie
                </label>
                <input
                  type="text"
                  name="item_category"
                  value={formData.item_category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                  placeholder="Ex: Téléphone, Portefeuille, Chien..."
                />
              </div>
            </div>

            {(formData.sub_type === 'document' || formData.sub_type === 'object') && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Choix de catégorie
                </label>
                <select
                  value={formData.item_category}
                  onChange={handleChange}
                  name="item_category"
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {Object.entries(CATEGORY_MAPPING).map(([group, items]) => (
                    <optgroup key={group} label={group}>
                      {items.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* City and Neighborhood */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Ville
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                  placeholder="Ex: Douala"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                  Quartier
                </label>
                <input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                  placeholder="Ex: Bonanjo"
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                Contact WhatsApp
              </label>
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                placeholder="Ex: +237 123 456 789"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                Durée de validité (jours)
              </label>
              <select
                name="duration_days"
                value={formData.duration_days}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
              >
                <option value="3">3 jours</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
              </select>
            </div>

            {/* Images */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-secondary)]">
                Images
              </label>
              
              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-[var(--border-color)]">
                      <img src={preview} alt={`Preview ${idx}`} className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add images button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] rounded-xl text-sm text-[var(--text-secondary)] hover:border-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                Ajouter des images
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-full font-semibold uppercase tracking-widest text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-primary)] transition-all active:scale-95"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 rounded-full font-semibold uppercase tracking-widest text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Sauvegarde..." : "Mettre à jour"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
