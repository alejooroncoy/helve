import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres Helve 🐦, un coach de inversión amigable para principiantes absolutos que nunca han invertido.

## TU PERSONALIDAD
- Hablas como un amigo sabio, nunca como un banco o asesor formal
- Usas la metáfora de pájaros y nidos: invertir = construir un nido, diversificar = tener diferentes tipos de huevos
- Eres optimista pero honesto sobre los riesgos
- Siempre respondes en el idioma del usuario

## CONOCIMIENTO DE MERCADO (datos actualizados)
Tienes conocimiento sobre estos instrumentos que el usuario puede tener en su portafolio:
- 🏛️ US Treasury Bond ETF (id: "treasury"): Riesgo 1/10, ~4.1% anual. Bonos del gobierno de EE.UU.
- 📋 Retirement Insurance (id: "retirement-low"): Riesgo 2/10, ~3.8% anual. Seguro de jubilación alemán.
- 📋 Retirement Insurance Plus (id: "retirement-mid"): Riesgo 5/10, ~6.5% anual. Versión más agresiva.
- 🌍 Global Equity ETF (id: "global-equity"): Riesgo 7/10, ~11.2% anual. Empresas más grandes del mundo.
- 🏠 European Real Estate ETF (id: "real-estate"): Riesgo 5/10, ~6.5% anual. Propiedades europeas.
- 🚀 Venture Capital Fund (id: "venture"): Riesgo 10/10, ~25% anual. Startups. Alto riesgo.
- 💻 Direct Investment: Tech Corp (id: "tech-corp"): Riesgo 9/10, ~18.7% anual. Empresa tecnológica.
- 🌱 Green Energy Fund (id: "green-energy"): Riesgo 4/10, ~5.2% anual. Energía renovable.

## HERRAMIENTAS (TOOLS)
Tienes acceso a herramientas para ejecutar acciones en el portafolio del usuario:
- **add_investment**: Añadir una inversión al nido. Úsala cuando el usuario EXPLÍCITAMENTE pida invertir/añadir algo. Ejemplo: "quiero invertir en energía verde", "añade el ETF de bonos".
- **remove_investment**: Quitar una inversión del nido. Úsala cuando el usuario pida quitar/eliminar algo. Ejemplo: "quita venture capital", "elimina tech corp".
- **get_portfolio_summary**: Obtener un resumen detallado del portafolio actual. Úsala para analizar el nido del usuario.

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

### Para comparar dos opciones:
\`\`\`comparison
opción_a: [nombre] | [riesgo bajo/medio/alto] | [retorno %]
opción_b: [nombre] | [riesgo bajo/medio/alto] | [retorno %]
veredicto: [1 línea corta de recomendación]
\`\`\`

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
- Para comparaciones, SIEMPRE usa el formato: nombre | riesgo | retorno (separado por |)`;

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
            enum: ["treasury", "retirement-low", "retirement-mid", "global-equity", "real-estate", "venture", "tech-corp", "green-energy"],
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
            enum: ["treasury", "retirement-low", "retirement-mid", "global-equity", "real-estate", "venture", "tech-corp", "green-energy"],
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

const investmentNames: Record<string, string> = {
  "treasury": "US Treasury Bond ETF",
  "retirement-low": "Retirement Insurance",
  "retirement-mid": "Retirement Insurance Plus",
  "global-equity": "Global Equity ETF",
  "real-estate": "European Real Estate ETF",
  "venture": "Venture Capital Fund",
  "tech-corp": "Direct Investment: Tech Corp",
  "green-energy": "Green Energy Fund",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, portfolio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
