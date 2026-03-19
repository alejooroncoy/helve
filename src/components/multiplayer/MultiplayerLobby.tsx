import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Users, QrCode, ArrowLeft, Copy, Check, UserPlus, Gamepad2, X } from "lucide-react";
import { toast } from "sonner";
import type { useMultiplayer } from "@/hooks/useMultiplayer";
import QRCodeDisplay from "./QRCodeDisplay";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const CELESTE = "#5BB8F5";

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const MultiplayerLobby = ({ mp }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [displayName, setDisplayName] = useState(user?.email?.split("@")[0] || "Player");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanActiveRef = useRef(false);

  // Auto-join when arriving via QR scan (native camera)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const upper = code.toUpperCase();
      setJoinCode(upper);
      setMode("join");
      const name = user?.email?.split("@")[0] || "Player";
      mp.joinRoom(upper, name).then((room) => {
        if (!room) toast.error(t("multiplayer.roomNotFound"));
      });
    }
  }, []);

  // Stop stream on unmount
  useEffect(() => {
    return () => stopScan();
  }, []);

  const startScan = async () => {
    if (!("BarcodeDetector" in window)) {
      toast.error(t("multiplayer.qrNotSupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      scanActiveRef.current = true;

      // Wait for video element to mount, then attach stream
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (!scanActiveRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const raw: string = barcodes[0].rawValue;
              stopScan();
              let code: string | null = null;
              try {
                const url = new URL(raw);
                code = url.searchParams.get("code");
              } catch {
                if (raw.length === 6) code = raw;
              }
              if (code) {
                const upper = code.toUpperCase();
                setJoinCode(upper);
                setMode("join");
                mp.joinRoom(upper, displayName.trim() || "Player").then((room) => {
                  if (!room) toast.error(t("multiplayer.roomNotFound"));
                });
              } else {
                toast.error(t("multiplayer.invalidQR"));
              }
              return;
            }
          } catch {}
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    } catch {
      toast.error(t("multiplayer.qrCameraError"));
    }
  };

  const stopScan = () => {
    scanActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      toast.error(t("multiplayer.nameRequired"));
      return;
    }
    const room = await mp.createRoom(displayName.trim());
    if (!room) toast.error(t("multiplayer.createError"));
  };

  const handleJoin = async () => {
    if (!displayName.trim()) {
      toast.error(t("multiplayer.nameRequired"));
      return;
    }
    if (joinCode.length < 6) {
      toast.error(t("multiplayer.codeRequired"));
      return;
    }
    const room = await mp.joinRoom(joinCode, displayName.trim());
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
        className="min-h-screen flex flex-col items-center px-5 pb-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex items-center justify-between w-full py-4 mb-2">
          <button onClick={() => { mp.leaveRoom(); }}>
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${CELESTE}15` }}>
            <Gamepad2 className="w-8 h-8" style={{ color: CELESTE }} />
          </div>
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
            <span className="text-3xl font-black tracking-[0.3em]" style={{ ...nunito, color: CELESTE }}>
              {mp.room.code}
            </span>
            <button onClick={copyCode} className="p-2 rounded-xl bg-muted">
              {copied ? <Check className="w-4 h-4" style={{ color: CELESTE }} /> : <Copy className="w-4 h-4 text-muted-foreground" />}
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
            <Users className="w-4 h-4" style={{ color: CELESTE }} />
            <span className="text-sm font-bold text-foreground" style={nunito}>
              {t("multiplayer.players")} ({mp.players.length}/{mp.room.max_players})
            </span>
          </div>
          <div className="space-y-2">
            {mp.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-2xl bg-muted/50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: CELESTE }}>
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
            className="w-full max-w-sm py-4 rounded-3xl text-base font-black shadow-lg"
            style={{
              ...nunito,
              backgroundColor: allReady ? CELESTE : "hsl(var(--muted))",
              color: allReady ? "white" : "hsl(var(--muted-foreground))",
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
    <>
      <motion.div
        className="min-h-screen flex flex-col px-5"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex items-center justify-between w-full py-4">
          <button onClick={() => navigate("/panel")}>
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${CELESTE}15` }}>
            <Gamepad2 className="w-9 h-9" style={{ color: CELESTE }} />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2" style={nunito}>Multiplayer</h1>
          <p className="text-sm text-muted-foreground mb-8 text-center" style={nunito}>
            {t("multiplayer.subtitle")}
          </p>

          {mode === "menu" && (
            <div className="w-full max-w-sm space-y-3">
              <motion.button
                className="w-full py-4 rounded-3xl font-black text-base shadow-lg flex items-center justify-center gap-2 text-white"
                style={{ ...nunito, backgroundColor: CELESTE }}
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
                <>
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

                  {/* Live QR scan button */}
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.button
                      type="button"
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${CELESTE}20` }}
                      onClick={startScan}
                      whileTap={{ scale: 0.93 }}
                    >
                      <QrCode className="w-7 h-7" style={{ color: CELESTE }} />
                    </motion.button>
                    <span className="text-[10px] text-muted-foreground" style={nunito}>
                      {t("multiplayer.scanQR")}
                    </span>
                  </div>
                </>
              )}

              <motion.button
                className="w-full py-4 rounded-3xl font-black text-base shadow-lg text-white"
                style={{ ...nunito, backgroundColor: CELESTE }}
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
        </div>
      </motion.div>

      {/* Live camera QR scanner modal */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Close button */}
            <button
              onClick={stopScan}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Viewfinder */}
            <div className="relative w-72 h-72">
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-2xl"
                autoPlay
                playsInline
                muted
              />
              {/* Corner guides */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: CELESTE }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: CELESTE }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: CELESTE }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: CELESTE }} />
              </div>
            </div>

            <p className="text-white/70 text-sm mt-5" style={nunito}>
              {t("multiplayer.scanQRHint")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MultiplayerLobby;
