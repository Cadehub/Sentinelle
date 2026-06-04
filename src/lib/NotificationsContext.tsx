import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { usePreferences } from './preferences';

export type Notification = {
  id: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  timestamp: string;
};

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  deleteNotification: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
  deleteNotification: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('sentinelle_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { session, user } = useAuth();
  const { preferences } = usePreferences();

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('sentinelle_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    // 1. Coupe-circuit crucial : on attend que l'utilisateur soit connecté !
    if (!user || !user.id) return;

    // 2. Requête initiale (Historique)
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        setNotifications(data);
      }
    };
    fetchNotifs();

    // 3. Abonnement Temps Réel avec le bon filtre
    const channel = supabase
      .channel(`notifications-inbox-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          // Optionnel : Toast natif
          if (window && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotif.title, { body: newNotif.body });
          } else {
            try {
              const toast = document.createElement('div');
              toast.innerText = newNotif.title;
              toast.style.position = 'fixed';
              toast.style.bottom = '32px';
              toast.style.right = '32px';
              toast.style.background = '#222';
              toast.style.color = '#fff';
              toast.style.padding = '12px 20px';
              toast.style.borderRadius = '12px';
              toast.style.zIndex = '9999';
              toast.style.fontSize = '1rem';
              toast.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)';
              document.body.appendChild(toast);
              setTimeout(() => { toast.remove(); }, 3000);
            } catch {}
          }
        }
      )
      .subscribe();

    // 4. Nettoyage
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Alert and comment listeners (existing logic)
  useEffect(() => {
    if (!preferences.notificationsEnabled) return;

    const channelAlerts = supabase
      .channel('public:alerts:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        const newAlert = payload.new;
        
        try {
          const matchCity = preferences.subscribedCities.length > 0 ? preferences.subscribedCities.includes(newAlert.city) : false;
          const matchType = preferences.subscribedTypes.length > 0 ? preferences.subscribedTypes.includes(newAlert.type) : false;
          const matchRadar = preferences.radarNeighborhoods.length > 0 ? preferences.radarNeighborhoods.some(r => newAlert.neighborhood.toLowerCase().includes(r.toLowerCase())) : false;
          
          if (
            newAlert.status === 'actif' &&
            (preferences.subscribedCities.length === 0 && preferences.subscribedTypes.length === 0 && preferences.radarNeighborhoods.length === 0 || // no filters = all
             matchCity || matchType || matchRadar)
          ) {
            addNotification({
              title: matchRadar ? `[RADAR] DÉCLENCHÉ: ${newAlert.type}` : `Nouvelle alerte: ${newAlert.type}`,
              body: `${newAlert.neighborhood}, ${newAlert.city} - ${newAlert.title}`,
              link: `/alert/${newAlert.id}`
            });
            
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(matchRadar ? "[RADAR] Sentinelle" : "Alerte Sentinelle", {
                body: `${newAlert.neighborhood} - ${newAlert.title}`,
              });
            }
          }
        } catch(e) {
          console.error(e);
        }
      })
      .subscribe();

    const channelComments = supabase
      .channel('public:comments:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
        const newComment = payload.new;
        if (
          preferences.interactedAlerts.length > 0 &&
          preferences.interactedAlerts.includes(newComment.alert_id) &&
          newComment.user_id !== session?.user?.id
        ) {
          addNotification({
            title: "Nouveau commentaire",
            body: "Quelqu'un a commenté une alerte que vous suivez.",
            link: `/alert/${newComment.alert_id}`
          });
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Sentinelle - Nouveau Commentaire", {
              body: "Quelqu'un a commenté une alerte que vous suivez.",
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelAlerts);
      supabase.removeChannel(channelComments);
    };
  }, [preferences.subscribedCities, preferences.subscribedTypes, preferences.radarNeighborhoods, preferences.notificationsEnabled, preferences.interactedAlerts, session?.user?.id]);

  const addNotification = (notif: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  };

  const markAsRead = async (id: string) => {
    if (!user?.id) return;
    // 1. Mettre à jour en base
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
    // 2. Mettre à jour le state local
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;
    await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications, deleteNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
