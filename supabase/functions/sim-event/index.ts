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
          title: { type: "string", description: "Short dramatic event title (3-6 words)" },
          description: { type: "string", description: "1-2 sentence vivid description of what's happening" },
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
    const { portfolio, balance, monthLabel, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = language === "es" ? "español" : "English";
    const portfolioDesc = (portfolio || [])
      .map((p: any) => p.name)
      .join(", ") || "empty portfolio";

    const systemPrompt = `You are a financial market event generator for an educational investment game. 
You create realistic but simplified market scenarios that teach beginners about investing.

RULES:
- Respond ALWAYS in ${lang}
- Create dramatic, engaging scenarios inspired by real-world events (tech crashes, pandemics, rate hikes, commodity booms, geopolitical tension, etc.)
- Each scenario must have exactly 3 options: hold, sell, buy
- Exactly ONE option should be marked as is_best=true (the wisest choice for a long-term investor)
- feedback_good: celebrate the smart choice, explain briefly why it's wise
- feedback_bad: be supportive ("Don't worry, this happens to everyone"), explain what went wrong, give a concrete tip for next time
- Use the bird/nest metaphor: portfolio = nest, investments = eggs
- Keep it simple, no jargon
- NEVER mention AI or that this is generated
- Make scenarios varied: sometimes holding is best, sometimes selling, sometimes buying more is the contrarian play
- Consider the user's actual portfolio when crafting the scenario`;

    const userPrompt = `The user's nest has: ${portfolioDesc}. Current balance: CHF ${balance}. Time: ${monthLabel}. Generate a surprising market event.`;

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
