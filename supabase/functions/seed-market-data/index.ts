import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CSV_SOURCES: Record<string, string> = {
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
  const parts = d.trim().split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!year || year.length !== 4) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseNum(v: string): number | null {
  if (!v || v.includes("#N/A")) return null;
  const clean = v.replace(/"/g, "").replace(/\s/g, "").replace(/,/g, "");
  if (clean === "") return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

interface Inst { id: string; name: string; ticker: string; category: string; currency: string; }
interface PRow { instrument_id: string; date: string; price: number; }

function processSimpleCSV(
  csv: string,
  columns: { id: string; name: string; ticker: string; category: string; currency: string }[]
): { instruments: Inst[]; prices: PRow[] } {
  const lines = csv.split("\n");
  const prices: PRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line);
    const date = parseDate(cols[0]);
    if (!date) continue;
    for (let c = 0; c < columns.length; c++) {
      const val = parseNum(cols[c + 1]);
      if (val !== null) prices.push({ instrument_id: columns[c].id, date, price: val });
    }
  }
  return { instruments: columns, prices };
}

function processStocksCSV(
  csv: string,
  category: string
): { instruments: Inst[]; prices: PRow[] } {
  const lines = csv.split("\n");
  const names = splitCSVLine(lines[0]).slice(1);
  const tickers = splitCSVLine(lines[1]).slice(1);
  const instruments: Inst[] = [];
  for (let c = 0; c < names.length; c++) {
    const t = tickers[c]?.trim();
    if (!t) continue;
    instruments.push({
      id: t.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: names[c].trim(),
      ticker: t,
      category,
      currency: category === "stock_smi" ? "CHF" : "USD",
    });
  }
  const prices: PRow[] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line);
    const date = parseDate(cols[0]);
    if (!date) continue;
    for (let c = 0; c < instruments.length; c++) {
      const val = parseNum(cols[c + 1]);
      if (val !== null) prices.push({ instrument_id: instruments[c].id, date, price: val });
    }
  }
  return { instruments, prices };
}

const PROCESSORS: Record<string, (csv: string) => { instruments: Inst[]; prices: PRow[] }> = {
  bonds: (csv) => processSimpleCSV(csv, [
    { id: "ch-bond-aaa", name: "Swiss Bond AAA-BBB", ticker: "CH-BOND-AAA", category: "bond", currency: "CHF" },
    { id: "global-bond-agg", name: "Bloomberg Global Aggregate Bond Index", ticker: "LEGATRUHCHF", category: "bond", currency: "CHF" },
    { id: "ch-govt-10y", name: "Switzerland Government Bond 10Y Yield", ticker: "CH-10Y", category: "bond", currency: "CHF" },
  ]),
  equity: (csv) => processSimpleCSV(csv, [
    { id: "smi-index", name: "SMI (Price Return)", ticker: "SMI", category: "equity_index", currency: "CHF" },
    { id: "eurostoxx50", name: "EuroStoxx 50", ticker: "SX5E", category: "equity_index", currency: "EUR" },
    { id: "djia-index", name: "Dow Jones Industrial Average", ticker: "DJI", category: "equity_index", currency: "USD" },
    { id: "nikkei225", name: "Nikkei 225", ticker: "NKY", category: "equity_index", currency: "JPY" },
    { id: "dax-index", name: "DAX (Total Return)", ticker: "DAX", category: "equity_index", currency: "EUR" },
  ]),
  gold: (csv) => processSimpleCSV(csv, [
    { id: "gold-usd", name: "Gold (NY) USD", ticker: "XAU-USD", category: "gold", currency: "USD" },
    { id: "gold-chf", name: "Gold (NY) CHF", ticker: "XAU-CHF", category: "gold", currency: "CHF" },
  ]),
  fx: (csv) => processSimpleCSV(csv, [
    { id: "usdchf", name: "USD/CHF", ticker: "USDCHF", category: "fx", currency: "CHF" },
    { id: "eurchf", name: "EUR/CHF", ticker: "EURCHF", category: "fx", currency: "CHF" },
  ]),
  smi_stocks: (csv) => processStocksCSV(csv, "stock_smi"),
  djia_stocks: (csv) => processStocksCSV(csv, "stock_djia"),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dataset = url.searchParams.get("dataset");

    if (!dataset || !CSV_SOURCES[dataset]) {
      return new Response(
        JSON.stringify({
          error: "Pass ?dataset= one of: " + Object.keys(CSV_SOURCES).join(", "),
          available: Object.keys(CSV_SOURCES),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log(`Fetching ${dataset}...`);
    const csvText = await (await fetch(CSV_SOURCES[dataset])).text();
    console.log(`Fetched ${csvText.length} chars`);

    const { instruments, prices } = PROCESSORS[dataset](csvText);
    console.log(`Parsed ${instruments.length} instruments, ${prices.length} prices`);

    // Upsert instruments
    const { error: ie } = await supabase
      .from("instruments")
      .upsert(instruments.map((i) => ({ ...i, source_csv: dataset })), { onConflict: "id" });
    if (ie) throw new Error(`Instruments error: ${ie.message}`);

    // Insert prices in batches
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < prices.length; i += BATCH) {
      const batch = prices.slice(i, i + BATCH);
      const { error: pe } = await supabase
        .from("market_prices")
        .upsert(batch, { onConflict: "instrument_id,date", ignoreDuplicates: true });
      if (pe) throw new Error(`Prices batch ${Math.floor(i / BATCH)} error: ${pe.message}`);
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / BATCH)}, total: ${inserted}/${prices.length}`);
    }

    return new Response(
      JSON.stringify({ success: true, dataset, instruments: instruments.length, prices: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
