import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Volume2, VolumeX, TrendingUp, ArrowRightLeft, Lightbulb, Mic, MicOff, MessageCircle, Check, ArrowRight, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Investment } from "@/game/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

type Msg = { role: "user" | "assistant"; content: string };

interface CoachAction {
  type: "add" | "remove";
  investmentId: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-tts`;
const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

async function chatWithTools({
  messages, portfolio,
}: {
  messages: Msg[];
  portfolio?: Investment[];
}): Promise<{ text: string; actions: CoachAction[] }> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, portfolio, language: document.documentElement.lang || localStorage.getItem("i18nextLng") || "en" }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Connection error" }));
    throw new Error(err.error || "Coach error");
  }

  const data = await resp.json();
  return { text: data.text || "", actions: data.actions || [] };
}

interface StrategyCard { type: "strategy"; título: string; riesgo: string; emoji: string; descripción: string; }
interface ComparisonCard { type: "comparison"; opción_a: string; opción_b: string; veredicto: string; swap?: string; }
interface TipCard { type: "tip"; emoji: string; título: string; contenido: string; }
type VisualCard = StrategyCard | ComparisonCard | TipCard;

function parseCards(content: string): { text: string; cards: VisualCard[] } {
  const cards: VisualCard[] = [];
  const cardRegex = /```(strategy|comparison|tip)\n([\s\S]*?)```/g;
  const text = content.replace(cardRegex, (_, type, body) => {
    const lines = body.trim().split("\n");
    const fields: Record<string, string> = {};
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        fields[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
      }
    }
    if (type === "strategy") {
      cards.push({ type: "strategy", título: fields["título"] || fields["titulo"] || "Strategy", riesgo: fields["riesgo"] || "medio", emoji: fields["emoji"] || "", descripción: fields["descripción"] || fields["descripcion"] || "" });
    } else if (type === "comparison") {
      cards.push({ type: "comparison", opción_a: fields["opción_a"] || fields["opcion_a"] || "", opción_b: fields["opción_b"] || fields["opcion_b"] || "", veredicto: fields["veredicto"] || "", swap: fields["swap"] || undefined });
    } else if (type === "tip") {
      cards.push({ type: "tip", emoji: fields["emoji"] || "", título: fields["título"] || fields["titulo"] || "Tip", contenido: fields["contenido"] || "" });
    }
    return "";
  }).trim();
  return { text, cards };
}

function getRiskColor(risk: string) {
  if (risk === "bajo") return { color: CELESTE, background: `${CELESTE}18`, border: `${CELESTE}30` };
  if (risk === "alto") return { color: "hsl(var(--destructive))", background: "hsl(var(--destructive)/0.1)", border: "hsl(var(--destructive)/0.2)" };
  return { color: "hsl(var(--accent))", background: "hsl(var(--accent)/0.1)", border: "hsl(var(--accent)/0.2)" };
}

function StrategyCardUI({ card }: { card: StrategyCard }) {
  const rc = getRiskColor(card.riesgo);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl p-3.5 shadow-sm border border-border mt-2">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground" style={nunito}>{card.título}</p>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5" style={{ color: rc.color, backgroundColor: rc.background, borderColor: rc.border, ...nunito }}>
            Risk {card.riesgo}
          </span>
        </div>
        <TrendingUp className="w-4 h-4" style={{ color: CELESTE }} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed" style={nunito}>{card.descripción}</p>
    </motion.div>
  );
}

function ComparisonCardUI({ card, onAcceptSwap }: { card: ComparisonCard; onAcceptSwap?: (swap: string) => void }) {
  const [accepted, setAccepted] = useState(false);
  const parseOption = (opt: string) => {
    const parts = opt.split("|").map((s) => s.trim());
    return { name: parts[0] || "—", risk: parts[1] || "—", ret: parts[2] || "—" };
  };
  const a = parseOption(card.opción_a);
  const b = parseOption(card.opción_b);

  const handleAccept = () => {
    if (card.swap && onAcceptSwap) {
      setAccepted(true);
      onAcceptSwap(card.swap);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl p-3.5 shadow-sm border border-border mt-2">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRightLeft className="w-3.5 h-3.5 text-accent" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide" style={nunito}>vs</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 mb-2 items-center">
        <div className="rounded-xl p-2 text-center" style={{ backgroundColor: `${CELESTE}10` }}>
          <p className="text-[11px] font-bold text-foreground truncate" style={nunito}>{a.name}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5" style={nunito}>📊 {a.risk}</p>
          <p className="text-[9px] font-bold mt-0.5" style={{ color: CELESTE, ...nunito }}>💰 {a.ret}</p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />
        <div className="bg-accent/5 rounded-xl p-2 text-center">
          <p className="text-[11px] font-bold text-foreground truncate" style={nunito}>{b.name}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5" style={nunito}>📊 {b.risk}</p>
          <p className="text-[9px] text-accent font-bold mt-0.5" style={nunito}>💰 {b.ret}</p>
        </div>
      </div>
      <p className="text-[10px] text-foreground font-medium bg-muted rounded-lg px-2 py-1.5" style={nunito}>
        {card.veredicto}
      </p>
      {card.swap && (
        <motion.button
          onClick={handleAccept}
          disabled={accepted}
          className="w-full mt-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          style={{
            ...nunito,
            backgroundColor: accepted ? "hsl(var(--primary)/0.1)" : CELESTE,
            color: accepted ? "hsl(var(--primary))" : "white",
            cursor: accepted ? "default" : "pointer",
          }}
          whileTap={!accepted ? { scale: 0.96 } : {}}
          animate={accepted ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {accepted ? (
            <><Check className="w-3.5 h-3.5" /> Change applied!</>
          ) : (
            <><ArrowRightLeft className="w-3.5 h-3.5" /> Accept change</>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

function TipCardUI({ card }: { card: TipCard }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-accent/5 rounded-2xl p-3 border border-accent/15 mt-2 flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
        <Lightbulb className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground" style={nunito}>{card.título}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed" style={nunito}>{card.contenido}</p>
      </div>
    </motion.div>
  );
}

function VisualCardRenderer({ card, onAcceptSwap }: { card: VisualCard; onAcceptSwap?: (swap: string) => void }) {
  if (card.type === "strategy") return <StrategyCardUI card={card} />;
  if (card.type === "comparison") return <ComparisonCardUI card={card} onAcceptSwap={onAcceptSwap} />;
  if (card.type === "tip") return <TipCardUI card={card} />;
  return null;
}

async function playTTS(text: string): Promise<HTMLAudioElement | null> {
  const clean = text.replace(/```(strategy|comparison|tip)\n[\s\S]*?```/g, "").replace(/[*_#`]/g, "").replace(/\n+/g, ". ").trim();
  if (!clean) return null;
  const resp = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ text: clean }),
  });
  if (!resp.ok) return null;
  const blob = await resp.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  await audio.play();
  return audio;
}

function MicButton({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Your browser doesn't support voice recognition. Try Chrome."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    let fullTranscript = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) fullTranscript += result[0].transcript + " ";
        else interim += result[0].transcript;
      }
      onTranscript(fullTranscript + interim);
    };
    recognition.onerror = (e: any) => { if (e.error !== "aborted") setListening(false); };
    recognition.onend = () => { if (recognitionRef.current && listening) { try { recognitionRef.current.start(); } catch {} } };
    recognition.start();
    setListening(true);
  }, [listening, onTranscript]);

  return (
    <motion.button
      type="button" onClick={toggle} disabled={disabled} whileTap={{ scale: 0.9 }}
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
      style={listening ? { backgroundColor: "hsl(var(--destructive))", color: "white" } : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </motion.button>
  );
}

interface CoachChatProps {
  onClose: () => void;
  portfolio?: Investment[];
  onAddInvestment?: (investmentId: string) => void;
  onRemoveInvestment?: (investmentId: string) => void;
  initialQuestion?: string;
  onSwapAccepted?: (removeId: string, addId: string) => void;
}

export default function CoachChat({ onClose, portfolio, onAddInvestment, onRemoveInvestment, initialQuestion, onSwapAccepted }: CoachChatProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [initSent, setInitSent] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from DB
  useEffect(() => {
    if (!user) { setLoadingHistory(false); return; }
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
        }
        setLoadingHistory(false);
      });
  }, [user]);

  // Save message to DB
  const persistMessage = useCallback(async (msg: Msg) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({ user_id: user.id, role: msg.role, content: msg.content });
  }, [user]);

  const clearChat = useCallback(async () => {
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQuestion && !initSent && !loadingHistory) {
      setInitSent(true);
      setTimeout(() => send(initialQuestion), 300);
    }
  }, [initialQuestion, initSent, loadingHistory]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingIdx(null);
  }, []);

  const handleTTS = useCallback(async (text: string, idx: number) => {
    if (playingIdx === idx) { stopAudio(); return; }
    stopAudio();
    setPlayingIdx(idx);
    try {
      const audio = await playTTS(text);
      if (audio) { audioRef.current = audio; audio.onended = () => setPlayingIdx(null); }
      else setPlayingIdx(null);
    } catch { setPlayingIdx(null); }
  }, [playingIdx, stopAudio]);

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    if (!overrideText) setInput("");
    setMessages((prev) => [...prev, userMsg]);
    persistMessage(userMsg);
    setLoading(true);
    try {
      const { text: responseText, actions } = await chatWithTools({ messages: [...messages, userMsg], portfolio });
      for (const action of actions) {
        if (action.type === "add" && onAddInvestment) onAddInvestment(action.investmentId);
        else if (action.type === "remove" && onRemoveInvestment) onRemoveInvestment(action.investmentId);
      }
      const assistantMsg: Msg = { role: "assistant", content: responseText };
      setMessages((prev) => [...prev, assistantMsg]);
      persistMessage(assistantMsg);
    } catch (e) {
      const errMsg: Msg = { role: "assistant", content: e instanceof Error ? e.message : "Connection error" };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSwap = useCallback((swap: string) => {
    const parts = swap.split("->").map(s => s.trim());
    if (parts.length === 2) {
      if (onSwapAccepted) {
        onSwapAccepted(parts[0], parts[1]);
      } else {
        if (onRemoveInvestment) onRemoveInvestment(parts[0]);
        setTimeout(() => {
          if (onAddInvestment) onAddInvestment(parts[1]);
        }, 300);
      }
      // Close chat after swap to show portfolio changes
      setTimeout(() => onClose(), 800);
    }
  }, [onAddInvestment, onRemoveInvestment, onSwapAccepted, onClose]);

  const quickQuestions = portfolio && portfolio.length > 0
    ? ["How is my nest doing?", "Should I diversify?", "What's my risk level?"]
    : ["What is risk?", "How do I start investing?", "What is an ETF?"];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${CELESTE}40` }}>
          <img src="/perspectiva1.png" alt="Coach" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground" style={nunito}>Helve Coach</p>
          <p className="text-[10px] font-medium" style={{ color: CELESTE, ...nunito }}>
            {portfolio && portfolio.length > 0
              ? `Analyzing ${portfolio.length} investment${portfolio.length > 1 ? "s" : ""}`
              : "Your investment guide"}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors" title="Clear chat">
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        )}
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CELESTE}15` }}>
              <MessageCircle className="w-7 h-7" style={{ color: CELESTE }} />
            </div>
            <p className="text-sm font-bold text-foreground" style={nunito}>Hi! I'm your coach</p>
            <p className="text-xs text-muted-foreground mt-1" style={nunito}>
              {portfolio && portfolio.length > 0
                ? "I can analyze your nest and give you recommendations"
                : "Ask me anything about investing"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={{ backgroundColor: `${CELESTE}15`, color: CELESTE, ...nunito }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant";
          const { text, cards } = isAssistant ? parseCards(msg.content) : { text: msg.content, cards: [] };
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
              <div className="max-w-[90%]">
                {text && (
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed`}
                    style={isAssistant
                      ? { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))", borderBottomLeftRadius: 4, ...nunito }
                      : { backgroundColor: CELESTE, color: "white", borderBottomRightRadius: 4, ...nunito }
                    }
                  >
                    {isAssistant ? (
                      <div className="prose prose-sm max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                )}
                {cards.map((card, ci) => <VisualCardRenderer key={ci} card={card} onAcceptSwap={handleAcceptSwap} />)}
                {isAssistant && !loading && (
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => handleTTS(msg.content, i)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground transition-colors"
                    style={nunito}
                  >
                    {playingIdx === i ? <><VolumeX className="w-3 h-3" /> Stop</> : <><Volume2 className="w-3 h-3" /> Listen</>}
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}

        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <MicButton onTranscript={(t) => setInput(t)} disabled={loading} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write or use the microphone..."
            className="flex-1 bg-muted rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            style={{ ...nunito, boxShadow: `0 0 0 0px ${CELESTE}` }}
            onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${CELESTE}40`}
            onBlur={(e) => e.target.style.boxShadow = "none"}
            disabled={loading}
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || loading}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: CELESTE, color: "white" }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
