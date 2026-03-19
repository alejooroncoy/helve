import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type InvestmentBucket = "SAFE" | "BALANCED" | "GROWTH";

type InvestmentMeta = {
  appId: string;
  dbId?: string;
  name: string;
  emoji: string;
  bucket: InvestmentBucket;
  defaultRisk: number;
  defaultReturn: number;
  note?: string;
};

type LiveInstrumentStats = {
  riskLevel: number;
  annualReturn: number;
};

const investmentCatalog: InvestmentMeta[] = [
  { appId: "ch-bond-aaa", dbId: "ch-bond-aaa", name: "Swiss Bond AAA-BBB", emoji: "🏦", bucket: "SAFE", defaultRisk: 2, defaultReturn: 1.8 },
  { appId: "global-bond", dbId: "global-bond-agg", name: "Bloomberg Global Bond Index", emoji: "🌐", bucket: "SAFE", defaultRisk: 2, defaultReturn: 1.3 },
  {
    appId: "ch-govt-10y",
    dbId: "ch-govt-10y",
    name: "Swiss Government Bond 10Y",
    emoji: "🏛️",
    bucket: "SAFE",
    defaultRisk: 10,
    defaultReturn: -10.6,
    note: 'OJO: esto representa el yield/rendimiento del bono a 10 años, no un bono defensivo tradicional. No lo confundas con Swiss Bond AAA-BBB.',
  },
  { appId: "smi-index", dbId: "smi-index", name: "SMI Index (Swiss Market)", emoji: "📊", bucket: "BALANCED", defaultRisk: 4, defaultReturn: 2.8 },
  { appId: "eurostoxx50", dbId: "eurostoxx50", name: "EuroStoxx 50", emoji: "🇪🇺", bucket: "BALANCED", defaultRisk: 5, defaultReturn: 2.4 },
  { appId: "gold-chf", dbId: "gold-chf", name: "Gold (CHF)", emoji: "🥇", bucket: "BALANCED", defaultRisk: 5, defaultReturn: 8.6 },
  { appId: "nestle", dbId: "nesn-ch", name: "Nestlé S.A.", emoji: "🍫", bucket: "BALANCED", defaultRisk: 4, defaultReturn: 3.6 },
  { appId: "novartis", dbId: "novn-ch", name: "Novartis AG", emoji: "💊", bucket: "BALANCED", defaultRisk: 5, defaultReturn: 3.9 },
  { appId: "green-energy", name: "Green Energy Fund", emoji: "🌱", bucket: "BALANCED", defaultRisk: 5, defaultReturn: 5.2 },
  { appId: "djia-index", dbId: "djia-index", name: "Dow Jones Industrial", emoji: "🗽", bucket: "GROWTH", defaultRisk: 5, defaultReturn: 7.8 },
  { appId: "dax-index", dbId: "dax-index", name: "DAX (Total Return)", emoji: "📈", bucket: "GROWTH", defaultRisk: 5, defaultReturn: 7.6 },
  { appId: "apple", dbId: "aapl-us", name: "Apple Inc.", emoji: "🍎", bucket: "GROWTH", defaultRisk: 7, defaultReturn: 26.2 },
  { appId: "microsoft", dbId: "msft-us", name: "Microsoft Corp.", emoji: "💻", bucket: "GROWTH", defaultRisk: 6, defaultReturn: 14.4 },
  { appId: "nvidia", dbId: "nvda-us", name: "NVIDIA Corp.", emoji: "🎮", bucket: "GROWTH", defaultRisk: 8, defaultReturn: 35.9 },
  { appId: "logitech", dbId: "logn-ch", name: "Logitech International", emoji: "🖱️", bucket: "GROWTH", defaultRisk: 7, defaultReturn: 5.2 },
  { appId: "ubs", dbId: "ubsg-ch", name: "UBS Group AG", emoji: "🏦", bucket: "GROWTH", defaultRisk: 7, defaultReturn: -3.2 },
  { appId: "amazon", dbId: "amzn-us", name: "Amazon.com Inc.", emoji: "📦", bucket: "GROWTH", defaultRisk: 7, defaultReturn: 26.1 },
];

const allIds = investmentCatalog.map(({ appId }) => appId);
const investmentNames = Object.fromEntries(
  investmentCatalog.map(({ appId, name }) => [appId, name]),
) as Record<string, string>;

async function fetchInstrumentStats(): Promise<Record<string, LiveInstrumentStats>> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const dbIds = investmentCatalog.flatMap(({ dbId }) => (dbId ? [dbId] : []));

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || dbIds.length === 0) {
    return {};
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_instrument_stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_instrument_ids: dbIds }),
    });

    if (!response.ok) {
      console.error("Failed to load live instrument stats for coach:", response.status, await response.text());
      return {};
    }

    const rows = await response.json();
    return Object.fromEntries(
      (rows || []).map((row: any) => [row.instrument_id, {
        riskLevel: Number(row.risk_level),
        annualReturn: Number(row.cagr),
      }]),
    ) as Record<string, LiveInstrumentStats>;
  } catch (error) {
    console.error("Failed to load live instrument stats for coach:", error);
    return {};
  }
}

function formatPercentage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function buildInstrumentSection(statsByDbId: Record<string, LiveInstrumentStats>): string {
  const buckets: InvestmentBucket[] = ["SAFE", "BALANCED", "GROWTH"];

  return buckets.map((bucket) => {
    const lines = investmentCatalog
      .filter((item) => item.bucket === bucket)
      .map((item) => {
        const live = item.dbId ? statsByDbId[item.dbId] : undefined;
        const riskLevel = live?.riskLevel ?? item.defaultRisk;
        const annualReturn = live?.annualReturn ?? item.defaultReturn;
        const note = item.note ? ` ${item.note}` : "";
        return `- ${item.emoji} ${item.name} (id: "${item.appId}"): Riesgo ${riskLevel}/10, ~${formatPercentage(annualReturn)}% anual.${note}`;
      });

    return `${bucket}:\n${lines.join("\n")}`;
  }).join("\n\n");
}

function buildSystemPrompt(statsByDbId: Record<string, LiveInstrumentStats>, language: string): string {
  const isEs = language === "es";

  const personality = isEs
    ? `## TU PERSONALIDAD
- Hablas como un amigo sabio, nunca como un banco o asesor formal
- Usas la metáfora de pájaros y nidos: invertir = construir un nido, diversificar = tener diferentes tipos de huevos
- Eres optimista pero honesto sobre los riesgos
- Siempre respondes en español`
    : `## YOUR PERSONALITY
- You speak like a wise friend, never like a bank or formal advisor
- You use the bird/nest metaphor: investing = building a nest, diversifying = having different types of eggs
- You are optimistic but honest about risks
- Always respond in English`;

  const consistency = isEs
    ? `## REGLA CRÍTICA DE CONSISTENCIA
- "Swiss Bond AAA-BBB" (id: "ch-bond-aaa") y "Swiss Government Bond 10Y" (id: "ch-govt-10y") NO son lo mismo.
- Nunca describas "ch-govt-10y" como un bono defensivo tradicional; trátalo como una serie de yield/rendimiento.
- Si el usuario pregunta por algo que ya está en su nido, prioriza SIEMPRE el contexto del portafolio actual antes que la lista general.`
    : `## CRITICAL CONSISTENCY RULE
- "Swiss Bond AAA-BBB" (id: "ch-bond-aaa") and "Swiss Government Bond 10Y" (id: "ch-govt-10y") are NOT the same.
- Never describe "ch-govt-10y" as a traditional defensive bond; treat it as a yield/return series.
- If the user asks about something already in their nest, ALWAYS prioritize the current portfolio context over the general list.`;

  const toolsSection = isEs
    ? `## HERRAMIENTAS (TOOLS)
- **add_investment**: Añadir una inversión al nido. Úsala cuando el usuario EXPLÍCITAMENTE pida invertir/añadir algo.
- **remove_investment**: Quitar una inversión del nido. Úsala cuando el usuario pida quitar/eliminar algo.
- **get_portfolio_summary**: Obtener un resumen detallado del portafolio actual.

REGLAS PARA USAR TOOLS:
1. SOLO usa tools cuando el usuario muestre INTENCIÓN CLARA de acción ("quiero invertir", "añade", "quita", "elimina", "invierte en").
2. Si el usuario solo pregunta "¿qué me recomiendas?" NO uses tools, solo da recomendaciones con tarjetas.
3. Si el usuario dice "¿debería invertir en X?" es una pregunta, NO una acción. Responde con recomendación.
4. Siempre confirma la acción realizada al usuario con entusiasmo.
5. Si el nido está lleno (4 inversiones), informa al usuario y sugiere qué quitar.`
    : `## TOOLS
- **add_investment**: Add an investment to the nest. Use when the user EXPLICITLY asks to invest/add something.
- **remove_investment**: Remove an investment from the nest. Use when the user asks to remove/delete something.
- **get_portfolio_summary**: Get a detailed summary of the current portfolio.

RULES FOR USING TOOLS:
1. ONLY use tools when the user shows CLEAR INTENT to act ("I want to invest", "add", "remove", "invest in").
2. If the user only asks "what do you recommend?" DO NOT use tools, just give recommendations with cards.
3. If the user says "should I invest in X?" it's a question, NOT an action. Respond with a recommendation.
4. Always confirm the completed action to the user enthusiastically.
5. If the nest is full (4 investments), inform the user and suggest what to remove.`;

  const formatSection = isEs
    ? `## FORMATO DE RESPUESTA
Puedes usar UNA tarjeta visual por respuesta. Escoge la más relevante:

### Para recomendar una estrategia:
\`\`\`strategy
título: [nombre corto]
riesgo: [bajo/medio/alto]
emoji: [emoji]
descripción: [1 línea corta]
\`\`\`

### Para comparar dos opciones (cuando sugieras un cambio/swap):
\`\`\`comparison
opción_a: [nombre] | Riesgo [X/10] | ~[X]% anual
opción_b: [nombre] | Riesgo [X/10] | ~[X]% anual
veredicto: [1 línea corta de recomendación]
swap: [id_quitar] -> [id_poner]
\`\`\`

IMPORTANTE para comparaciones:
- Usa EXACTAMENTE el formato "Riesgo X/10" para riesgo y "~X% anual" para retorno
- Usa el campo "swap" SOLO cuando sugieras reemplazar una inversión del nido por otra. Formato: id_actual -> id_nueva
- Los IDs deben ser EXACTAMENTE los de la lista de instrumentos arriba
- Si solo comparas sin sugerir cambio, omite el campo swap

### Para dar un tip:
\`\`\`tip
emoji: [emoji]
título: [título corto]
contenido: [1 línea corta]
\`\`\`

## REGLAS CRÍTICAS DE FORMATO
- MÁXIMO 1-2 oraciones de texto libre + 1 sola tarjeta. Nada más.
- NUNCA uses más de 1 tarjeta por respuesta. Escoge la mejor.
- Sé ultra-conciso. Si puedes decirlo en 1 oración, no uses 2.
- Si preguntan algo fuera de inversiones, redirige amablemente
- NUNCA des consejos financieros específicos ("compra X"). Siempre di "podrías considerar"
- Usa emojis con moderación (1-2 por mensaje máximo)
- Para comparaciones, SIEMPRE separa nombre | riesgo | retorno con |`
    : `## RESPONSE FORMAT
You can use ONE visual card per response. Pick the most relevant:

### To recommend a strategy:
\`\`\`strategy
título: [short name]
riesgo: [low/medium/high]
emoji: [emoji]
descripción: [1 short line]
\`\`\`

### To compare two options (when suggesting a swap):
\`\`\`comparison
opción_a: [name] | Risk [X/10] | ~[X]% annual
opción_b: [name] | Risk [X/10] | ~[X]% annual
veredicto: [1 short recommendation line]
swap: [id_remove] -> [id_add]
\`\`\`

IMPORTANT for comparisons:
- Use EXACTLY the format "Risk X/10" for risk and "~X% annual" for return
- Use the "swap" field ONLY when suggesting to replace a nest investment with another. Format: current_id -> new_id
- IDs must be EXACTLY from the instruments list above
- If only comparing without suggesting a change, omit the swap field

### To give a tip:
\`\`\`tip
emoji: [emoji]
título: [short title]
contenido: [1 short line]
\`\`\`

## CRITICAL FORMAT RULES
- MAXIMUM 1-2 sentences of free text + 1 single card. Nothing more.
- NEVER use more than 1 card per response. Pick the best one.
- Be ultra-concise. If you can say it in 1 sentence, don't use 2.
- If they ask about something outside investments, redirect kindly
- NEVER give specific financial advice ("buy X"). Always say "you might consider"
- Use emojis sparingly (1-2 per message max)
- For comparisons, ALWAYS separate name | risk | return with |`;

  const intro = isEs
    ? `Eres Helve, un coach de inversión amigable para principiantes absolutos que nunca han invertido.`
    : `You are Helve, a friendly investment coach for absolute beginners who have never invested before.`;

  return `${intro}

${personality}

## ${isEs ? "CONOCIMIENTO DE MERCADO" : "MARKET KNOWLEDGE"}
${isEs ? "Instrumentos disponibles (usa EXACTAMENTE estos IDs):" : "Available instruments (use EXACTLY these IDs):"}

${buildInstrumentSection(statsByDbId)}

${consistency}

${toolsSection}

${formatSection}`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "add_investment",
      description: "Añade una inversión al nido/portafolio del usuario. Solo usar cuando el usuario EXPLÍCITAMENTE pida invertir o añadir algo.",
      parameters: {
        type: "object",
        properties: {
          investment_id: {
            type: "string",
            enum: allIds,
            description: "ID de la inversión a añadir",
          },
        },
        required: ["investment_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_investment",
      description: "Quita una inversión del nido/portafolio del usuario. Solo usar cuando el usuario EXPLÍCITAMENTE pida quitar o eliminar algo.",
      parameters: {
        type: "object",
        properties: {
          investment_id: {
            type: "string",
            enum: allIds,
            description: "ID de la inversión a quitar",
          },
        },
        required: ["investment_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio_summary",
      description: "Obtiene un resumen del portafolio actual del usuario con métricas de riesgo y retorno.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, portfolio, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = (language || "en").slice(0, 2).toLowerCase();
    const liveInstrumentStats = await fetchInstrumentStats();
    const systemPrompt = buildSystemPrompt(liveInstrumentStats, lang);

    // Build portfolio context
    let contextMessage = "";
    if (portfolio && portfolio.length > 0) {
      contextMessage = `\n\n[CONTEXTO: El usuario tiene en su nido: ${portfolio.map((p: any) => `${p.emoji} ${p.name} (id: "${p.id}", riesgo ${p.riskLevel}/10, retorno ${p.annualReturn}%)`).join(", ")}. Tiene ${4 - portfolio.length} espacios libres.]`;
    } else {
      contextMessage = `\n\n[CONTEXTO: El nido del usuario está vacío. Tiene 4 espacios disponibles.]`;
    }

    const currentPortfolioIds = (portfolio || []).map((p: any) => p.id);

    // First call: non-streaming with tools
    const firstResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + contextMessage },
            ...messages,
          ],
          tools,
          stream: false,
        }),
      }
    );

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (firstResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await firstResponse.text();
      console.error("AI gateway error:", firstResponse.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstData = await firstResponse.json();
    const choice = firstData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // No tool calls → return text directly as JSON
    if (!toolCalls || toolCalls.length === 0) {
      const text = choice?.message?.content || "";
      return new Response(
        JSON.stringify({ text, actions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process tool calls
    const actions: any[] = [];
    const toolResults: any[] = [];

    for (const tc of toolCalls) {
      const fn = tc.function;
      const args = JSON.parse(fn.arguments || "{}");
      let result = "";

      if (fn.name === "add_investment") {
        const id = args.investment_id;
        const name = investmentNames[id] || id;
        if (currentPortfolioIds.includes(id)) {
          result = `${name} ya está en el nido del usuario.`;
        } else if (currentPortfolioIds.length >= 4) {
          result = `El nido está lleno (4/4). El usuario debe quitar una inversión primero.`;
        } else {
          actions.push({ type: "add", investmentId: id });
          currentPortfolioIds.push(id);
          result = `${name} ha sido añadido al nido exitosamente. Ahora tiene ${currentPortfolioIds.length}/4 inversiones.`;
        }
      } else if (fn.name === "remove_investment") {
        const id = args.investment_id;
        const name = investmentNames[id] || id;
        const idx = currentPortfolioIds.indexOf(id);
        if (idx === -1) {
          result = `${name} no está en el nido del usuario.`;
        } else {
          actions.push({ type: "remove", investmentId: id });
          currentPortfolioIds.splice(idx, 1);
          result = `${name} ha sido quitado del nido. Ahora tiene ${currentPortfolioIds.length}/4 inversiones.`;
        }
      } else if (fn.name === "get_portfolio_summary") {
        if (currentPortfolioIds.length === 0) {
          result = "El nido está vacío. No hay inversiones.";
        } else {
          result = `Portafolio actual: ${currentPortfolioIds.map((id: string) => investmentNames[id] || id).join(", ")}. Total: ${currentPortfolioIds.length}/4.`;
        }
      }

      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }

    // Second call: get final response after tool execution
    const secondResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + contextMessage },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: false,
        }),
      }
    );

    if (!secondResponse.ok) {
      const t = await secondResponse.text();
      console.error("AI gateway second call error:", secondResponse.status, t);
      return new Response(
        JSON.stringify({ error: "Error procesando la acción" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secondData = await secondResponse.json();
    const finalText = secondData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ text: finalText, actions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
