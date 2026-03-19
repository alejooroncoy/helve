
-- Drop the recursive policy
DROP POLICY "Players can read room players" ON public.room_players;

-- Create a security definer function to check room membership
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_id = _room_id AND user_id = _user_id
  )
$$;

-- Create a security definer function to check if user is host
CREATE OR REPLACE FUNCTION public.is_room_host(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.multiplayer_rooms
    WHERE id = _room_id AND host_user_id = _user_id
  )
$$;

-- Recreate the policy using the security definer functions
CREATE POLICY "Players can read room players" ON public.room_players
  FOR SELECT TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid())
    OR public.is_room_host(room_id, auth.uid())
  );

-- Also fix room_events policy (same issue)
DROP POLICY "Players can read room events" ON public.room_events;

CREATE POLICY "Players can read room events" ON public.room_events
  FOR SELECT TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid())
  );
