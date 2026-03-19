const es = {
  // Auth
  auth: {
    tagline: "Aprende a invertir jugando. Incuba tus huevos de oro.",
    signInGoogle: "Iniciar sesión con Google",
    demoUser: "Usuario Demo",
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
    riskProfile: "Perfil de riesgo",
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

  // Asset allocation
  allocation: {
    title: "ASIGNACIÓN DE ACTIVOS",
    reset: "Volver a recomendado",
    remaining: "{{pct}}% restante por asignar",
    over: "{{pct}}% de más — reduce alguna clase",
    mustEqual100: "LA ASIGNACIÓN DEBE SUMAR 100%",
    classes: {
      bonds: "Bonos",
      equity: "Acciones Globales",
      gold: "Oro",
      fx: "Divisas",
      swissStocks: "Acciones Suizas",
      usStocks: "Acciones USA",
      crypto: "Crypto",
      cleanEnergy: "Energía Limpia",
    },
    classDesc: {
      bonds: "Bajo riesgo, ingreso estable. Deuda gubernamental y corporativa.",
      equity: "Índices bursátiles globales. Exposición diversificada a acciones.",
      gold: "Cobertura contra inflación. Refugio seguro y reserva de valor.",
      fx: "Pares de divisas. Benefíciate de movimientos cambiarios.",
      swissStocks: "Principales empresas suizas. Exposición europea estable.",
      usStocks: "Principales empresas de EE.UU. Alto potencial de crecimiento.",
      crypto: "Monedas digitales. Muy alto riesgo, alta recompensa.",
      cleanEnergy: "Sector de energía renovable. Inversiones en el futuro verde.",
    },
    feedback: {
      aligned: {
        title: "✅ ¡Bien alineado con tu perfil!",
        desc: "Esta asignación coincide con tu tolerancia al riesgo de {{profile}}. Buen balance para tus objetivos.",
      },
      tooAggressive: {
        title: "⚠️ Más agresivo que tu perfil",
        desc: "Tu asignación tiene más riesgo que un portafolio típico de {{profile}}. Está bien si entiendes la volatilidad — ¡veamos cómo le va!",
      },
      tooConservative: {
        title: "⚠️ Más conservador que tu perfil",
        desc: "Tu asignación es más segura que un portafolio típico de {{profile}}. Podrías perderte algo de crecimiento — ¡simulemos y veamos!",
      },
    },
    summary: {
      aligned: {
        title: "📊 Tu asignación rindió como se esperaba",
        desc: "Tu portafolio coincidió con tu perfil de riesgo, entregando retornos consistentes con tu tolerancia a la volatilidad.",
      },
      tooAggressive: {
        title: "📊 Mayor riesgo trajo mayores vaivenes",
        desc: "Tu asignación agresiva amplificó tanto las ganancias como las pérdidas. Considera si te sientes cómodo con estas fluctuaciones a largo plazo.",
      },
      tooConservative: {
        title: "📊 La seguridad tuvo un costo en crecimiento",
        desc: "Tu asignación conservadora protegió contra pérdidas pero limitó las ganancias. Un poco más de exposición a acciones podría ayudar en horizontes más largos.",
      },
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
    tooAggressiveInsight: "Tu portafolio fue más arriesgado de lo que tu perfil sugería. La volatilidad extra puede dar frutos, ¡pero asegúrate de poder manejar las caídas!",
    tooConservativeInsight: "Tu portafolio fue más seguro de lo necesario para tu perfil. Evitaste pérdidas, pero también perdiste crecimiento potencial. Encontrar el balance correcto es clave.",
    highEquityInsight: "Alta exposición a acciones significa gran potencial de subida — pero también caídas más pronunciadas en mercados bajistas. La diversificación suaviza el camino.",
    highBondsInsight: "Los bonos brindan estabilidad e ingreso predecible. Genial para metas a corto plazo, pero el crecimiento a largo plazo puede requerir algo de exposición a acciones.",
    yourAllocation: "TU ASIGNACIÓN",
    riskScore: "Puntaje de riesgo: {{score}}/10",
    aligned: "Alineado con tu perfil ✅",
    misaligned: "Diferente a tu perfil ⚠️",
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
    nestEmptyHint: "Agrega tu primera categoría de inversión tocándola abajo 👇",
    buy: "🛒 Agregar",
    sell: "Quitar",
    ask: "Preguntar",
    detail: "Detalle",
    riskLabel: "Riesgo",
    simulate: "Simular",
    addToSimulate: "Agrega categorías a tu nido para simular",
    nestFull: "¡Tu nido está lleno! Quita una categoría para hacer espacio.",
    riskyBuy: "¡Agregado! Cuidado, esta es arriesgada. Tu nido tiembla un poco...",
    safeBuy: "¡Agregado! Una categoría muy segura para tu nido.",
    normalBuy: "¡Agregado! Buen ojo, esa categoría se ve prometedora.",
    soldMsg: "¡{{name}} fue quitado de tu nido! Haciendo espacio para algo mejor.",
    soldGeneric: "Categoría quitada. Tu nido se siente más ligero.",
    swapMsg: "¡Cambio hecho! Sacamos {{removed}} y agregamos {{added}} a tu nido 🔄",
    nestGrew: "¡Genial! Tu nido creció {{pct}}% 🎉",
    nestDropped: "Tu nido bajó {{pct}}%, pero aprendiste 💪",
    buyDialogTitle: "¡Estás agregando!",
    buyDialogDesc: "Vas a agregar esta categoría de activos a tu nido. Cada categoría representa un tipo de inversión.",
    buyDialogConfirm: "Entendido, ¡agregar!",
    buyDialogDontRemind: "Entendido, no volver a recordarme",
    allocation: "Asignación",
    cash: "Efectivo",
    ofBalance: "del balance",
    totalAllocated: "Asignado",
    adjustAllocation: "Desliza para ajustar %",
    maxAllocation: "Asignación máxima alcanzada (100%)",
    newNest: "Nuevo Nido",
    nestTab: "Nido {{n}}",
    deleteNest: "Eliminar nido",
    deleteNestConfirm: "¿Eliminar este nido y todas sus inversiones?",
    maxNests: "Puedes tener hasta 4 nidos",
    renameNest: "Renombrar",
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
    orSell: "o quita una categoría:",
    sellInv: "Quitar {{name}}",
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
      "Tu nido brilla!",
      "Los huevos estan calentitos!",
      "Buen vuelo! Vas por buen camino.",
    ],
    negative: [
      "Aguanta! Las tormentas pasan.",
      "Los pajaros fuertes resisten el viento.",
      "No todo vuelo es suave, pero sigues volando!",
    ],
    neutral: [
      "Tranquilo, tu nido crece despacio pero seguro.",
      "Paciencia, pajarito. El tiempo es tu amigo.",
      "Paso a paso se construye el mejor nido.",
    ],
    sell: [
      "Vendiste! A veces es bueno aligerar el nido.",
      "Fuera. Fue buena decision? Lo veremos...",
    ],
    held: "Mantuviste! Los pajaros valientes aguantan la tormenta.",
  },

  // Coach chat
  coach: {
    title: "Helve Coach",
    analyzing: "Analizando {{count}} categoría{{plural}}",
    yourGuide: "Tu guía de inversiones",
    greeting: "¡Hola! Soy tu coach",
    analyzeNest: "Puedo analizar tu nido y darte recomendaciones",
    askAnything: "Pregúntame lo que quieras sobre inversiones",
    quickQuestions: {
      withPortfolio: ["¿Cómo va mi nido?", "¿Debería diversificar?", "¿Cuál es mi nivel de riesgo?"],
      withoutPortfolio: ["¿Qué es el riesgo?", "¿Cómo empiezo a invertir?", "¿Qué son los bonos?"],
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

  // Multiplayer
  multiplayer: {
    subtitle: "¡Compite con amigos! Elige categorías de activos y sobrevive tormentas del mercado juntos.",
    createRoom: "Crear sala",
    joinRoom: "Unirse a sala",
    yourName: "Tu nombre",
    enterCode: "Código de sala",
    back: "Atrás",
    roomNotFound: "Sala no encontrada o ya está llena",
    createError: "Error al crear la sala, inténtalo de nuevo",
    nameRequired: "Por favor ingresa un nombre",
    codeRequired: "Por favor ingresa el código de 6 caracteres",
    invalidQR: "Código QR inválido",
    waitingRoom: "Sala de espera",
    roomCode: "Comparte este código",
    scanQR: "Escanear QR",
    qrNotSupported: "Escaneo QR no soportado en este navegador",
    qrNotFound: "No se detectó código QR, inténtalo de nuevo",
    qrCameraError: "No se pudo acceder a la cámara",
    scanQRHint: "Apunta la cámara al código QR",
    players: "Jugadores",
    waitingPlayer: "Esperando...",
    startGame: "Iniciar juego",
    needPlayers: "Se necesitan 2+ jugadores",
    waitingHost: "Esperando a que el host inicie...",
    pickAssets: "Elige tus Categorías",
    pickAssetsDesc: "Elige hasta {{max}} categorías. Tu dinero se repartirá equitativamente.",
    pickCategoriesDesc: "Cada jugador comienza con 1.000 CHF, dividido equitativamente entre tus elecciones.",
    ready: "¡Listo!",
    waitingOthers: "Esperando a los demás jugadores...",
    simulation: "Simulación en vivo",
    year: "Año",
    month: "Mes",
    yourBalance: "Tu balance",
    yourNest: "Tu Nest",
    leaderboard: "Clasificación",
    sell: "Vender",
    hold: "Mantener",
    decisionMade: "¡Decisión registrada!",
    simFinished: "¡Simulación completada!",
    waitingResults: "Esperando a que todos terminen...",
    gameOver: "¡Fin del juego!",
    wins: "gana",
    you: "tú",
    decisions: "decisiones tomadas",
    insight: "¿Qué aprendiste?",
    insightText: "Invertir a largo plazo premia la paciencia. Vender por pánico durante caídas suele fijar pérdidas, mientras que mantener en la volatilidad tiende a recuperarse con el tiempo.",
    playAgain: "Jugar de nuevo",
    backToNest: "Volver a My Nest",
    eventHistory: "HISTORIAL DE EVENTOS",
    recommended: "Recomendado",
  },

  // Multiplayer market events pool
  marketEventsPool: {
    crash: { title: "Caida Bursatil", desc: "Las acciones globales se desploman. El panico se extiende." },
    rateHike: { title: "Subida de Tasas", desc: "Los bancos centrales suben tasas. Bonos y divisas reaccionan." },
    goldRush: { title: "Fiebre del Oro", desc: "Inversores buscan refugio en el oro. Los precios se disparan." },
    pandemic: { title: "Pandemia Global", desc: "Una crisis de salud sacude las economias. Los mercados caen." },
    cryptoBoom: { title: "Boom Crypto", desc: "Las monedas digitales se disparan. Los early adopters celebran." },
    cryptoCrash: { title: "Crash Crypto", desc: "La burbuja crypto explota. Los valores colapsan de la noche a la manana." },
    inflation: { title: "Inflacion Alta", desc: "Los precios al consumidor se disparan. El poder adquisitivo se erosiona." },
    greenBoom: { title: "Boom de Energia Verde", desc: "El sector renovable se dispara con nuevas politicas." },
    currencyWar: { title: "Guerra de Divisas", desc: "Los paises devaluan sus monedas. Los mercados FX se descontrolan." },
    dividend: { title: "Temporada de Dividendos", desc: "Las principales empresas anuncian dividendos record." },
    recession: { title: "Recesion Global", desc: "La desaceleracion economica golpea todos los sectores. Los mercados se congelan." },
    oilSpike: { title: "Alza del Petroleo", desc: "Los precios del petroleo se disparan por problemas de suministro." },
    regulation: { title: "Nuevas Regulaciones", desc: "Los gobiernos endurecen las normas sobre crypto y energia verde." },
    aiRevolution: { title: "Revolucion IA", desc: "La inteligencia artificial transforma industrias. Las acciones tech suben." },
    swissFrancSurge: { title: "Alza del Franco Suizo", desc: "El franco se fortalece fuertemente. Los exportadores suizos sufren." },
    bondDefault: { title: "Impago de Bonos", desc: "Un gran emisor incumple. Los mercados de bonos tiemblan." },
    greenCrash: { title: "Caida Energia Limpia", desc: "Recortes de subsidios a energia verde. El sector sufre." },
    bullRun: { title: "Mercado Alcista", desc: "El optimismo lleva las acciones a nuevos maximos historicos." },
    geopolitics: { title: "Crisis Geopolitica", desc: "Las tensiones internacionales escalan. Los mercados buscan refugio." },
    stablePeriod: { title: "Periodo de Estabilidad", desc: "La economia crece de forma estable. Baja volatilidad, ganancias constantes." },
  },

  // Hub screen
  hub: {
    greeting: "Bienvenido de vuelta",
    guest: "Invitado",
    subtitle: "Elige tu aventura",
    portfolio: {
      title: "Mi Nido",
      desc: "Construye y simula tu nido de inversiones",
    },
    multiplayer: {
      title: "Multiplayer",
      desc: "Compite con amigos en tiempo real",
    },
    map: {
      title: "Mapa",
      desc: "Próximamente",
    },
    multiplayerSteps: [
      { title: "Crea o Unete", description: "Crea una sala e invita amigos con un codigo o QR. Hasta 4 jugadores pueden competir." },
      { title: "Elige tus activos", description: "Cada jugador elige hasta 5 categorias de activos. Tu dinero se reparte equitativamente." },
      { title: "Sobrevive al mercado", description: "Mira 10 anos de mercado con eventos reales. Manten o vende - el mejor portafolio gana!" },
    ],
    next: "Siguiente",
    letsPlay: "A jugar!",
    footer: "HELVE - Aprende a invertir jugando",
  },

  // Common
  common: {
    loading: "Cargando...",
    perYear: "/ano",
    notFound: {
      title: "404",
      message: "Ups! Pagina no encontrada",
      backHome: "Volver al inicio",
    },
  },
};

export default es;
