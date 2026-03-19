import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// CSV source URLs (raw GitHub)
const CSV_SOURCES = {
  bonds:
    "https://raw.githubusercontent.com/adriank71/PostFinance-START-Hack-2026/main/Market_Data%20-%20Bonds.csv",
  equity:
    "https://raw.githubusercontent.com/adriank71/PostFinance-START-Hack-2026/main/Market_Data%20-%20Equity%20Indices.csv",
  gold: "https://raw.githubusercontent.com/adriank71/PostFinance-START-Hack-2026/main/Market_Data%20-%20Gold.csv",
  fx: "https://raw.githubusercontent.com/adriank71/PostFinance-START-Hack-2026/main/Market_Data%20-%20FX.csv",
  smi_stocks:
    "https://raw.githubusercontent.com/adriank71/PostFinance-START-Hack-2026/main/Market_Data%20-%20SMI_Single%20Stocks.csv",
  djia_stocks:
    "https://raw.githubusercontent.com/adriank71/PostFinance-START-Hack-2026/main/Market_Data%20-%20DJIA_Single%20Stocks.csv",
};

function parseDate(d: string): string | null {
  // Format: d/m/yyyy → yyyy-mm-dd
  const parts = d.trim().split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseNum(v: string): number | null {
  if (!v || v.trim() === "" || v.includes("#N/A")) return null;
  // Remove quotes, spaces, thousands commas
  const clean = v.replace(/"/g, "").replace(/\s/g, "").replace(/,/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// Parse a standard CSV line handling quoted fields with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

interface InstrumentDef {
  id: string;
  name: string;
  ticker: string;
  category: string;
  currency: string;
}

interface PriceRow {
  instrument_id: string;
  date: string;
  price: number;
}

async function fetchCSV(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function processBonds(csv: string): {
  instruments: InstrumentDef[];
  prices: PriceRow[];
} {
  const lines = csv.split("\n").filter((l) => l.trim());
  const instruments: InstrumentDef[] = [
    {
      id: "ch-bond-aaa",
      name: "Swiss Bond AAA-BBB",
      ticker: "CH-BOND-AAA",
      category: "bond",
      currency: "CHF",
    },
    {
      id: "global-bond-agg",
      name: "Bloomberg Global Aggregate Bond Index",
      ticker: "LEGATRUHCHF",
      category: "bond",
      currency: "CHF",
    },
    {
      id: "ch-govt-10y",
      name: "Switzerland Government Bond 10Y Yield",
      ticker: "CH-10Y",
      category: "bond",
      currency: "CHF",
    },
  ];
  const prices: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const date = parseDate(cols[0]);
    if (!date) continue;
    const vals = [
      { id: "ch-bond-aaa", val: parseNum(cols[1]) },
      { id: "global-bond-agg", val: parseNum(cols[2]) },
      { id: "ch-govt-10y", val: parseNum(cols[3]) },
    ];
    for (const v of vals) {
      if (v.val !== null)
        prices.push({ instrument_id: v.id, date, price: v.val });
    }
  }
  return { instruments, prices };
}

function processEquity(csv: string): {
  instruments: InstrumentDef[];
  prices: PriceRow[];
} {
  const lines = csv.split("\n").filter((l) => l.trim());
  const instruments: InstrumentDef[] = [
    { id: "smi-index", name: "SMI (Price Return)", ticker: "SMI", category: "equity_index", currency: "CHF" },
    { id: "eurostoxx50", name: "EuroStoxx 50 (Price Return)", ticker: "SX5E", category: "equity_index", currency: "EUR" },
    { id: "djia-index", name: "Dow Jones Industrial Average", ticker: "DJI", category: "equity_index", currency: "USD" },
    { id: "nikkei225", name: "Nikkei 225 (Price Return)", ticker: "NKY", category: "equity_index", currency: "JPY" },
    { id: "dax-index", name: "DAX (Total Return)", ticker: "DAX", category: "equity_index", currency: "EUR" },
  ];
  const prices: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const date = parseDate(cols[0]);
    if (!date) continue;
    const vals = [
      { id: "smi-index", val: parseNum(cols[1]) },
      { id: "eurostoxx50", val: parseNum(cols[2]) },
      { id: "djia-index", val: parseNum(cols[3]) },
      { id: "nikkei225", val: parseNum(cols[4]) },
      { id: "dax-index", val: parseNum(cols[5]) },
    ];
    for (const v of vals) {
      if (v.val !== null) prices.push({ instrument_id: v.id, date, price: v.val });
    }
  }
  return { instruments, prices };
}

function processGold(csv: string): {
  instruments: InstrumentDef[];
  prices: PriceRow[];
} {
  const lines = csv.split("\n").filter((l) => l.trim());
  const instruments: InstrumentDef[] = [
    { id: "gold-usd", name: "Gold (NY) USD", ticker: "XAU-USD", category: "gold", currency: "USD" },
    { id: "gold-chf", name: "Gold (NY) CHF", ticker: "XAU-CHF", category: "gold", currency: "CHF" },
  ];
  const prices: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const date = parseDate(cols[0]);
    if (!date) continue;
    const vals = [
      { id: "gold-usd", val: parseNum(cols[1]) },
      { id: "gold-chf", val: parseNum(cols[2]) },
    ];
    for (const v of vals) {
      if (v.val !== null) prices.push({ instrument_id: v.id, date, price: v.val });
    }
  }
  return { instruments, prices };
}

function processFX(csv: string): {
  instruments: InstrumentDef[];
  prices: PriceRow[];
} {
  const lines = csv.split("\n").filter((l) => l.trim());
  const instruments: InstrumentDef[] = [
    { id: "usdchf", name: "USD/CHF", ticker: "USDCHF", category: "fx", currency: "CHF" },
    { id: "eurchf", name: "EUR/CHF", ticker: "EURCHF", category: "fx", currency: "CHF" },
  ];
  const prices: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const date = parseDate(cols[0]);
    if (!date) continue;
    const vals = [
      { id: "usdchf", val: parseNum(cols[1]) },
      { id: "eurchf", val: parseNum(cols[2]) },
    ];
    for (const v of vals) {
      if (v.val !== null) prices.push({ instrument_id: v.id, date, price: v.val });
    }
  }
  return { instruments, prices };
}

function processStocks(
  csv: string,
  category: "stock_smi" | "stock_djia"
): { instruments: InstrumentDef[]; prices: PriceRow[] } {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return { instruments: [], prices: [] };

  const companyNames = parseCSVLine(lines[0]).slice(1);
  const tickers = parseCSVLine(lines[1]).slice(1);

  const instruments: InstrumentDef[] = [];
  for (let c = 0; c < companyNames.length; c++) {
    const ticker = tickers[c]?.trim();
    if (!ticker) continue;
    const id = ticker.toLowerCase().replace(/[^a-z0-9]/g, "-");
    instruments.push({
      id,
      name: companyNames[c].trim(),
      ticker,
      category,
      currency: category === "stock_smi" ? "CHF" : "USD",
    });
  }

  const prices: PriceRow[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const date = parseDate(cols[0]);
    if (!date) continue;
    for (let c = 0; c < instruments.length; c++) {
      const val = parseNum(cols[c + 1]);
      if (val !== null) {
        prices.push({ instrument_id: instruments[c].id, date, price: val });
      }
    }
  }
  return { instruments, prices };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const allInstruments: InstrumentDef[] = [];
    const allPrices: PriceRow[] = [];
    const log: string[] = [];

    // Fetch and process all CSVs
    log.push("Fetching CSVs...");

    const [bondsCSV, equityCSV, goldCSV, fxCSV, smiCSV, djiaCSV] =
      await Promise.all([
        fetchCSV(CSV_SOURCES.bonds),
        fetchCSV(CSV_SOURCES.equity),
        fetchCSV(CSV_SOURCES.gold),
        fetchCSV(CSV_SOURCES.fx),
        fetchCSV(CSV_SOURCES.smi_stocks),
        fetchCSV(CSV_SOURCES.djia_stocks),
      ]);

    log.push("Parsing CSVs...");

    const datasets = [
      processBonds(bondsCSV),
      processEquity(equityCSV),
      processGold(goldCSV),
      processFX(fxCSV),
      processStocks(smiCSV, "stock_smi"),
      processStocks(djiaCSV, "stock_djia"),
    ];

    for (const ds of datasets) {
      allInstruments.push(...ds.instruments);
      allPrices.push(...ds.prices);
    }

    log.push(
      `Parsed ${allInstruments.length} instruments, ${allPrices.length} price points`
    );

    // Upsert instruments
    const { error: instErr } = await supabase
      .from("instruments")
      .upsert(
        allInstruments.map((i) => ({
          id: i.id,
          name: i.name,
          ticker: i.ticker,
          category: i.category,
          currency: i.currency,
          source_csv: "PostFinance-START-Hack-2026",
        })),
        { onConflict: "id" }
      );

    if (instErr) throw new Error(`Instruments upsert error: ${instErr.message}`);
    log.push(`Upserted ${allInstruments.length} instruments`);

    // Insert prices in batches of 1000
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < allPrices.length; i += BATCH) {
      const batch = allPrices.slice(i, i + BATCH);
      const { error: priceErr } = await supabase
        .from("market_prices")
        .upsert(batch, { onConflict: "instrument_id,date", ignoreDuplicates: true });

      if (priceErr)
        throw new Error(
          `Prices batch ${i / BATCH} error: ${priceErr.message}`
        );
      inserted += batch.length;
    }
    log.push(`Inserted ${inserted} price rows`);

    return new Response(
      JSON.stringify({
        success: true,
        instruments: allInstruments.length,
        prices: inserted,
        log,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
