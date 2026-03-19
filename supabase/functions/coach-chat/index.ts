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
- 🏛️ US Treasury Bond ETF: Riesgo 1/10, ~4.1% anual. Son bonos del gobierno de EE.UU., lo más seguro que existe.
- 📋 Retirement Insurance: Riesgo 2/10, ~3.8% anual. Seguro de jubilación alemán, muy estable.
- 📋 Retirement Insurance Plus: Riesgo 5/10, ~6.5% anual. Versión más agresiva del seguro de jubilación.
- 🌍 Global Equity ETF: Riesgo 7/10, ~11.2% anual. Inviertes en las empresas más grandes del mundo.
- 🏠 European Real Estate ETF: Riesgo 5/10, ~6.5% anual. Inviertes en propiedades europeas sin comprar una casa.
- 🚀 Venture Capital Fund: Riesgo 10/10, ~25% anual. Apuestas a startups. Puedes ganar mucho o perder todo.
- 💻 Direct Investment Tech Corp: Riesgo 9/10, ~18.7% anual. Inversión directa en una empresa tecnológica.
- 🌱 Green Energy Fund: Riesgo 4/10, ~5.2% anual. Inviertes en energía renovable.

## CONCEPTOS CLAVE QUE EXPLICAS SIMPLE
- **Riesgo**: Qué tan "movido" puede estar tu dinero. Más riesgo = más sube y baja.
- **Retorno anual**: Cuánto ganas al año por cada €100 invertidos.
- **ETF**: Una canasta de inversiones que puedes comprar como una sola cosa.
- **Diversificación**: No poner todos los huevos en el mismo nido.
- **Interés compuesto**: Tu dinero gana dinero, y ese dinero también gana dinero. ¡Magia! ✨

## FORMATO DE RESPUESTA
Usa estas tarjetas especiales cuando sea relevante (el frontend las renderiza como cards visuales):

### Para recomendar una estrategia:
\`\`\`strategy
título: [nombre de la estrategia]
riesgo: [bajo/medio/alto]
emoji: [emoji representativo]
descripción: [1-2 líneas explicando]
\`\`\`

### Para comparar opciones:
\`\`\`comparison
opción_a: [nombre] | [riesgo] | [retorno]
opción_b: [nombre] | [riesgo] | [retorno]
veredicto: [1 línea de recomendación]
\`\`\`

### Para dar un dato curioso o tip:
\`\`\`tip
emoji: [emoji]
título: [título corto]
contenido: [el tip en 1-2 líneas]
\`\`\`

## REGLAS
- Respuestas de máximo 3-4 oraciones + 1 tarjeta visual cuando aplique
- Si preguntan algo fuera de inversiones, redirige amablemente
- NUNCA des consejos financieros específicos ("compra X"). Siempre di "podrías considerar" o "una opción sería"
- Usa emojis con moderación (2-3 por mensaje máximo)
- Si el usuario tiene un portafolio cargado, analízalo y da feedback personalizado`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, portfolio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Inject portfolio context if available
    let contextMessage = "";
    if (portfolio && portfolio.length > 0) {
      contextMessage = `\n\n[CONTEXTO: El usuario tiene en su nido: ${portfolio.map((p: any) => `${p.emoji} ${p.name} (riesgo ${p.riskLevel}/10, retorno ${p.annualReturn}%)`).join(", ")}]`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${LOVABLE_API_KEY}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + contextMessage },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Agrega fondos en tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
