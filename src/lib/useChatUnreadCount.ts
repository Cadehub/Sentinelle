import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export function useChatUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [countsByRoom, setCountsByRoom] = useState<Record<string, number>>({});

  useEffect(() => {
    // Early exit if no user
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial unread count from read status
    const fetchUnreadCount = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_read_status")
        .select("room_id, unread_count")
        .eq("user_id", user.id);

      if (error) {
        setCountsByRoom({});
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const nextMap: Record<string, number> = {};
      for (const row of data || []) {
        nextMap[row.room_id] = row.unread_count || 0;
      }

      setCountsByRoom(nextMap);
      setUnreadCount(Object.values(nextMap).reduce((sum, v) => sum + (v || 0), 0));
      setLoading(false);
    };

    let channel: any = null;

    fetchUnreadCount();

    channel = supabase.channel(`chat-unread-${user.id}`);
    if (!channel?.on) {
      setLoading(false);
      return;
    }

    const upsertStatus = (status: any) => {
      const roomId = status.room_id as string | undefined;
      if (!roomId) return;
      const unread = (status.unread_count as number | null | undefined) || 0;
      setCountsByRoom((prev) => {
        const next = { ...prev, [roomId]: unread };
        setUnreadCount(Object.values(next).reduce((sum, v) => sum + (v || 0), 0));
        return next;
      });
    };

    const deleteStatus = (status: any) => {
      const roomId = status.room_id as string | undefined;
      if (!roomId) return;
      setCountsByRoom((prev) => {
        const { [roomId]: _removed, ...rest } = prev;
        setUnreadCount(Object.values(rest).reduce((sum, v) => sum + (v || 0), 0));
        return rest;
      });
    };

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_read_status",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => upsertStatus(payload.new)
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_read_status",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => upsertStatus(payload.new)
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "chat_read_status",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => deleteStatus(payload.old)
    );

    channel.subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  return { unreadCount, loading };
}
