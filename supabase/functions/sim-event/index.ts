import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "market_scenario",
      description: "Return a market scenario with 3 choices and feedback for each.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short headline-style title (3-6 words), plain language, no jargon" },
          description: { type: "string", description: "2 sentences max. Sentence 1: what real-world event caused this market move (plain language, relatable analogy). Sentence 2: why it matters for this user's specific portfolio right now, in the context of an accelerated time simulation." },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["hold", "sell", "buy"] },
                label: { type: "string", description: "Short button label (2-4 words)" },
                is_best: { type: "boolean", description: "Whether this is the recommended action" },
                feedback_good: { type: "string", description: "Encouraging feedback if this IS the best choice (1-2 sentences)" },
                feedback_bad: { type: "string", description: "Supportive feedback if this is NOT the best choice, with a tip for next time (2-3 sentences)" },
              },
              required: ["action", "label", "is_best", "feedback_good", "feedback_bad"],
              additionalProperties: false,
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["title", "description", "options"],
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
    const {
      portfolio,
      balance,
      monthLabel,
      language,
      focusCategory,
      focusCategoryLabel,
      focusDirection,
      focusRiskLevel,
      focusImpactPct,
    } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = language === "es" ? "español" : "English";
    const portfolioDesc = (portfolio || [])
      .map((p: any) => p.name)
      .join(", ") || "empty portfolio";
    const focusedCategory = focusCategoryLabel || focusCategory || "one category";
    const directionHint = focusDirection === "drop"
      ? "price drop / panic"
      : focusDirection === "surge"
        ? "fast rally / sudden jump"
        : "volatile shake / uncertainty";

    const impactLabel = focusImpactPct != null ? `${focusImpactPct > 0 ? "+" : ""}${focusImpactPct}%` : "";

    const systemPrompt = `You are a storyteller inside an educational investment simulation where time is accelerated — years pass in minutes. Real market history is compressed so users can feel the long-term impact of their portfolio decisions.

Your job is to narrate a realistic market moment in plain, friendly language that a complete beginner can understand instantly. No jargon. Imagine explaining it to a friend over coffee.

RULES:
- Respond ALWAYS in ${lang}
- The scenario MUST be about ${focusedCategory}
- The current market trigger for ${focusedCategory} is: ${directionHint}
- CRITICAL: The exact price movement is ${impactLabel}. You MUST use this EXACT percentage in your description. Do NOT invent a different number.
- Title: short and vivid (3-6 words), like a newspaper headline anyone can understand
- Description (2 sentences max):
    • Sentence 1 — what is happening in the world right now that caused this move (use a real-world analogy like "oil prices spiked because...", "investors rushed to safety when...", "tech stocks surged after..."). Make it feel like a real market phase.
    • Sentence 2 — connect it directly to the user's nest: why does this matter for what they chose to invest in, and what is at stake right now as time flies forward in the simulation.
- Each scenario must have exactly 3 options: hold, sell, buy
- Exactly ONE option should be marked is_best=true (the wisest long-term choice)
- Options labels: short and action-oriented (2-4 words), no jargon
- feedback_good: confirm why the choice was smart in the long run, connect it to what a patient investor would do
- feedback_bad: be warm and supportive, explain simply what the risk was, give one concrete takeaway for next time
- Portfolio = nest, investments = eggs (use this lightly, do not overdo it)
- NEVER mention AI, simulations, or that this is generated
- Vary the best action based on context and risk level
- Higher risk assets justify sharper moves; always frame advice for a beginner learning long-term investing`;

    const userPrompt = `The user's nest holds: ${portfolioDesc}. Current balance: CHF ${balance}. Simulated time point: ${monthLabel} (remember: time is accelerated, this could represent years of real market history). Focus asset: ${focusedCategory} (risk level: ${focusRiskLevel ?? "unknown"}/10). Generate a vivid, beginner-friendly event for this asset with 3 decision buttons.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "market_scenario" } },
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No scenario generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scenario = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(scenario), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sim-event error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
