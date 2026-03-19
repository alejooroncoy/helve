
-- Table for multiple portfolios ("nests") per user, max 4
CREATE TABLE public.user_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Nest',
  portfolio jsonb NOT NULL DEFAULT '[]'::jsonb,
  allocations jsonb NOT NULL DEFAULT '{}'::jsonb,
  balance numeric NOT NULL DEFAULT 1000,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portfolios"
  ON public.user_portfolios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios"
  ON public.user_portfolios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
  ON public.user_portfolios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
  ON public.user_portfolios FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
