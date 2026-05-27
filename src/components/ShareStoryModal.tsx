import { X } from "lucide-react";
import { useEffect, useState } from "react";
import ImageLightbox from "./ImageLightbox";

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertId: string;
  alertTitle: string;
  storyImageUrl?: string;
}

export default function ShareStoryModal({
  isOpen,
  onClose,
  alertId,
  alertTitle,
  storyImageUrl,
}: ShareStoryModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);
  
  const alertLink = `${window.location.origin}/alert/${alertId}`;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const openWhatsApp = () => {
    // Ouvre WhatsApp Web ou l'app mobile
    const whatsappUrl = `https://wa.me/?text=`;
    window.open(whatsappUrl, "_blank");
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
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-[var(--bg-card)] border border-[var(--border-color-strong)] rounded-[32px] max-w-md w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-bold uppercase tracking-widest">
              Partager sur WhatsApp
            </h2>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-[var(--bg-primary)] rounded-full transition-all active:scale-95"
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Story Preview */}
            {storyImageUrl && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                  Apercu de votre image
                </p>
                <img
                  src={storyImageUrl}
                  alt="Story Preview"
                  onClick={() => {
                    setSelectedImage({ url: storyImageUrl, alt: "Story Preview" });
                    setLightboxOpen(true);
                  }}
                  className="w-full max-h-96 object-contain rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] cursor-zoom-in transition-transform hover:scale-105"
                />
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-3 bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Instructions
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                L'image est dans vos telechargements et le lien est copie. Ouvrez WhatsApp, creez un statut, selectionnez l'image et collez votre lien.
              </p>
            </div>

            {/* Alert Link Info */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Lien copie dans le presse-papiers
              </p>
              <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm font-mono truncate text-[var(--text-secondary)]">
                {alertLink}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border-color)] space-y-3">
            <button
              onClick={openWhatsApp}
              className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-semibold uppercase tracking-widest text-xs bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all active:scale-95"
            >
              Ouvrir WhatsApp pour coller le lien
            </button>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-full font-semibold uppercase tracking-widest text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-primary)] transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      <ImageLightbox
        isOpen={lightboxOpen}
        imageUrl={selectedImage?.url || ""}
        imageAlt={selectedImage?.alt || ""}
        onClose={() => {
          setLightboxOpen(false);
          setSelectedImage(null);
        }}
      />
    </>
  );
}
