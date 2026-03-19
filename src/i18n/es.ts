const es = {
  // Auth
  auth: {
    tagline: "Aprende a invertir jugando. Incuba tus huevos de oro.",
    signInGoogle: "Iniciar sesión con Google",
    demoUser: "🎮 Usuario Demo",
    disclaimer: "Al continuar, aceptas que esto es un juego educativo y no asesoramiento financiero real.",
  },

  // Onboarding steps
  onboarding: {
    step: "Paso {{current}} de {{total}}",
    next: "Siguiente",
    letsGo: "¡Vamos!",
    steps: [
      {
        title: "Define tu perfil",
        description: "Dime cómo te gusta jugar — seguro y constante, o audaz y arriesgado. Personalizaré tu camino desde ahí.",
      },
      {
        title: "Haz tus jugadas",
        description: "Compra, vende y reacciona a eventos reales del mercado. Cada decisión moldea tu portafolio.",
      },
      {
        title: "Incuba tu riqueza",
        description: "Mira crecer tu nido con el tiempo. Cuanto más juegas, más aprendes — y ganas.",
      },
    ],
  },

  // Welcome screen
  welcome: {
    title: "Descubramos tu perfil financiero",
    subtitle: "Responde 3 preguntas rápidas para personalizar tu camino de inversión.",
    cta: "¡Vamos!",
  },

  // Risk questions
  risk: {
    continue: "CONTINUAR",
    questions: [
      {
        title: "¡Hola! Imagina que eres un pajarito de mi bandada. ¿Cómo buscarías tu comida hoy?",
        options: [
          "Comería semillas de los comederos seguros. Siempre habrá comida, pero creceré muy lento.",
          "Buscaría bayas en las ramas medias. A veces no encontraré, pero cuando lo haga, creceré más.",
          "Volaría hasta la cima por la Fruta Dorada. Es arriesgado, pero si la consigo, creceré muchísimo de golpe.",
        ],
      },
      {
        title: "¡Oh no! Una fuerte tormenta sacude el árbol y el nido donde guardas tus ramas se tambalea. ¿Qué haces?",
        options: [
          "Salgo volando y busco una cueva. Pierdo el nido, pero prefiero estar a salvo de la lluvia.",
          "Me quedo tranquilo en el nido y espero pacientemente a que vuelva a salir el sol.",
          "¡Aprovecho el viento! Salgo a buscar las ramas que se cayeron para hacer mi nido más grande.",
        ],
      },
      {
        title: "Última pregunta. ¿Para qué gran aventura te estás entrenando en el bosque?",
        options: [
          "Para vuelos cortos de fin de semana. Necesito estar cerca de casa por si hay una emergencia.",
          "Para explorar el bosque la próxima temporada. Tardaré un poco en volver.",
          "Para la Gran Migración anual. No volveré por mucho tiempo, pero regresaré mucho más fuerte.",
        ],
      },
    ],
  },

  // Profile result
  profile: {
    conservative: {
      title: "Guardián Prudente",
      card: "Prefieres la seguridad ante todo. Tu nido será fuerte y estable, con comida garantizada todos los días. ¡Vamos a construir tu Nido juntos!",
    },
    balanced: {
      title: "Explorador Equilibrado",
      card: "Como la mayoría de los principiantes, buscas crecer a buen ritmo pero prefieres tener siempre un refugio seguro. ¡Vamos a construir tu Nido juntos!",
    },
    growth: {
      title: "Águila Audaz",
      card: "No le temes a las tormentas y siempre buscas la Fruta Dorada. Volarás alto y lejos. ¡Vamos a construir tu Nido juntos!",
    },
    buildMyNest: "CONSTRUIR MI NIDO",
  },

  // Portfolio builder
  portfolio: {
    realRisk: "Riesgo real",
    realReturn: "Retorno real anual",
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    cagr: "CAGR 2006–2026",
    yourRecommended: "TU PORTAFOLIO RECOMENDADO",
    risk: "Riesgo",
    return: "Retorno",
    vol: "Vol.",
    total: "Total 2006–2026",
    swapFor: "CAMBIAR POR...",
    simulate: "SIMULAR MI PORTAFOLIO",
    loadingRealData: "CARGANDO DATA REAL...",
    safe: "Seguro",
    balanced: "Equilibrado",
    growth: "Crecimiento",
    profileLabels: {
      conservative: { name: "Guardián Prudente", emoji: "🛡️", desc: "Tu portafolio prioriza la seguridad" },
      balanced: { name: "Explorador Equilibrado", emoji: "🌿", desc: "Balance entre seguridad y crecimiento" },
      growth: { name: "Águila Audaz", emoji: "🦅", desc: "Máximo crecimiento, mayor riesgo" },
    },
  },

  // Market event
  market: {
    stormTitle: "Una tormenta golpea el mercado",
    stormDesc: "Tus inversiones acaban de caer un 20%. ¿Qué haces?",
    stayCalmBtn: "🧘 Mantener la calma",
    sellBtn: "🏃 Vender todo",
  },

  // Simulation
  simulation: {
    results: "📊 Resultados Reales",
    howLong: "⏳ ¿Cuánto tiempo quieres simular?",
    basedOnReal: "Basado en datos reales del mercado (2006–2026)",
    historicalData: "Data histórica real de los últimos {{period}}",
    finalValue: "Valor final",
    invested: "Invertido",
    worstDip: "Peor caída",
    yourPortfolio: "TU PORTAFOLIO",
    letsSeePart1: "Vamos a ver cómo le fue a tu portafolio en los últimos ",
    realMarketData: "Datos reales de bolsas y bonos suizos, europeos y americanos",
    loadingMarketData: "Cargando datos reales del mercado...",
    simulateBtn: "🚀 SIMULAR {{period}}",
    loadingData: "CARGANDO DATA REAL...",
    tryAnother: "🔄 PROBAR OTRO PERIODO",
    continueBtn: "CONTINUAR",
    start: "Inicio",
    dateRange: "📅 {{range}}",
    periods: {
      "3m": "3 meses",
      "6m": "6 meses",
      "1y": "1 año",
      "5y": "5 años",
    },
  },

  // Learning moment
  learning: {
    title: "Lo que aprendiste",
    continue: "Continuar",
    sellInsight: "Vender durante una tormenta bloqueó tus pérdidas. La paciencia suele llevar a la recuperación.",
    allGrowthInsight: "Mayor riesgo trajo mayores recompensas — pero también tormentas más grandes. La diversificación ayuda.",
    allSafeInsight: "Jugar seguro preservó tu dinero, pero el crecimiento fue limitado. Un poco de riesgo puede dar mucho.",
    stayInsight: "Mantenerte invertido durante la tormenta ayudó a tu jardín a recuperarse y crecer más fuerte.",
    balancedInsight: "Un enfoque equilibrado te dio un crecimiento constante sin demasiadas sorpresas.",
  },

  // Loop screen
  loop: {
    title: "Tu jardín está creciendo",
    finalValue: "Valor final",
    tryAgainPrompt: "¿Quieres ver qué pasa con diferentes decisiones?",
    tryAgain: "🔄 Intentar de nuevo",
    adjust: "🌿 Ajustar tu jardín",
  },

  // Panel
  panel: {
    myNest: "Mi Nido",
    panelTitle: "Panel",
    balance: "Balance",
    risk: "Riesgo",
    returnLabel: "Retorno",
    annual: "Anual",
    lastSim: "última sim.",
    perMonth: "/mes",
    nestEmpty: "¡Tu nido está vacío!",
    nestEmptyHint: "Compra tu primera inversión tocándola abajo 👇",
    buy: "🛒 Comprar",
    sell: "Vender",
    ask: "Preguntar",
    detail: "Detalle",
    riskLabel: "Riesgo",
    simulate: "Simular",
    addToSimulate: "Agrega inversiones a tu nido para simular",
    nestFull: "¡Tu nido está lleno! Vende un huevo para hacer espacio.",
    riskyBuy: "¡Cuidado! Compraste algo arriesgado. Tu nido tiembla un poco...",
    safeBuy: "¡Buena compra! Un huevito muy seguro para tu nido.",
    normalBuy: "¡Comprado! Buen ojo, ese huevo se ve prometedor.",
    soldMsg: "¡Vendiste {{name}}! A veces soltar un huevo es la mejor decisión.",
    soldGeneric: "Huevo vendido. Tu nido se siente más ligero.",
    nestGrew: "¡Genial! Tu nido creció {{pct}}% 🎉",
    nestDropped: "Tu nido bajó {{pct}}%, pero aprendiste 💪",
    buyDialogTitle: "¡Estás comprando!",
    buyDialogDesc: "Vas a agregar este huevito a tu nido. Recuerda: comprar = invertir en este activo.",
    buyDialogConfirm: "Entendido, ¡comprar!",
    buyDialogDontRemind: "Entendido, no volver a recordarme",
  },

  // Time simulation
  timeSim: {
    simulation: "Simulación",
    realData: "datos reales",
    flightComplete: "¡Vuelo completado!",
    nestInTime: "Tu nido en el tiempo",
    invested: "Invertido",
    currentValue: "Valor actual",
    gain: "Ganancia",
    loadingMarket: "Cargando datos reales del mercado...",
    letsStart: "¡Empecemos! Veamos cómo vuela tu nido 🐦",
    nestGrew: "🎉 ¡Tu nido creció! Ganaste CHF {{amount}} en {{period}}",
    nestShrunk: "😅 Tu nido se encogió CHF {{amount}} en {{period}}. ¡Pero aprendiste!",
    backToNest: "🪺 Volver a mi nido",
    pause: "Pausar",
    start: "Empezar",
    resume: "Continuar",
    advance: "Avanzar",
    askCoach: "🐦 Pregúntale al coach",
    holdAll: "🦅 ¡Aguantar! Mantengo todo",
    orSell: "o vende una inversión:",
    sellInv: "Vender {{name}}",
    whatDoesThisMean: "🐦 ¿Qué significa esto?",
    great: "🎉 ¡Genial!",
    letsKeepGoing: "💪 ¡Seguimos!",
    whatToDo: "¿Qué quieres hacer?",
    nestDropped: "Tu nido bajó {{pct}}%",
    nestRose: "Tu nido subió {{pct}}%",
    today: "Hoy",
  },

  // Market events for time simulation
  marketEvents: {
    boom: { title: "¡Primavera financiera!", desc: "El mercado florece. Tu nido brilla." },
    crash: { title: "¡Tormenta en el mercado!", desc: "Los vientos soplan fuerte. ¿Mantienes tus huevos?" },
    steady: { title: "Cielo despejado", desc: "Todo tranquilo. Tu nido crece poco a poco." },
    techBoom: { title: "¡Boom tecnológico!", desc: "Las empresas tech despegan. Los nidos con tech crecen más." },
    recession: { title: "Invierno económico", desc: "Todo se enfría. Los pájaros más valientes aguantan." },
    greenWave: { title: "Ola verde", desc: "La energía limpia sube. ¡El futuro es verde!" },
    inflation: { title: "¡Inflación alta!", desc: "Los precios suben. Tu nido pierde un poco de calor." },
    dividend: { title: "¡Temporada de dividendos!", desc: "Tus inversiones ponen huevos extra." },
    stable: { title: "Nido estable", desc: "Sin sorpresas. Tu nido se mantiene firme." },
    war: { title: "Tensión global", desc: "El mundo se sacude. Los mercados tiemblan." },
  },

  // Bird messages
  birdMessages: {
    positive: [
      "¡Tu nido brilla! 🌟",
      "¡Los huevos están calentitos! 🥚✨",
      "¡Buen vuelo! Vas por buen camino 🐦",
    ],
    negative: [
      "¡Aguanta! Las tormentas pasan 🌧️",
      "Los pájaros fuertes resisten el viento 💪",
      "No todo vuelo es suave, ¡pero sigues volando! 🦅",
    ],
    neutral: [
      "Tranquilo, tu nido crece despacio pero seguro 🪺",
      "Paciencia, pajarito. El tiempo es tu amigo ⏳",
      "Paso a paso se construye el mejor nido 🐣",
    ],
    sell: [
      "¡Vendiste! A veces es bueno aligerar el nido 🍃",
      "Huevo fuera. ¿Fue buena decisión? Lo veremos... 🤔",
    ],
    held: "¡Mantuviste! Los pájaros valientes aguantan la tormenta 💪",
  },

  // Coach chat
  coach: {
    title: "Helve Coach",
    analyzing: "Analizando {{count}} inversión{{plural}}",
    yourGuide: "Tu guía de inversiones",
    greeting: "¡Hola! Soy tu coach",
    analyzeNest: "Puedo analizar tu nido y darte recomendaciones",
    askAnything: "Pregúntame lo que quieras sobre inversiones",
    quickQuestions: {
      withPortfolio: ["¿Cómo va mi nido?", "¿Debería diversificar?", "¿Cuál es mi nivel de riesgo?"],
      withoutPortfolio: ["¿Qué es el riesgo?", "¿Cómo empiezo a invertir?", "¿Qué es un ETF?"],
    },
    inputPlaceholder: "Escribe o usa el micrófono...",
    stop: "Parar",
    listen: "Escuchar",
    voiceNotSupported: "Tu navegador no soporta reconocimiento de voz. Prueba Chrome.",
  },

  // Tags
  tags: {
    AAA: "Máxima calidad crediticia",
    GOV: "Bono gubernamental",
    NESN: "Ticker: Nestlé",
    NOVN: "Ticker: Novartis",
    AAPL: "Ticker: Apple",
    MSFT: "Ticker: Microsoft",
    NVDA: "Ticker: NVIDIA",
    LOGN: "Ticker: Logitech",
    UBSG: "Ticker: UBS",
    AMZN: "Ticker: Amazon",
    "HIGH RISK": "Riesgo elevado",
    maxQuality: "· Máx. calidad",
    government: "· Gobierno",
  },

  // Risk words
  riskWords: {
    veryLow: "Muy seguro",
    low: "Seguro",
    moderate: "Moderado",
    risky: "Arriesgado",
    veryHigh: "Muy arriesgado",
  },

  // Common
  common: {
    loading: "Cargando...",
    perYear: "/año",
    notFound: {
      title: "404",
      message: "¡Ups! Página no encontrada",
      backHome: "Volver al inicio",
    },
  },
};

export default es;
