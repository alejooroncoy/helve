
CREATE OR REPLACE FUNCTION public.get_instrument_stats(p_instrument_ids text[])
RETURNS TABLE (
  instrument_id text,
  name text,
  ticker text,
  category text,
  currency text,
  cagr numeric,
  volatility numeric,
  risk_level int,
  total_return numeric,
  latest_price numeric,
  first_price numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  r record;
  v_years numeric;
  v_cagr numeric;
  v_total_return numeric;
  v_volatility numeric;
  v_risk int;
  v_monthly_returns numeric[];
  v_mean numeric;
  v_variance numeric;
  prev_price numeric;
  cur_price numeric;
  i int;
BEGIN
  FOR r IN
    SELECT 
      inst.id,
      inst.name,
      inst.ticker,
      inst.category,
      inst.currency,
      fp.price AS first_price,
      fp.date AS first_date,
      lp.price AS latest_price,
      lp.date AS last_date
    FROM instruments inst
    CROSS JOIN LATERAL (
      SELECT mp.price, mp.date FROM market_prices mp 
      WHERE mp.instrument_id = inst.id ORDER BY mp.date ASC LIMIT 1
    ) fp
    CROSS JOIN LATERAL (
      SELECT mp.price, mp.date FROM market_prices mp 
      WHERE mp.instrument_id = inst.id ORDER BY mp.date DESC LIMIT 1
    ) lp
    WHERE inst.id = ANY(p_instrument_ids)
  LOOP
    -- Compute years
    v_years := EXTRACT(EPOCH FROM (r.last_date - r.first_date)) / (365.25 * 24 * 3600);
    IF v_years < 0.1 THEN v_years := 1; END IF;

    -- CAGR
    IF r.first_price > 0 THEN
      v_cagr := (POWER(r.latest_price / r.first_price, 1.0 / v_years) - 1) * 100;
      v_total_return := ((r.latest_price / r.first_price) - 1) * 100;
    ELSE
      v_cagr := 0;
      v_total_return := 0;
    END IF;

    -- Monthly returns from sampled prices (every ~21 rows)
    v_monthly_returns := ARRAY[]::numeric[];
    prev_price := NULL;
    i := 0;
    FOR cur_price IN
      SELECT sub.price FROM (
        SELECT mp.price, ROW_NUMBER() OVER (ORDER BY mp.date) AS rn
        FROM market_prices mp
        WHERE mp.instrument_id = r.id
        ORDER BY mp.date
      ) sub
      WHERE sub.rn % 21 = 1
    LOOP
      IF prev_price IS NOT NULL AND prev_price > 0 THEN
        v_monthly_returns := array_append(v_monthly_returns, (cur_price / prev_price) - 1);
      END IF;
      prev_price := cur_price;
    END LOOP;

    -- Annualized volatility
    IF array_length(v_monthly_returns, 1) > 2 THEN
      v_mean := (SELECT AVG(x) FROM unnest(v_monthly_returns) AS x);
      v_variance := (SELECT SUM((x - v_mean)^2) / (COUNT(*) - 1) FROM unnest(v_monthly_returns) AS x);
      v_volatility := SQRT(v_variance) * SQRT(12) * 100;
    ELSE
      v_volatility := 15;
    END IF;

    -- Risk level 1-10
    v_risk := CASE
      WHEN v_volatility <= 3 THEN 1
      WHEN v_volatility <= 6 THEN 2
      WHEN v_volatility <= 10 THEN 3
      WHEN v_volatility <= 15 THEN 4
      WHEN v_volatility <= 20 THEN 5
      WHEN v_volatility <= 30 THEN 6
      WHEN v_volatility <= 45 THEN 7
      WHEN v_volatility <= 60 THEN 8
      WHEN v_volatility <= 80 THEN 9
      ELSE 10
    END;

    instrument_id := r.id;
    name := r.name;
    ticker := r.ticker;
    category := r.category;
    currency := r.currency;
    cagr := ROUND(v_cagr, 1);
    volatility := ROUND(v_volatility, 1);
    risk_level := v_risk;
    total_return := ROUND(v_total_return, 1);
    latest_price := ROUND(r.latest_price, 2);
    first_price := ROUND(r.first_price, 2);
    RETURN NEXT;
  END LOOP;
END;
$$;
