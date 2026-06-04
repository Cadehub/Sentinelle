import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export function useChatUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Early exit if no user
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial unread count from read status
    const fetchUnreadCount = async () => {
      setUnreadCount(0);
      setLoading(false);
      return false;
    };

    let channel: any = null;

    fetchUnreadCount().then((hasReadStatus) => {
      if (!hasReadStatus) return;

      // 2. Subscribe to real-time changes on chat_read_status
      channel = supabase.channel(`chat-unread-${user.id}`);
      if (!channel?.on) {
        console.warn("Le canal de notification n'est pas encore prêt.");
        return;
      }

      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_read_status',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newStatus = payload.new as any;
          if (newStatus.unread_count && newStatus.unread_count > 0) {
            setUnreadCount((prev) => prev + newStatus.unread_count);
          }
        }
      );

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_read_status',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const oldStatus = payload.old as any;
          const newStatus = payload.new as any;
          const diff = (newStatus.unread_count || 0) - (oldStatus.unread_count || 0);

          if (diff !== 0) {
            setUnreadCount((prev) => Math.max(0, prev + diff));
          }
        }
      );

      channel.subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  return { unreadCount, loading };
}
