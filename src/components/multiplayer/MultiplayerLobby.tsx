import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Users, QrCode, ArrowLeft, Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { useMultiplayer } from "@/hooks/useMultiplayer";
import QRCodeDisplay from "./QRCodeDisplay";

const nunito = { fontFamily: "'Nunito', sans-serif" };

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const MultiplayerLobby = ({ mp }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [displayName, setDisplayName] = useState(user?.email?.split("@")[0] || "Player");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const room = await mp.createRoom(displayName);
    if (!room) toast.error("Failed to create room");
  };

  const handleJoin = async () => {
    if (joinCode.length < 6) return;
    const room = await mp.joinRoom(joinCode, displayName);
    if (!room) toast.error(t("multiplayer.roomNotFound"));
  };

  const copyCode = () => {
    if (mp.room?.code) {
      navigator.clipboard.writeText(mp.room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allReady = mp.players.length >= 2;
  const isHost = user?.id === mp.room?.host_user_id;
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/multiplayer?code=${mp.room?.code}`
    : "";

  // Waiting room (after creating/joining)
  if (mp.room) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center px-5 py-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      >
        <button onClick={() => { mp.leaveRoom(); }} className="self-start mb-4">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎮</div>
          <h1 className="text-2xl font-black text-foreground" style={nunito}>
            {t("multiplayer.waitingRoom")}
          </h1>
        </div>

        {/* Room Code */}
        <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-lg mb-5">
          <p className="text-xs text-muted-foreground text-center mb-2" style={nunito}>
            {t("multiplayer.roomCode")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-black tracking-[0.3em] text-primary" style={nunito}>
              {mp.room.code}
            </span>
            <button onClick={copyCode} className="p-2 rounded-xl bg-muted">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-card rounded-3xl p-5 w-full max-w-sm shadow-lg mb-5 flex flex-col items-center">
          <p className="text-xs text-muted-foreground mb-3" style={nunito}>
            {t("multiplayer.scanQR")}
          </p>
          <QRCodeDisplay value={joinUrl} size={160} />
        </div>

        {/* Players */}
        <div className="bg-card rounded-3xl p-5 w-full max-w-sm shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground" style={nunito}>
              {t("multiplayer.players")} ({mp.players.length}/{mp.room.max_players})
            </span>
          </div>
          <div className="space-y-2">
            {mp.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-2xl bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {p.display_name[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-sm font-bold text-foreground flex-1" style={nunito}>
                  {p.display_name}
                </span>
                {p.user_id === mp.room!.host_user_id && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">HOST</span>
                )}
              </div>
            ))}
            {Array.from({ length: mp.room.max_players - mp.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 py-2 px-3 rounded-2xl border-2 border-dashed border-muted">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground" style={nunito}>
                  {t("multiplayer.waitingPlayer")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Start button (host only) */}
        {isHost && (
          <motion.button
            className="w-full max-w-sm py-4 rounded-3xl text-base font-black shadow-lg text-primary-foreground"
            style={{
              ...nunito,
              background: allReady ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: allReady ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              cursor: allReady ? "pointer" : "not-allowed",
            }}
            onClick={allReady ? mp.startPicking : undefined}
            whileHover={allReady ? { scale: 1.02 } : {}}
            whileTap={allReady ? { scale: 0.97 } : {}}
          >
            {allReady ? t("multiplayer.startGame") : t("multiplayer.needPlayers")}
          </motion.button>
        )}
        {!isHost && (
          <p className="text-sm text-muted-foreground text-center" style={nunito}>
            {t("multiplayer.waitingHost")}
          </p>
        )}
      </motion.div>
    );
  }

  // Menu / Create / Join
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    >
      <button onClick={() => navigate("/panel")} className="absolute top-4 left-4">
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="text-5xl mb-4">🎮</div>
      <h1 className="text-3xl font-black text-foreground mb-2" style={nunito}>Multiplayer</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center" style={nunito}>
        {t("multiplayer.subtitle")}
      </p>

      {mode === "menu" && (
        <div className="w-full max-w-sm space-y-3">
          <motion.button
            className="w-full py-4 rounded-3xl bg-primary text-primary-foreground font-black text-base shadow-lg flex items-center justify-center gap-2"
            style={nunito}
            onClick={() => setMode("create")}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          >
            <QrCode className="w-5 h-5" />
            {t("multiplayer.createRoom")}
          </motion.button>
          <motion.button
            className="w-full py-4 rounded-3xl bg-card text-foreground font-black text-base shadow-md border border-border flex items-center justify-center gap-2"
            style={nunito}
            onClick={() => setMode("join")}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          >
            <Users className="w-5 h-5" />
            {t("multiplayer.joinRoom")}
          </motion.button>
        </div>
      )}

      {(mode === "create" || mode === "join") && (
        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block" style={nunito}>
              {t("multiplayer.yourName")}
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-foreground text-sm"
              style={nunito}
              maxLength={20}
            />
          </div>

          {mode === "join" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block" style={nunito}>
                {t("multiplayer.enterCode")}
              </label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-foreground text-center text-xl font-black tracking-[0.3em]"
                style={nunito}
                maxLength={6}
                placeholder="ABC123"
              />
            </div>
          )}

          <motion.button
            className="w-full py-4 rounded-3xl bg-primary text-primary-foreground font-black text-base shadow-lg"
            style={nunito}
            onClick={mode === "create" ? handleCreate : handleJoin}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={mp.loading || !displayName.trim() || (mode === "join" && joinCode.length < 6)}
          >
            {mp.loading ? t("common.loading") : mode === "create" ? t("multiplayer.createRoom") : t("multiplayer.joinRoom")}
          </motion.button>
          <button
            onClick={() => setMode("menu")}
            className="w-full text-center text-sm text-muted-foreground py-2"
            style={nunito}
          >
            ← {t("multiplayer.back")}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MultiplayerLobby;
