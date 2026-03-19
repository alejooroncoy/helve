import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are an expert financial narrator for a gamified investment learning app called Helve.

Your job: Given a portfolio and a real market price movement, create a SHORT, realistic, educational market scenario that explains WHY this move could have happened.

RULES:
- The scenario must be PLAUSIBLE and based on real-world events that could cause such movements
- Write in the SAME LANGUAGE as the user's "lang" field (en = English, es = Spanish)
- Keep the bird/nest metaphor: investments = eggs, portfolio = nest
- Be educational but fun — like a Duolingo lesson about finance
- ALWAYS return valid JSON matching the schema below

OUTPUT JSON SCHEMA:
{
  "emoji": "single emoji representing the event",
  "title": "short catchy title (max 8 words)",
  "description": "1-2 sentences explaining what happened in simple terms",
  "educationalTip": "1 sentence teaching something about investing",
  "options": [
    {
      "id": "hold",
      "emoji": "🦅",
      "label": "short action label (3-5 words)",
      "description": "1 sentence explaining this choice"
    },
    {
      "id": "sell_worst",
      "emoji": "💸",
      "label": "short action label",
      "description": "1 sentence explaining this choice"
    },
    {
      "id": "ask_coach",
      "emoji": "🐦",
      "label": "Ask the coach",
      "description": "Get personalized advice"
    }
  ]
}

IMPORTANT:
- For NEGATIVE moves (drops): focus on fear/uncertainty, options should test if user panics or stays calm
- For POSITIVE moves (gains): focus on excitement/greed, options should test if user gets overconfident
- Reference SPECIFIC investments from their portfolio when relevant
- The "sell_worst" option should mention the riskiest investment in their portfolio by name`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portfolio, movePct, moveType, periodLabel, lang } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const portfolioDesc = (portfolio || [])
      .map((p: any) => `${p.emoji} ${p.name} (risk ${p.riskLevel}/10, return ${p.annualReturn}%)`)
      .join(", ");

    const riskiest = (portfolio || []).reduce(
      (max: any, p: any) => (p.riskLevel > (max?.riskLevel || 0) ? p : max),
      null
    );

    const userPrompt = `Portfolio: ${portfolioDesc}
Riskiest investment: ${riskiest ? `${riskiest.emoji} ${riskiest.name} (risk ${riskiest.riskLevel}/10)` : "none"}
Market move: ${movePct > 0 ? "+" : ""}${movePct.toFixed(1)}% (${moveType})
Period context: simulating ${periodLabel}
Language: ${lang}

Generate a realistic market scenario for this price movement.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "create_scenario",
              description: "Create a market scenario with options for the user",
              parameters: {
                type: "object",
                properties: {
                  emoji: { type: "string", description: "Single emoji" },
                  title: { type: "string", description: "Short catchy title" },
                  description: { type: "string", description: "1-2 sentences" },
                  educationalTip: { type: "string", description: "1 sentence teaching tip" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", enum: ["hold", "sell_worst", "ask_coach"] },
                        emoji: { type: "string" },
                        label: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["id", "emoji", "label", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["emoji", "title", "description", "educationalTip", "options"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_scenario" } },
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const scenario = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(scenario),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback if no tool call
    throw new Error("No tool call in response");
  } catch (e) {
    console.error("sim-scenario error:", e);
    // Return a fallback scenario so the simulation doesn't break
    return new Response(
      JSON.stringify({
        emoji: "📊",
        title: "Market movement",
        description: "The market moved. What will you do?",
        educationalTip: "Staying calm during volatility is key to long-term investing.",
        options: [
          { id: "hold", emoji: "🦅", label: "Hold everything", description: "Stay the course" },
          { id: "sell_worst", emoji: "💸", label: "Sell riskiest", description: "Reduce risk" },
          { id: "ask_coach", emoji: "🐦", label: "Ask the coach", description: "Get advice" },
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
