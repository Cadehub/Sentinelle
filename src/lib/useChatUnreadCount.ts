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

    // 1. Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (error) {
          console.error('Error fetching unread count:', error);
          setUnreadCount(0);
        } else {
          setUnreadCount(data?.length || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // 2. Subscribe to real-time changes on chat_messages
    const channel = supabase
      .channel(`chat-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // Check if the new message is unread
          const newMessage = payload.new as any;
          if (newMessage.is_read === false) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // When a message is marked as read
          const updatedMessage = payload.new as any;
          const oldMessage = payload.old as any;
          
          if (oldMessage.is_read === false && updatedMessage.is_read === true) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // 3. Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { unreadCount, loading };
}
