import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Détect si c'est un iPhone/iPad et si l'app n'est pas déjà installée
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      // Vérifier si l'utilisateur a déjà fermé le prompt (localStorage)
      const promptDismissed = localStorage.getItem('sentinelle_ios_prompt_dismissed');
      if (!promptDismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  if (!showPrompt) return null;

  const handleClose = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt for 30 days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    localStorage.setItem('sentinelle_ios_prompt_dismissed', expirationDate.toISOString());
  };

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Background backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 rounded-[24px]" 
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Card */}
      <div className="relative bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-primary)] p-5 rounded-[24px] shadow-2xl">
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="relative w-16 h-16 rounded-[12px] overflow-hidden flex-shrink-0 border border-[var(--border-color)] shadow-md">
            <img 
              src="https://res.cloudinary.com/droxtvmsy/image/upload/v1779123733/1779123400829_cjh9le.png" 
              alt="Sentinelle" 
              className="w-full h-full object-cover" 
              loading="lazy"
            />
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            <h3 className="font-semibold text-base text-[var(--text-primary)] mb-2">
              Installer Sentinelle
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Appuyez sur l'icône de partage, puis sur "Sur l'écran d'accueil" pour accéder à l'application depuis votre écran d'accueil.
            </p>
          </div>

          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="flex-shrink-0 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors active:scale-95 -mt-2 -mr-2"
            aria-label="Fermer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-3">
            Comment installer
          </p>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex gap-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-[10px] flex-shrink-0">1</span>
              <span>Appuyez sur l'icône de partage en bas</span>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-[10px] flex-shrink-0">2</span>
              <span>Sélectionnez "Sur l'écran d'accueil"</span>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-[10px] flex-shrink-0">3</span>
              <span>Appuyez sur "Ajouter"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
