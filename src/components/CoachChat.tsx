import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Volume2, VolumeX, TrendingUp, TrendingDown, Lightbulb, ArrowRightLeft, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Investment } from "@/game/types";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-tts`;

/* ---- Streaming helper ---- */
async function streamChat({
  messages,
  portfolio,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  portfolio?: Investment[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, portfolio }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Error de conexión" }));
    onError(err.error || "Error del coach");
    return;
  }
  if (!resp.body) { onError("Sin respuesta"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

/* ---- Visual card parsers ---- */
interface StrategyCard {
  type: "strategy";
  título: string;
  riesgo: string;
  emoji: string;
  descripción: string;
}

interface ComparisonCard {
  type: "comparison";
  opción_a: string;
  opción_b: string;
  veredicto: string;
}

interface TipCard {
  type: "tip";
  emoji: string;
  título: string;
  contenido: string;
}

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
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        fields[key] = val;
      }
    }

    if (type === "strategy") {
      cards.push({
        type: "strategy",
        título: fields["título"] || fields["titulo"] || "Estrategia",
        riesgo: fields["riesgo"] || "medio",
        emoji: fields["emoji"] || "📊",
        descripción: fields["descripción"] || fields["descripcion"] || "",
      });
    } else if (type === "comparison") {
      cards.push({
        type: "comparison",
        opción_a: fields["opción_a"] || fields["opcion_a"] || "",
        opción_b: fields["opción_b"] || fields["opcion_b"] || "",
        veredicto: fields["veredicto"] || "",
      });
    } else if (type === "tip") {
      cards.push({
        type: "tip",
        emoji: fields["emoji"] || "💡",
        título: fields["título"] || fields["titulo"] || "Tip",
        contenido: fields["contenido"] || "",
      });
    }
    return "";
  }).trim();

  return { text, cards };
}

function getRiskColor(risk: string) {
  if (risk === "bajo") return "text-primary bg-primary/10 border-primary/20";
  if (risk === "alto") return "text-destructive bg-destructive/10 border-destructive/20";
  return "text-accent bg-accent/10 border-accent/20";
}

/* ---- Visual Card Components ---- */
function StrategyCardUI({ card }: { card: StrategyCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl p-3.5 shadow-sm border border-border mt-2"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-2xl">{card.emoji}</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{card.título}</p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskColor(card.riesgo)}`}>
            {card.riesgo === "bajo" ? "🛡️" : card.riesgo === "alto" ? "⚡" : "⚖️"} Riesgo {card.riesgo}
          </span>
        </div>
        <TrendingUp className="w-4 h-4 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{card.descripción}</p>
    </motion.div>
  );
}

function ComparisonCardUI({ card }: { card: ComparisonCard }) {
  const parseOption = (opt: string) => {
    const parts = opt.split("|").map((s) => s.trim());
    return { name: parts[0] || "", risk: parts[1] || "", ret: parts[2] || "" };
  };
  const a = parseOption(card.opción_a);
  const b = parseOption(card.opción_b);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl p-3.5 shadow-sm border border-border mt-2"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <ArrowRightLeft className="w-4 h-4 text-accent" />
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">Comparación</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="bg-primary/5 rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-foreground">{a.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Riesgo: {a.risk}</p>
          <p className="text-[10px] text-primary font-bold">{a.ret}</p>
        </div>
        <div className="bg-accent/5 rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-foreground">{b.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Riesgo: {b.risk}</p>
          <p className="text-[10px] text-accent font-bold">{b.ret}</p>
        </div>
      </div>
      <p className="text-[11px] text-foreground font-medium bg-muted rounded-lg px-2.5 py-1.5">
        💡 {card.veredicto}
      </p>
    </motion.div>
  );
}

function TipCardUI({ card }: { card: TipCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-accent/5 rounded-2xl p-3 border border-accent/15 mt-2 flex items-start gap-2.5"
    >
      <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-lg flex-shrink-0">
        {card.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{card.título}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{card.contenido}</p>
      </div>
      <Lightbulb className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
    </motion.div>
  );
}

function VisualCardRenderer({ card }: { card: VisualCard }) {
  if (card.type === "strategy") return <StrategyCardUI card={card} />;
  if (card.type === "comparison") return <ComparisonCardUI card={card} />;
  if (card.type === "tip") return <TipCardUI card={card} />;
  return null;
}

/* ---- TTS helper ---- */
async function playTTS(text: string): Promise<HTMLAudioElement | null> {
  // Strip markdown/cards for clean speech
  const clean = text
    .replace(/```(strategy|comparison|tip)\n[\s\S]*?```/g, "")
    .replace(/[*_#`]/g, "")
    .replace(/\n+/g, ". ")
    .trim();
  if (!clean) return null;

  const resp = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text: clean }),
  });

  if (!resp.ok) return null;

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  return audio;
}

/* ---- Microphone Button (Web Speech API) ---- */
function MicButton({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Prueba con Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
  }, [listening, onTranscript]);

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 ${
        listening
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10"
      }`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </motion.button>
  );
}

/* ---- Main Component ---- */
interface CoachChatProps {
  onClose: () => void;
  portfolio?: Investment[];
}

export default function CoachChat({ onClose, portfolio }: CoachChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingIdx(null);
  }, []);

  const handleTTS = useCallback(async (text: string, idx: number) => {
    if (playingIdx === idx) { stopAudio(); return; }
    stopAudio();
    setPlayingIdx(idx);
    try {
      const audio = await playTTS(text);
      if (audio) {
        audioRef.current = audio;
        audio.onended = () => setPlayingIdx(null);
      } else {
        setPlayingIdx(null);
      }
    } catch {
      setPlayingIdx(null);
    }
  }, [playingIdx, stopAudio]);

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    if (!overrideText) setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        portfolio,
        onDelta: upsert,
        onDone: () => setLoading(false),
        onError: (msg) => {
          setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
          setLoading(false);
        },
      });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error de conexión" }]);
      setLoading(false);
    }
  };

  const quickQuestions = portfolio && portfolio.length > 0
    ? ["¿Cómo va mi nido?", "¿Debería diversificar?", "¿Qué riesgo tengo?"]
    : ["¿Qué es el riesgo?", "¿Cómo empiezo a invertir?", "¿Qué es un ETF?"];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0">
          <img src="/face.png" alt="Coach" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Helve Coach 🐦</p>
          <p className="text-[10px] text-primary font-medium">
            {portfolio && portfolio.length > 0
              ? `Analizando ${portfolio.length} inversión${portfolio.length > 1 ? "es" : ""}`
              : "Tu guía de inversión"}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">🪺</p>
            <p className="text-sm text-foreground font-bold">¡Hola! Soy tu coach</p>
            <p className="text-xs text-muted-foreground mt-1">
              {portfolio && portfolio.length > 0
                ? "Puedo analizar tu nido y darte recomendaciones"
                : "Pregúntame lo que quieras sobre inversiones"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary/20 transition-colors"
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
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[90%] ${isAssistant ? "" : ""}`}>
                {text && (
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-muted text-foreground rounded-bl-md"
                        : "bg-primary text-primary-foreground rounded-br-md"
                    }`}
                  >
                    {isAssistant ? (
                      <div className="prose prose-sm max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                )}

                {/* Visual Cards */}
                {cards.map((card, ci) => (
                  <VisualCardRenderer key={ci} card={card} />
                ))}

                {/* TTS button for assistant messages */}
                {isAssistant && !loading && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleTTS(msg.content, i)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    {playingIdx === i ? (
                      <><VolumeX className="w-3 h-3" /> Detener</>
                    ) : (
                      <><Volume2 className="w-3 h-3" /> Escuchar</>
                    )}
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
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border bg-card">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <MicButton onTranscript={(t) => setInput((prev) => prev + t)} disabled={loading} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe o usa el micrófono..."
            className="flex-1 bg-muted rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            disabled={loading}
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || loading}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
