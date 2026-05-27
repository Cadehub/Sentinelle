import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../lib/preferences';
import { useNotifications } from '../lib/NotificationsContext';
import { useAuth } from '../lib/AuthContext';

export function NotificationWatcher() {
  const { user } = useAuth();
  const { preferences: { notificationsEnabled, subscribedCities, subscribedTypes, radarNeighborhoods } } = usePreferences();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!notificationsEnabled) return;

    // Request browser permission if not already granted
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on(
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
            const matchCity = subscribedCities.length > 0 ? subscribedCities.includes(newAlert.city) : false;
            const matchType = subscribedTypes.length > 0 ? subscribedTypes.includes(newAlert.type) : false;
            const matchRadar = radarNeighborhoods.length > 0 ? radarNeighborhoods.some(r => newAlert.neighborhood.toLowerCase().includes(r.toLowerCase())) : false;
            
            // Show notification if: (no filters set) OR (matches at least one filter)
            const shouldNotify = (
              (subscribedCities.length === 0 && subscribedTypes.length === 0 && radarNeighborhoods.length === 0) ||
              matchCity || matchType || matchRadar
            );

            if (newAlert.status === 'actif' && shouldNotify) {
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
                  icon: '/icon-alert.png',
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notificationsEnabled, subscribedCities, subscribedTypes, radarNeighborhoods, addNotification]);

  // Real-time listener for notifications table
  useEffect(() => {
    if (!user?.id || !notificationsEnabled) return;

    const notificationsChannel = supabase
      .channel(`notifications_${user.id}`)
      .on(
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
                icon: '/icon-notification.png',
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [user?.id, notificationsEnabled, addNotification]);

  return null; // This component doesn't render anything
}
