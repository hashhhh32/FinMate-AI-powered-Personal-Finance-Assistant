
-- Create table for storing trading conversations
CREATE TABLE IF NOT EXISTS public.trading_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing trading orders
CREATE TABLE IF NOT EXISTS public.trading_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  order_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC,
  order_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing portfolio summaries
CREATE TABLE IF NOT EXISTS public.trading_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  equity NUMERIC NOT NULL,
  cash NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing portfolio positions
CREATE TABLE IF NOT EXISTS public.trading_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  market_value NUMERIC NOT NULL,
  cost_basis NUMERIC NOT NULL,
  unrealized_pl NUMERIC NOT NULL,
  unrealized_plpc NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Add RLS policies for trading_conversations
ALTER TABLE public.trading_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.trading_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.trading_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for trading_orders
ALTER TABLE public.trading_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.trading_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON public.trading_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for trading_portfolios
ALTER TABLE public.trading_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolio"
  ON public.trading_portfolios
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio"
  ON public.trading_portfolios
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio"
  ON public.trading_portfolios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for trading_positions
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own positions"
  ON public.trading_positions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions"
  ON public.trading_positions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own positions"
  ON public.trading_positions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for trading tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_portfolios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_positions;
