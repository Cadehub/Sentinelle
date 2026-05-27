-- Create chat_rooms table for storing conversations between alert creators and discoverers
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id_owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_discoverer UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (user_id_owner != user_id_discoverer),
  CONSTRAINT unique_chat_per_alert UNIQUE (alert_id, user_id_owner, user_id_discoverer)
);

-- Create chat_messages table for storing individual messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'image')),
  is_safe BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chat_read_status table to track unread messages
CREATE TABLE IF NOT EXISTS public.chat_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  CONSTRAINT unique_read_status UNIQUE (room_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_alert_id ON public.chat_rooms(alert_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_owner ON public.chat_rooms(user_id_owner);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_discoverer ON public.chat_rooms(user_id_discoverer);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON public.chat_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_read_status_room_user ON public.chat_read_status(room_id, user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

-- Chat Rooms RLS Policies
-- Users can view chat rooms they are part of
CREATE POLICY "Users can view their chat rooms" ON public.chat_rooms
  FOR SELECT USING (
    auth.uid() = user_id_owner OR auth.uid() = user_id_discoverer
  );

-- Only the owner of the alert can create chat rooms
CREATE POLICY "Only alert owner can create chat rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alerts
      WHERE alerts.id = chat_rooms.alert_id
      AND alerts.created_by = auth.uid()
    )
  );

-- Chat Messages RLS Policies
-- Users can view messages in their chat rooms
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND (chat_rooms.user_id_owner = auth.uid() OR chat_rooms.user_id_discoverer = auth.uid())
    )
  );

-- Users can only insert messages in their chat rooms
CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND (chat_rooms.user_id_owner = auth.uid() OR chat_rooms.user_id_discoverer = auth.uid())
    )
    AND chat_messages.sender_id = auth.uid()
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (chat_messages.sender_id = auth.uid())
  WITH CHECK (chat_messages.sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON public.chat_messages
  FOR DELETE USING (chat_messages.sender_id = auth.uid());

-- Chat Read Status RLS Policies
-- Users can view their own read status
CREATE POLICY "Users can view their read status" ON public.chat_read_status
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Users can insert their read status
CREATE POLICY "Users can insert read status" ON public.chat_read_status
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update their own read status
CREATE POLICY "Users can update their read status" ON public.chat_read_status
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update chat_rooms.updated_at when a message is sent
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = NOW(), last_message_at = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_room_timestamp ON public.chat_messages;
CREATE TRIGGER trigger_update_chat_room_timestamp
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_timestamp();

-- Add missing columns to existing chat_messages table
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'image'));

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_safe BOOLEAN DEFAULT true;
