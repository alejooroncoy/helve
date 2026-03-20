import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildFeedbackPrompt(
  language: string,
  eventTitle: string,
  eventDesc: string,
  decision: string,
  holdImpact: number,
  sellImpact: number,
  balanceBefore: number,
  balanceAfter: number
): string {
  const isEs = language === "es";
  const chfChange = balanceAfter - balanceBefore;
  const wasGood = chfChange > 0;

  const buyImpact = 1 + (holdImpact - 1) * 1.5;
  const bestImpact = Math.max(holdImpact, sellImpact, buyImpact);
  const recommended = bestImpact === buyImpact ? "Buy"
    : bestImpact === holdImpact ? "Hold" : "Sell";
  const wasRecommended = decision === "hold" && recommended === "Hold"
    || decision === "buy" && recommended === "Buy"
    || decision === "sell" && recommended === "Sell";

  if (isEs) {
    return `Analiza esta decisión de inversión y dame feedback educativo CONCISO (máximo 3-4 líneas).

EVENTO: "${eventTitle}"
Descripción: ${eventDesc}

DECISIÓN DEL USUARIO: ${decision.toUpperCase()}
- Hold impact: ${holdImpact.toFixed(2)}
- Sell impact: ${sellImpact.toFixed(2)}
- Recomendado era: ${recommended}
- ¿Fue la decisión correcta?: ${wasRecommended ? "SÍ" : "NO"}

RESULTADO FINANCIERO:
- Balance antes: CHF ${Math.round(balanceBefore)}
- Balance después: CHF ${Math.round(balanceAfter)}
- Cambio: CHF ${chfChange >= 0 ? "+" : ""}${Math.round(chfChange)}

Genera feedback que:
1. Sea honesto sobre si fue buena o mala decisión
2. Explique brevemente POR QUÉ (qué pasó en el mercado, por qué esa decisión ayudó/dañó)
3. Enseñe una lección de inversión relevante
4. Sea alentador pero realista

Responde SOLO con el feedback, sin explicaciones extra. Usa líneas cortas y claras.`;
  } else {
    return `Analyze this investment decision and give me concise educational feedback (max 3-4 lines).

EVENT: "${eventTitle}"
Description: ${eventDesc}

USER DECISION: ${decision.toUpperCase()}
- Hold impact: ${holdImpact.toFixed(2)}
- Sell impact: ${sellImpact.toFixed(2)}
- Best was: ${recommended}
- Was the decision correct?: ${wasRecommended ? "YES" : "NO"}

FINANCIAL RESULT:
- Balance before: CHF ${Math.round(balanceBefore)}
- Balance after: CHF ${Math.round(balanceAfter)}
- Change: CHF ${chfChange >= 0 ? "+" : ""}${Math.round(chfChange)}

Generate feedback that:
1. Is honest about whether it was a good or bad decision
2. Briefly explains WHY (what happened in the market, why that decision helped/hurt)
3. Teaches a relevant investing lesson
4. Is encouraging but realistic

Respond ONLY with the feedback, no extra explanations. Use short, clear lines.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      language,
      eventTitle,
      eventDesc,
      decision,
      holdImpact,
      sellImpact,
      balanceBefore,
      balanceAfter,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = (language || "en").slice(0, 2).toLowerCase();
    const prompt = buildFeedbackPrompt(
      lang,
      eventTitle,
      eventDesc,
      decision,
      holdImpact,
      sellImpact,
      balanceBefore,
      balanceAfter
    );

    const response = await fetch(
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
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({
          error: lang === "es"
            ? "Error generando feedback"
            : "Error generating feedback",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("decision-feedback error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
