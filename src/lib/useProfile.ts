import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  role: 'admin' | 'user';
  is_banned: boolean;
  trust_score: number;
  created_at: string;
};

/**
 * Hook pour récupérer le profil utilisateur avec gestion d'erreurs robuste
 * - Attend le chargement de l'auth avant de chercher le profil
 * - Gère les cas où le profil n'existe pas encore
 * - Subscribe aux changements real-time
 * - Expose les états: loading, error, profile
 */
export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ⚠️ Important: Attendre la fin du chargement auth avant de fetch le profil
    if (authLoading) {
      setLoading(true);
      setError(null);
      return;
    }

    // Si pas d'utilisateur connecté
    if (!user) {
      setLoading(false);
      setProfile(null);
      setError(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('id, role, is_banned, trust_score, created_at')
          .eq('id', user.id)
          .single();

        if (supabaseError) {
          // Code PGRST116 = "Result expected one row but found none"
          // C'est normal au premier login, on crée un profil par défaut
          if (supabaseError.code === 'PGRST116') {
            console.warn(`Profile not found for user ${user.id}, creating default user profile`);
            setProfile({
              id: user.id,
              role: 'user',
              is_banned: false,
              trust_score: 100,
              created_at: new Date().toISOString(),
            });
            setError(null);
          } else {
            // Autres erreurs (permission, connexion, etc.)
            console.error('Profile fetch error:', supabaseError);
            setError(supabaseError.message || 'Failed to fetch profile');
            setProfile(null);
          }
        } else if (data) {
          setProfile(data as Profile);
          setError(null);
        } else {
          // Aucune donnée mais pas d'erreur signalée
          setProfile({
            id: user.id,
            role: 'user',
            is_banned: false,
            trust_score: 100,
            created_at: new Date().toISOString(),
          });
          setError(null);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Profile hook error:', err);
        setError(errorMsg);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial du profil
    fetchProfile();

    // Subscribe aux changements real-time
    const subscription = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Profile subscription active');
        }
      });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [user, authLoading]);

  return { profile, loading, error };
}
