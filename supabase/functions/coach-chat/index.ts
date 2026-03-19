import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const allIds = [
  "ch-bond-aaa","global-bond","ch-govt-10y",
  "smi-index","eurostoxx50","gold-chf","nestle","novartis","green-energy",
  "djia-index","dax-index","apple","microsoft","nvidia","logitech","ubs","amazon",
];

const investmentNames: Record<string, string> = {
  "ch-bond-aaa": "Swiss Bond AAA-BBB",
  "global-bond": "Bloomberg Global Bond Index",
  "ch-govt-10y": "Swiss Government Bond 10Y",
  "smi-index": "SMI Index (Swiss Market)",
  "eurostoxx50": "EuroStoxx 50",
  "gold-chf": "Gold (CHF)",
  "nestle": "Nestlé S.A.",
  "novartis": "Novartis AG",
  "green-energy": "Green Energy Fund",
  "djia-index": "Dow Jones Industrial",
  "dax-index": "DAX (Total Return)",
  "apple": "Apple Inc.",
  "microsoft": "Microsoft Corp.",
  "nvidia": "NVIDIA Corp.",
  "logitech": "Logitech International",
  "ubs": "UBS Group AG",
  "amazon": "Amazon.com Inc.",
};

const systemPrompt = `Eres Helve 🐦, un coach de inversión amigable para principiantes absolutos que nunca han invertido.

## TU PERSONALIDAD
- Hablas como un amigo sabio, nunca como un banco o asesor formal
- Usas la metáfora de pájaros y nidos: invertir = construir un nido, diversificar = tener diferentes tipos de huevos
- Eres optimista pero honesto sobre los riesgos
- Siempre respondes en el idioma del usuario

## CONOCIMIENTO DE MERCADO
Instrumentos disponibles (usa EXACTAMENTE estos IDs):

SAFE:
- 🏦 Swiss Bond AAA-BBB (id: "ch-bond-aaa"): Riesgo 1/10, ~2.8% anual
- 🌐 Bloomberg Global Bond Index (id: "global-bond"): Riesgo 2/10, ~3.1% anual
- 🏛️ Swiss Government Bond 10Y (id: "ch-govt-10y"): Riesgo 1/10, ~1.5% anual

BALANCED:
- 📊 SMI Index - Swiss Market (id: "smi-index"): Riesgo 5/10, ~6.2% anual
- 🇪🇺 EuroStoxx 50 (id: "eurostoxx50"): Riesgo 5/10, ~5.8% anual
- 🥇 Gold CHF (id: "gold-chf"): Riesgo 4/10, ~7.1% anual
- 🍫 Nestlé S.A. (id: "nestle"): Riesgo 4/10, ~5.5% anual
- 💊 Novartis AG (id: "novartis"): Riesgo 5/10, ~6.8% anual
- 🌱 Green Energy Fund (id: "green-energy"): Riesgo 5/10, ~5.2% anual

GROWTH:
- 🗽 Dow Jones Industrial (id: "djia-index"): Riesgo 6/10, ~9.4% anual
- 📈 DAX Total Return (id: "dax-index"): Riesgo 6/10, ~8.7% anual
- 🍎 Apple Inc. (id: "apple"): Riesgo 7/10, ~28.5% anual
- 💻 Microsoft Corp. (id: "microsoft"): Riesgo 7/10, ~24.2% anual
- 🎮 NVIDIA Corp. (id: "nvidia"): Riesgo 9/10, ~45% anual
- 🖱️ Logitech International (id: "logitech"): Riesgo 7/10, ~14.8% anual
- 🏦 UBS Group AG (id: "ubs"): Riesgo 7/10, ~8.2% anual
- 📦 Amazon.com Inc. (id: "amazon"): Riesgo 8/10, ~31% anual

## HERRAMIENTAS (TOOLS)
- **add_investment**: Añadir una inversión al nido. Úsala cuando el usuario EXPLÍCITAMENTE pida invertir/añadir algo.
- **remove_investment**: Quitar una inversión del nido. Úsala cuando el usuario pida quitar/eliminar algo.
- **get_portfolio_summary**: Obtener un resumen detallado del portafolio actual.

REGLAS PARA USAR TOOLS:
1. SOLO usa tools cuando el usuario muestre INTENCIÓN CLARA de acción ("quiero invertir", "añade", "quita", "elimina", "invierte en").
2. Si el usuario solo pregunta "¿qué me recomiendas?" NO uses tools, solo da recomendaciones con tarjetas.
3. Si el usuario dice "¿debería invertir en X?" es una pregunta, NO una acción. Responde con recomendación.
4. Siempre confirma la acción realizada al usuario con entusiasmo.
5. Si el nido está lleno (4 inversiones), informa al usuario y sugiere qué quitar.

## FORMATO DE RESPUESTA
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
- Para comparaciones, SIEMPRE separa nombre | riesgo | retorno con |`;

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
    const { messages, portfolio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const liveInstrumentStats = await fetchInstrumentStats();
    const systemPrompt = buildSystemPrompt(liveInstrumentStats);

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
