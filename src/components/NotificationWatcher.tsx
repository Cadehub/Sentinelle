import { useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../lib/preferences';
import { useNotifications } from '../lib/NotificationsContext';
import { useAuth } from '../lib/AuthContext';
import { getRegionFromCity } from "../lib/regions";
import { app } from '../utils/firebaseConfig';

export function NotificationWatcher() {
  const { user } = useAuth();
  const { preferences: { notificationsEnabled, subscribedRegions, subscribedTypes, radarNeighborhoods } } = usePreferences();
  const { addNotification } = useNotifications();
  const appIconUrl = 'https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png';

  useEffect(() => {
    if (!notificationsEnabled) return;

    // Request browser permission if not already granted
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase.channel('alerts-watcher');
    if (!channel?.on) {
      console.warn("Le canal d'écoute des notifications n'est pas encore prêt.");
    } else {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const newAlert = payload.new as any;
          
          try {
            // Check filters
            const matchRegion = subscribedRegions.length > 0 ? subscribedRegions.includes(getRegionFromCity(newAlert.city)) : false;
            const matchType = subscribedTypes.length > 0 ? subscribedTypes.includes(newAlert.type) : false;
            const matchRadar = radarNeighborhoods.length > 0 ? radarNeighborhoods.some(r => newAlert.neighborhood.toLowerCase().includes(r.toLowerCase())) : false;
            
            // Show notification if: (no filters set) OR (matches at least one filter)
            const shouldNotify = (
              (subscribedRegions.length === 0 && subscribedTypes.length === 0 && radarNeighborhoods.length === 0) ||
              matchRegion || matchType || matchRadar
            );

            if ((newAlert.status === "active" || newAlert.status === "actif") && shouldNotify) {
              const isRadarAlert = matchRadar;
              const title = isRadarAlert ? `[RADAR] DÉCLENCHÉ: ${newAlert.type}` : `Nouvelle alerte: ${newAlert.type}`;
              const body = `${newAlert.neighborhood}, ${newAlert.city} - ${newAlert.title}`;

              // Add to notifications panel
              addNotification({
                title,
                body,
                link: `/alert/${newAlert.id}`
              });

              // Send browser notification if permitted
              if (Notification.permission === 'granted') {
                const notification = new Notification(isRadarAlert ? "[RADAR] Sentinelle" : "Alerte Sentinelle", {
                  body,
                  icon: appIconUrl,
                  tag: `alert-${newAlert.id}`,
                  requireInteraction: isRadarAlert, // Keep radar alerts visible longer
                });

                notification.onclick = () => {
                  window.focus();
                  window.location.href = `/alert/${newAlert.id}`;
                };
              }
            }
          } catch (err) {
            console.error('[NotificationWatcher] Error processing alert:', err);
          }
        }
      );
      channel.subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [notificationsEnabled, subscribedRegions, subscribedTypes, radarNeighborhoods, addNotification]);

  // Real-time listener for notifications table
  useEffect(() => {
    if (!user?.id || !notificationsEnabled) return;

    const notificationsChannel = supabase.channel(`notifications_${user.id}`);
    if (!notificationsChannel?.on) {
      console.warn("Le canal d'écoute des notifications n'est pas encore prêt.");
      return;
    }

    notificationsChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
        (payload) => {
          const newNotification = payload.new as any;

          try {
            // Add to notification panel (increments badge counter)
            addNotification({
              title: newNotification.title,
              body: newNotification.body,
              link: newNotification.link || undefined,
            });

            // Show toast notification using Notification API
            if (Notification.permission === 'granted') {
              const notification = new Notification(newNotification.title, {
                body: newNotification.body,
                icon: appIconUrl,
                tag: `notification-${newNotification.id}`,
              });

              // Navigate on click if link exists
              if (newNotification.link) {
                notification.onclick = () => {
                  window.focus();
                  window.location.href = newNotification.link;
                };
              }
            }
          } catch (err) {
            console.error('[NotificationWatcher] Error processing notification:', err);
          }
        }
      );

    notificationsChannel.subscribe();

    return () => {
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel);
      }
    };
  }, [user?.id, notificationsEnabled, addNotification]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === 'undefined') return;

    let unsubscribe: (() => void) | undefined;
    try {
      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'Sentinelle';
        const body = payload.notification?.body || '';
        const data = payload.data || {};

        let link: string | undefined;
        if (data.type === 'private_message' && data.room_id) {
          link = `/discussions/${data.room_id}`;
        } else if (data.type === 'citizen_alert' && data.alert_id) {
          link = `/alert/${data.alert_id}`;
        } else if (data.type === 'global_alert' && data.cta_url && String(data.cta_url).trim()) {
          link = String(data.cta_url);
        }

        addNotification({ title, body, link });

        if (Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: payload.notification?.image || appIconUrl,
          });

          if (link) {
            notification.onclick = () => {
              window.focus();
              window.location.href = link;
            };
          }
        }
      });
    } catch (err) {
      console.warn('[NotificationWatcher] Impossible d’activer onMessage(Firebase).', err);
    }

    return () => {
      unsubscribe?.();
    };
  }, [notificationsEnabled, addNotification]);

  return null; // This component doesn't render anything
}
