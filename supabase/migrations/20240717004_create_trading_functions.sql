
-- Create function to get trading portfolio
CREATE OR REPLACE FUNCTION public.get_trading_portfolio(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  equity NUMERIC,
  cash NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.trading_portfolios
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get trading positions
CREATE OR REPLACE FUNCTION public.get_trading_positions(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  symbol TEXT,
  quantity INTEGER,
  market_value NUMERIC,
  cost_basis NUMERIC,
  unrealized_pl NUMERIC,
  unrealized_plpc NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.trading_positions
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get trading orders
CREATE OR REPLACE FUNCTION public.get_trading_orders(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  order_id TEXT,
  symbol TEXT,
  quantity INTEGER,
  price NUMERIC,
  order_type TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.trading_orders
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get trading conversations
CREATE OR REPLACE FUNCTION public.get_trading_conversations(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_message TEXT,
  assistant_response TEXT,
  timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.trading_conversations
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
