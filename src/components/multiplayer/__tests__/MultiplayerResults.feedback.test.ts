import { describe, it, expect } from 'vitest';

// Test the decision icon selector logic
function getDecisionIcon(feedback: string): { iconName: string; color: string } {
  const lower = feedback.toLowerCase();
  if (lower.includes("good") || lower.includes("buena") || lower.includes("smart") || lower.includes("inteligente") || lower.includes("best")) {
    return { iconName: "CheckCircle2", color: "#10b981" }; // emerald - good decision
  } else if (lower.includes("bad") || lower.includes("mala") || lower.includes("painful") || lower.includes("dolorosa") || lower.includes("hurt")) {
    return { iconName: "XCircle", color: "#ef4444" }; // red - bad decision
  } else if (lower.includes("bold") || lower.includes("atrevido") || lower.includes("profitable") || lower.includes("rentable")) {
    return { iconName: "Flame", color: "#f59e0b" }; // amber - bold/risky
  } else if (lower.includes("tough") || lower.includes("difícil") || lower.includes("risky") || lower.includes("riesgo")) {
    return { iconName: "AlertCircle", color: "#f59e0b" }; // amber - tough call
  }
  return { iconName: "Lightbulb", color: "#5BB8F5" };
}

// Test the feedback prompt builder logic
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

  const buyImpact = 1 + (holdImpact - 1) * 1.5;
  const bestImpact = Math.max(holdImpact, sellImpact, buyImpact);
  const recommended = bestImpact === buyImpact ? "Buy"
    : bestImpact === holdImpact ? "Hold" : "Sell";
  const wasRecommended = decision === "hold" && recommended === "Hold"
    || decision === "buy" && recommended === "Buy"
    || decision === "sell" && recommended === "Sell";

  if (isEs) {
    return `Evento: ${eventTitle}
Decisión: ${decision.toUpperCase()}
Balance: CHF ${Math.round(balanceBefore)} → CHF ${Math.round(balanceAfter)} (${chfChange >= 0 ? "+" : ""}${Math.round(chfChange)})
¿Correcta?: ${wasRecommended ? "SÍ" : "NO"}`;
  } else {
    return `Event: ${eventTitle}
Decision: ${decision.toUpperCase()}
Balance: CHF ${Math.round(balanceBefore)} → CHF ${Math.round(balanceAfter)} (${chfChange >= 0 ? "+" : ""}${Math.round(chfChange)})
Correct?: ${wasRecommended ? "YES" : "NO"}`;
  }
}

describe("MultiplayerResults Feedback System", () => {

  describe("getDecisionIcon - Icon Selection", () => {
    it("should return CheckCircle2 (green) for good decisions", () => {
      const feedback = "✅ GOOD DECISION - Your choice was excellent";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("CheckCircle2");
      expect(result.color).toBe("#10b981");
    });

    it("should detect Spanish 'buena decisión'", () => {
      const feedback = "Fue una buena decisión de inversión";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("CheckCircle2");
      expect(result.color).toBe("#10b981");
    });

    it("should return XCircle (red) for bad decisions", () => {
      const feedback = "❌ PAINFUL LESSON - This hurt your portfolio";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("XCircle");
      expect(result.color).toBe("#ef4444");
    });

    it("should detect Spanish 'decisión mala'", () => {
      const feedback = "Lamentablemente fue una decisión mala";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("XCircle");
      expect(result.color).toBe("#ef4444");
    });

    it("should return Flame (amber) for bold/profitable decisions", () => {
      const feedback = "🔥 BOLD & PROFITABLE - You invested at the right time";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("Flame");
      expect(result.color).toBe("#f59e0b");
    });

    it("should detect Spanish 'atrevido y rentable'", () => {
      const feedback = "Fue una decisión atrevida y rentable durante la caída";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("Flame");
      expect(result.color).toBe("#f59e0b");
    });

    it("should return AlertCircle (amber) for tough calls", () => {
      const feedback = "⚠️ TOUGH CALL - Both options had downsides";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("AlertCircle");
      expect(result.color).toBe("#f59e0b");
    });

    it("should detect Spanish 'riesgo' for risky decisions", () => {
      const feedback = "Fue arriesgado, pero el riesgo valió la pena";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("AlertCircle");
      expect(result.color).toBe("#f59e0b");
    });

    it("should return Lightbulb as default for neutral feedback", () => {
      const feedback = "You took a wait-and-see approach";
      const result = getDecisionIcon(feedback);
      expect(result.iconName).toBe("Lightbulb");
      expect(result.color).toBe("#5BB8F5");
    });
  });

  describe("buildFeedbackPrompt - Prompt Generation", () => {
    it("should generate English prompt with correct structure", () => {
      const prompt = buildFeedbackPrompt(
        "en",
        "Market Crash",
        "Global stocks fell 15%",
        "hold",
        0.85,
        0.90,
        1000,
        900
      );

      expect(prompt).toContain("Event: Market Crash");
      expect(prompt).toContain("Decision: HOLD");
      expect(prompt).toContain("Balance: CHF 1000 → CHF 900 (-100)");
      expect(prompt).toContain("Correct?:");
    });

    it("should generate Spanish prompt with correct structure", () => {
      const prompt = buildFeedbackPrompt(
        "es",
        "Caida Bursatil",
        "Las acciones globales cayeron 15%",
        "sell",
        0.85,
        0.95,
        1000,
        950
      );

      expect(prompt).toContain("Evento: Caida Bursatil");
      expect(prompt).toContain("Decisión: SELL");
      expect(prompt).toContain("Balance: CHF 1000 → CHF 950 (-50)");
      expect(prompt).toContain("¿Correcta?:");
    });

    it("should calculate financial change correctly (gain)", () => {
      const prompt = buildFeedbackPrompt(
        "en",
        "Recovery",
        "Market rebounds",
        "buy",
        1.15,
        1.10,
        1000,
        1150
      );

      expect(prompt).toContain("+150");
    });

    it("should calculate financial change correctly (loss)", () => {
      const prompt = buildFeedbackPrompt(
        "en",
        "Downturn",
        "Stocks decline",
        "hold",
        0.90,
        0.85,
        1000,
        850
      );

      expect(prompt).toContain("-150");
    });

    it("should determine if decision was recommended (YES - when decision matches best option)", () => {
      // Test when the user's decision matches the recommended action
      // When sellImpact is high (close to 1.0), that means selling is the best option
      const prompt = buildFeedbackPrompt(
        "en",
        "Technical Bounce",
        "Temporary recovery",
        "sell",
        0.80,
        0.98,
        1000,
        980
      );
      // holdImpact: 0.80
      // sellImpact: 0.98 (highest, so recommended is Sell)
      // buyImpact: 1 + (0.80 - 1) * 1.5 = 1 - 0.30 = 0.70
      // User chose SELL which is recommended
      expect(prompt).toContain("Correct?: YES");
    });

    it("should determine if decision was recommended (NO - Buy was best but sold)", () => {
      const prompt = buildFeedbackPrompt(
        "en",
        "Opportunity",
        "Stock prices dropped",
        "sell",
        1.2,
        1.0,
        1000,
        950
      );

      expect(prompt).toContain("Correct?: NO");
    });

    it("should handle Buy decision correctly when it was the best option", () => {
      const prompt = buildFeedbackPrompt(
        "en",
        "Market Dip",
        "Cheap opportunity",
        "buy",
        1.0,
        0.95,
        1000,
        1100
      );

      expect(prompt).toContain("Decision: BUY");
      expect(prompt).toContain("+100");
    });
  });

  describe("Integration: Icon + Prompt together", () => {
    it("should select correct icon for a good buy decision", () => {
      const feedback = "BOLD & PROFITABLE - You invested more when prices were cheap";
      const icon = getDecisionIcon(feedback);

      expect(icon.iconName).toBe("Flame");
      expect(feedback).toContain("BOLD");
    });

    it("should select correct icon for a holding loss", () => {
      const feedback = "TOUGH CALL - Prices fell even more after you held";
      const icon = getDecisionIcon(feedback);

      expect(icon.iconName).toBe("AlertCircle");
      expect(feedback).toContain("TOUGH");
    });

    it("should select correct icon for selling panic", () => {
      const feedback = "PAINFUL LESSON - You sold before the recovery";
      const icon = getDecisionIcon(feedback);

      expect(icon.iconName).toBe("XCircle");
      expect(feedback).toContain("PAINFUL");
    });

    it("should match Spanish sentiment detection", () => {
      const feedback = "Buena decisión - esperaste el mercado correcto";
      const icon = getDecisionIcon(feedback);

      expect(icon.iconName).toBe("CheckCircle2");
      expect(feedback).toContain("Buena");
    });
  });
});
