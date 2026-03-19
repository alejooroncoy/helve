
-- Instruments table: metadata for each financial instrument
CREATE TABLE public.instruments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ticker TEXT,
  category TEXT NOT NULL, -- 'bond', 'equity_index', 'gold', 'fx', 'stock_smi', 'stock_djia'
  currency TEXT DEFAULT 'CHF',
  source_csv TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Market prices: daily prices for each instrument
CREATE TABLE public.market_prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id TEXT NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  UNIQUE(instrument_id, date)
);

-- Index for fast queries by instrument and date range
CREATE INDEX idx_market_prices_instrument_date ON public.market_prices(instrument_id, date);

-- Enable RLS but allow public read (this is market data, not user data)
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

-- Public read access for market data
CREATE POLICY "Anyone can read instruments" ON public.instruments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read market prices" ON public.market_prices FOR SELECT TO anon, authenticated USING (true);

-- Only service role can insert/update (for seeding via edge function)
CREATE POLICY "Service role can manage instruments" ON public.instruments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage market prices" ON public.market_prices FOR ALL TO service_role USING (true) WITH CHECK (true);
