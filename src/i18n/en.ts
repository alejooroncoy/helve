const en = {
  // Auth
  auth: {
    tagline: "Learn to invest by playing. Hatch your golden eggs.",
    signInGoogle: "Sign in with Google",
    demoUser: "🎮 Demo User",
    disclaimer: "By continuing, you agree that this is an educational game and not real financial advice.",
  },

  // Onboarding steps
  onboarding: {
    step: "Step {{current}} of {{total}}",
    next: "Next",
    letsGo: "Let's go",
    steps: [
      {
        title: "Set your profile",
        description: "Tell me how you like to play it — safe and steady, or bold and risky. I'll tailor your journey from there.",
      },
      {
        title: "Make your moves",
        description: "Buy, sell, and react to real market events. Every decision shapes your portfolio.",
      },
      {
        title: "Hatch your wealth",
        description: "Watch your nest grow over time. The more you play, the more you learn — and earn.",
      },
    ],
  },

  // Welcome screen
  welcome: {
    title: "Let's discover your financial profile",
    subtitle: "Answer 3 quick questions so we can personalize your investment journey.",
    cta: "Let's go",
  },

  // Risk questions
  risk: {
    continue: "CONTINUE",
    questions: [
      {
        title: "Hey! Imagine you're a little bird in my flock. How would you look for food today?",
        options: [
          "I'd eat seeds from the safe feeders. There'll always be food, but I'll grow very slowly.",
          "I'd look for berries on the middle branches. Sometimes I won't find any, but when I do, I'll grow more.",
          "I'd fly to the top for the Golden Fruit. It's risky, but if I get it, I'll grow a lot at once.",
        ],
      },
      {
        title: "Oh no! A strong storm shakes the tree and the nest where you keep your branches wobbles. What do you do?",
        options: [
          "I fly away and find a cave. I lose the nest, but I'd rather be safe from the rain.",
          "I stay calm in the nest and patiently wait for the sun to come back.",
          "I take advantage of the wind! I go out to collect the fallen branches to make my nest bigger.",
        ],
      },
      {
        title: "Last question. What great adventure are you training for in the forest?",
        options: [
          "Short weekend flights. I need to stay close to home in case of an emergency.",
          "Exploring the forest next season to explore. It'll take a while to come back.",
          "The Great Annual Migration. I won't return for a long time, but I'll come back much stronger.",
        ],
      },
    ],
  },

  // Profile result
  profile: {
    conservative: {
      title: "Prudent Guardian",
      card: "You prefer safety above all. Your nest will be strong and stable, with food guaranteed every day. Let's build your Nest together!",
    },
    balanced: {
      title: "Balanced Explorer",
      card: "Like most beginners, you seek steady growth but prefer to always have a safe haven. Let's build your Nest together!",
    },
    growth: {
      title: "Bold Eagle",
      card: "You don't fear storms and always seek the Golden Fruit. You'll fly high and far. Let's build your Nest together!",
    },
    buildMyNest: "BUILD MY NEST",
  },

  // Portfolio builder
  portfolio: {
    realRisk: "Real risk",
    realReturn: "Real annual return",
    low: "Low",
    medium: "Medium",
    high: "High",
    cagr: "CAGR 2006–2026",
    yourRecommended: "YOUR RECOMMENDED PORTFOLIO",
    risk: "Risk",
    return: "Return",
    vol: "Vol.",
    total: "Total 2006–2026",
    swapFor: "SWAP FOR...",
    simulate: "SIMULATE MY PORTFOLIO",
    loadingRealData: "LOADING REAL DATA...",
    safe: "Safe",
    balanced: "Balanced",
    growth: "Growth",
    profileLabels: {
      conservative: { name: "Prudent Guardian", emoji: "🛡️", desc: "Your portfolio prioritizes safety" },
      balanced: { name: "Balanced Explorer", emoji: "🌿", desc: "Balance between safety and growth" },
      growth: { name: "Bold Eagle", emoji: "🦅", desc: "Maximum growth, higher risk" },
    },
  },

  // Market event
  market: {
    stormTitle: "A storm hits the market",
    stormDesc: "Your investments just dropped 20%. What do you do?",
    stayCalmBtn: "🧘 Stay calm",
    sellBtn: "🏃 Sell everything",
  },

  // Simulation
  simulation: {
    results: "📊 Real Results",
    howLong: "⏳ How long do you want to simulate?",
    basedOnReal: "Based on real market data (2006–2026)",
    historicalData: "Real historical data from the last {{period}}",
    finalValue: "Final value",
    invested: "Invested",
    worstDip: "Worst dip",
    yourPortfolio: "YOUR PORTFOLIO",
    letsSeePart1: "Let's see how your portfolio performed in the last ",
    realMarketData: "Real data from Swiss, European, and American stock markets and bonds",
    loadingMarketData: "Loading real market data...",
    simulateBtn: "🚀 SIMULATE {{period}}",
    loadingData: "LOADING REAL DATA...",
    tryAnother: "🔄 TRY ANOTHER PERIOD",
    continueBtn: "CONTINUE",
    start: "Start",
    dateRange: "📅 {{range}}",
    periods: {
      "3m": "3 months",
      "6m": "6 months",
      "1y": "1 year",
      "5y": "5 years",
    },
  },

  // Learning moment
  learning: {
    title: "What you learned",
    continue: "Continue",
    sellInsight: "Selling during a storm locked in your losses. Patience often leads to recovery.",
    allGrowthInsight: "Higher risk brought bigger rewards — but also bigger storms. Diversification helps.",
    allSafeInsight: "Playing it safe preserved your money, but growth was limited. A little risk can go a long way.",
    stayInsight: "Staying invested during the storm helped your garden recover and grow stronger.",
    balancedInsight: "A balanced approach gave you steady growth without too many surprises.",
  },

  // Loop screen
  loop: {
    title: "Your garden is growing",
    finalValue: "Final value",
    tryAgainPrompt: "Want to see what happens with different choices?",
    tryAgain: "🔄 Try Again",
    adjust: "🌿 Adjust Your Garden",
  },

  // Panel
  panel: {
    myNest: "My Nest",
    panelTitle: "Panel",
    balance: "Balance",
    risk: "Risk",
    returnLabel: "Return",
    annual: "Annual",
    lastSim: "last sim.",
    perMonth: "/mo",
    nestEmpty: "Your nest is empty!",
    nestEmptyHint: "Buy your first investment by tapping below 👇",
    buy: "🛒 Buy",
    sell: "Sell",
    ask: "Ask",
    detail: "Detail",
    riskLabel: "Risk",
    simulate: "Simulate",
    addToSimulate: "Add investments to your nest to simulate",
    nestFull: "Your nest is full! Remove an egg to make room.",
    riskyBuy: "Added! Careful, this one's risky. Your nest shakes a bit...",
    safeBuy: "Added! A very safe egg for your nest.",
    normalBuy: "Added! Good eye, that egg looks promising.",
    soldMsg: "Removed {{name}} from your nest. Making room for something better!",
    soldGeneric: "Egg removed. Your nest feels lighter.",
    nestGrew: "Great! Your nest grew {{pct}}% 🎉",
    nestDropped: "Your nest dropped {{pct}}%, but you learned 💪",
    buyDialogTitle: "You're buying!",
    buyDialogDesc: "You're adding this egg to your nest. Remember: buying = investing in this asset.",
    buyDialogConfirm: "Got it, buy!",
    buyDialogDontRemind: "Got it, don't remind me again",
  },

  // Time simulation
  timeSim: {
    simulation: "Simulation",
    realData: "real data",
    flightComplete: "Flight complete!",
    nestInTime: "Your nest over time",
    invested: "Invested",
    currentValue: "Current value",
    gain: "Gain",
    loadingMarket: "Loading real market data...",
    letsStart: "Let's go! Let's see how your nest flies 🐦",
    nestGrew: "🎉 Your nest grew! You earned CHF {{amount}} in {{period}}",
    nestShrunk: "😅 Your nest shrunk CHF {{amount}} in {{period}}. But you learned!",
    backToNest: "🪺 Back to my nest",
    pause: "Pause",
    start: "Start",
    resume: "Continue",
    advance: "Advance",
    askCoach: "🐦 Ask the coach",
    holdAll: "🦅 Hold! I keep everything",
    orSell: "or sell an investment:",
    sellInv: "Sell {{name}}",
    whatDoesThisMean: "🐦 What does this mean?",
    great: "🎉 Great!",
    letsKeepGoing: "💪 Let's keep going!",
    whatToDo: "What do you want to do?",
    nestDropped: "Your nest dropped {{pct}}%",
    nestRose: "Your nest rose {{pct}}%",
    today: "Today",
  },

  // Market events for time simulation
  marketEvents: {
    boom: { title: "Financial spring!", desc: "The market blooms. Your nest shines." },
    crash: { title: "Market storm!", desc: "Strong winds blow. Will you keep your eggs?" },
    steady: { title: "Clear skies", desc: "All calm. Your nest grows little by little." },
    techBoom: { title: "Tech boom!", desc: "Tech companies take off. Tech nests grow more." },
    recession: { title: "Economic winter", desc: "Everything cools down. The bravest birds hold on." },
    greenWave: { title: "Green wave", desc: "Clean energy rises. The future is green!" },
    inflation: { title: "High inflation!", desc: "Prices rise. Your nest loses a bit of warmth." },
    dividend: { title: "Dividend season!", desc: "Your investments lay extra eggs." },
    stable: { title: "Stable nest", desc: "No surprises. Your nest stands firm." },
    war: { title: "Global tension", desc: "The world shakes. Markets tremble." },
  },

  // Bird messages
  birdMessages: {
    positive: [
      "Your nest shines! 🌟",
      "The eggs are warm! 🥚✨",
      "Great flight! You're on the right path 🐦",
    ],
    negative: [
      "Hold on! Storms pass 🌧️",
      "Strong birds resist the wind 💪",
      "Not every flight is smooth, but you're still flying! 🦅",
    ],
    neutral: [
      "Easy does it, your nest grows slowly but surely 🪺",
      "Patience, little bird. Time is your friend ⏳",
      "Step by step you build the best nest 🐣",
    ],
    sell: [
      "Sold! Sometimes it's good to lighten the nest 🍃",
      "Egg out. Was it a good decision? We'll see... 🤔",
    ],
    held: "You held! Brave birds weather the storm 💪",
  },

  // Coach chat
  coach: {
    title: "Helve Coach",
    analyzing: "Analyzing {{count}} investment{{plural}}",
    yourGuide: "Your investment guide",
    greeting: "Hi! I'm your coach",
    analyzeNest: "I can analyze your nest and give you recommendations",
    askAnything: "Ask me anything about investing",
    quickQuestions: {
      withPortfolio: ["How is my nest doing?", "Should I diversify?", "What's my risk level?"],
      withoutPortfolio: ["What is risk?", "How do I start investing?", "What is an ETF?"],
    },
    inputPlaceholder: "Write or use the microphone...",
    stop: "Stop",
    listen: "Listen",
    voiceNotSupported: "Your browser doesn't support voice recognition. Try Chrome.",
  },

  // Tags
  tags: {
    AAA: "Top credit quality",
    GOV: "Government bond",
    NESN: "Ticker: Nestlé",
    NOVN: "Ticker: Novartis",
    AAPL: "Ticker: Apple",
    MSFT: "Ticker: Microsoft",
    NVDA: "Ticker: NVIDIA",
    LOGN: "Ticker: Logitech",
    UBSG: "Ticker: UBS",
    AMZN: "Ticker: Amazon",
    "HIGH RISK": "High risk",
    maxQuality: "· Max. quality",
    government: "· Government",
  },

  // Risk words
  riskWords: {
    veryLow: "Very safe",
    low: "Safe",
    moderate: "Moderate",
    risky: "Risky",
    veryHigh: "Very risky",
  },

  // Common
  common: {
    loading: "Loading...",
    perYear: "/yr",
    notFound: {
      title: "404",
      message: "Oops! Page not found",
      backHome: "Return to Home",
    },
  },
};

export default en;
