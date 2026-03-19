
-- Multiplayer rooms
CREATE TABLE public.multiplayer_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  available_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_players INTEGER NOT NULL DEFAULT 4,
  simulation_years INTEGER NOT NULL DEFAULT 10,
  event_count INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.multiplayer_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rooms" ON public.multiplayer_rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.multiplayer_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update room" ON public.multiplayer_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);

-- Room players
CREATE TABLE public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.multiplayer_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  portfolio JSONB NOT NULL DEFAULT '[]'::jsonb,
  balance NUMERIC NOT NULL DEFAULT 1000,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  rank INTEGER,
  final_score NUMERIC,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read room players" ON public.room_players
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.room_players rp WHERE rp.room_id = room_players.room_id AND rp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.multiplayer_rooms r WHERE r.id = room_players.room_id AND r.host_user_id = auth.uid())
  );

CREATE POLICY "Users can join rooms" ON public.room_players
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own player" ON public.room_players
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Room events (generated during simulation)
CREATE TABLE public.room_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.multiplayer_rooms(id) ON DELETE CASCADE,
  event_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '⚡',
  impact_type TEXT NOT NULL DEFAULT 'negative',
  impact_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read room events" ON public.room_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.room_players rp WHERE rp.room_id = room_events.room_id AND rp.user_id = auth.uid())
  );

CREATE POLICY "Service role manages events" ON public.room_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_events;
