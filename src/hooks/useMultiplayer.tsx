import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Investment } from "@/game/types";
import { availableInvestments } from "@/game/types";

export interface MultiplayerRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: "waiting" | "picking" | "playing" | "finished";
  available_assets: Investment[];
  max_players: number;
  simulation_years: number;
  event_count: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  portfolio: Investment[];
  balance: number;
  is_ready: boolean;
  rank: number | null;
  final_score: number | null;
  decisions: any[];
}

export interface RoomEvent {
  id: string;
  room_id: string;
  event_index: number;
  title: string;
  description: string;
  emoji: string;
  impact_type: string;
  impact_data: any;
  triggered_at: string;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function pickRandomAssets(count: number): Investment[] {
  // Now we use all 8 categories as available assets
  return [...availableInvestments];
}

export function useMultiplayer() {
  const { user } = useAuth();
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [myPlayer, setMyPlayer] = useState<RoomPlayer | null>(null);
  const [loading, setLoading] = useState(false);

  // Subscribe to room changes
  useEffect(() => {
    if (!room) return;

    const roomChannel = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "multiplayer_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new) setRoom(payload.new as any);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
        () => { fetchPlayers(room.id); }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "room_events", filter: `room_id=eq.${room.id}` },
        () => { fetchEvents(room.id); }
      )
      .subscribe();

    return () => { supabase.removeChannel(roomChannel); };
  }, [room?.id]);

  // Update myPlayer when players change
  useEffect(() => {
    if (user && players.length > 0) {
      setMyPlayer(players.find(p => p.user_id === user.id) || null);
    }
  }, [players, user]);

  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at");
    if (data) setPlayers(data as any);
  }, []);

  const fetchEvents = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("room_events")
      .select("*")
      .eq("room_id", roomId)
      .order("event_index");
    if (data) setEvents(data as any);
  }, []);

  const createRoom = useCallback(async (displayName: string) => {
    if (!user) return null;
    setLoading(true);
    const code = generateRoomCode();
    const assets = pickRandomAssets(10);

    const { data: roomData, error: roomErr } = await supabase
      .from("multiplayer_rooms")
      .insert({
        code,
        host_user_id: user.id,
        status: "waiting",
        available_assets: assets as any,
      })
      .select()
      .single();

    if (roomErr || !roomData) { setLoading(false); return null; }

    // Host joins as player
    await supabase.from("room_players").insert({
      room_id: roomData.id,
      user_id: user.id,
      display_name: displayName,
    });

    setRoom(roomData as any);
    await fetchPlayers(roomData.id);
    setLoading(false);
    return roomData as any as MultiplayerRoom;
  }, [user, fetchPlayers]);

  const joinRoom = useCallback(async (code: string, displayName: string) => {
    if (!user) return null;
    setLoading(true);

    const { data: roomData, error } = await supabase
      .from("multiplayer_rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !roomData) { setLoading(false); return null; }
    if (roomData.status !== "waiting") { setLoading(false); return null; }

    // Check player count
    const { count } = await supabase
      .from("room_players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomData.id);

    if ((count || 0) >= roomData.max_players) { setLoading(false); return null; }

    // Join
    const { error: joinErr } = await supabase.from("room_players").insert({
      room_id: roomData.id,
      user_id: user.id,
      display_name: displayName,
    });

    if (joinErr) { setLoading(false); return null; }

    setRoom(roomData as any);
    await fetchPlayers(roomData.id);
    setLoading(false);
    return roomData as any as MultiplayerRoom;
  }, [user, fetchPlayers]);

  const startPicking = useCallback(async () => {
    if (!room || !user || room.host_user_id !== user.id) return;
    await supabase
      .from("multiplayer_rooms")
      .update({ status: "picking" })
      .eq("id", room.id);
  }, [room, user]);

  const updatePortfolio = useCallback(async (portfolio: Investment[]) => {
    if (!myPlayer) return;
    await supabase
      .from("room_players")
      .update({ portfolio: portfolio as any })
      .eq("id", myPlayer.id);
  }, [myPlayer]);

  const setReady = useCallback(async (ready: boolean) => {
    if (!myPlayer) return;
    await supabase
      .from("room_players")
      .update({ is_ready: ready })
      .eq("id", myPlayer.id);
  }, [myPlayer]);

  const startSimulation = useCallback(async () => {
    if (!room || !user || room.host_user_id !== user.id) return;
    await supabase
      .from("multiplayer_rooms")
      .update({ status: "playing", started_at: new Date().toISOString() })
      .eq("id", room.id);
  }, [room, user]);

  const saveDecision = useCallback(async (eventIndex: number, decision: string) => {
    if (!myPlayer) return;
    const newDecisions = [...(myPlayer.decisions || []), { eventIndex, decision, timestamp: Date.now() }];
    await supabase
      .from("room_players")
      .update({ decisions: newDecisions as any })
      .eq("id", myPlayer.id);
  }, [myPlayer]);

  const saveFinalScore = useCallback(async (score: number) => {
    if (!myPlayer) return;
    await supabase
      .from("room_players")
      .update({ final_score: score, balance: score })
      .eq("id", myPlayer.id);
  }, [myPlayer]);

  const finishGame = useCallback(async () => {
    if (!room || !user || room.host_user_id !== user.id) return;
    await supabase
      .from("multiplayer_rooms")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", room.id);
  }, [room, user]);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setPlayers([]);
    setEvents([]);
    setMyPlayer(null);
  }, []);

  return {
    room, players, events, myPlayer, loading,
    createRoom, joinRoom, startPicking, updatePortfolio,
    setReady, startSimulation, saveDecision, saveFinalScore,
    finishGame, leaveRoom,
  };
}
