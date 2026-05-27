import { useEffect } from "react";

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

export default function ImageLightbox({
  isOpen,
  imageUrl,
  imageAlt,
  onClose,
}: ImageLightboxProps) {
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white text-3xl font-light hover:opacity-70 transition-opacity active:scale-95 w-12 h-12 flex items-center justify-center"
          title="Fermer (Esc)"
          aria-label="Fermer"
        >
          [X]
        </button>

        {/* Image container */}
        <div
          className="w-full h-full flex items-center justify-center max-w-6xl max-h-screen"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    </>
  );
}
