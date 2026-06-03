import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export function useNotificationsWithOneSignal() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [oneSignalReady, setOneSignalReady] = useState(false);

  // Initialize OneSignal (Client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const initOneSignal = async () => {
      try {
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
        
        if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID_HERE') {
          console.warn('OneSignal App ID not configured');
          return;
        }

        // Load OneSignal script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        
        script.onload = () => {
          window.OneSignal = window.OneSignal || [];
          window.OneSignal.push(() => {
            window.OneSignal.init({
              appId: appId,
              allowLocalhostAsSecureOrigin: true,
            });

            // Set external user ID if logged in
            if (user?.id) {
              window.OneSignal.setExternalUserId(user.id);
            }

            setOneSignalReady(true);
          });
        };

        script.onerror = () => {
          console.error('Failed to load OneSignal SDK');
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('OneSignal initialization error:', error);
      }
    };

    initOneSignal();
  }, [user?.id]);

  // Listen to real-time notifications from Supabase
  useEffect(() => {
    // Early exit if no user
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_read_status')
          .select('unread_count')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching unread count:', error);
          setUnreadCount(0);
        } else {
          const total = data?.reduce((sum: number, item: any) => sum + (item.unread_count || 0), 0) || 0;
          setUnreadCount(total);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // 2. Subscribe to real-time changes on chat_read_status
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_read_status',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // New read status created (new messages in a room)
          const newStatus = payload.new as any;
          if (newStatus.unread_count && newStatus.unread_count > 0) {
            setUnreadCount((prev) => prev + newStatus.unread_count);

            // Optional: Send to OneSignal for native notification
            if (window.OneSignal && oneSignalReady) {
              try {
                window.OneSignal.push(() => {
                  console.log('New unread messages from Supabase Realtime');
                });
              } catch (err) {
                console.error('OneSignal notification error:', err);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_read_status',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // When unread_count changes
          const oldStatus = payload.old as any;
          const newStatus = payload.new as any;
          const diff = (newStatus.unread_count || 0) - (oldStatus.unread_count || 0);
          
          if (diff !== 0) {
            setUnreadCount((prev) => Math.max(0, prev + diff));
          }
        }
      )
      .subscribe();

    // 3. Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, oneSignalReady]);

  return {
    unreadCount,
    loading,
    oneSignalReady,
  };
}
