import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../lib/AuthContext';
import { useProfile } from '../lib/useProfile';

type ProtectedRouteProps = {
  children: ReactNode;
};

/**
 * Route protégée pour les admins
 * - Attend que le profil se charge (loading === true → ne redirige pas)
 * - Affiche un loader pendant le chargement
 * - Redirige les non-admins vers la page d'accueil
 * - Affiche une alerte en cas d'erreur au lieu de rediriger
 */
export default function ProtectedAdminRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error } = useProfile();

  // État 1: Authentification en cours
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--border-color)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // État 2: Pas d'utilisateur connecté
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // État 3: Profil en cours de chargement
  // IMPORTANT: Ne pas rediriger tant que loading === true
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--border-color)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // État 4: Erreur lors du chargement du profil
  // → Afficher une alerte au lieu de rediriger
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-6 max-w-md p-6 bg-[var(--bg-card)] rounded-2xl border border-red-500/30">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <span className="text-3xl text-red-600">!</span>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Erreur de permissions
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {error}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Veuillez recharger la page ou contacter l'administrateur.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent)] text-white rounded-lg transition-all active:scale-95 font-semibold"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  // État 5: L'utilisateur n'est pas admin
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // État 6: ✅ Utilisateur est admin → afficher le contenu protégé
  return <>{children}</>;
}
