-- Drop existing functions first
DROP FUNCTION IF EXISTS update_position_price(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS get_trading_portfolio(UUID);
DROP FUNCTION IF EXISTS get_trading_positions(UUID);

-- Function to get user's portfolio summary
CREATE OR REPLACE FUNCTION get_user_portfolio_summary(p_user_id UUID)
RETURNS TABLE (
    total_equity NUMERIC,
    total_cash NUMERIC,
    total_value NUMERIC,
    total_profit_loss NUMERIC,
    total_profit_loss_percent NUMERIC,
    positions JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH portfolio_summary AS (
        SELECT
            p.equity as total_equity,
            p.cash as total_cash,
            p.equity + p.cash as total_value,
            (SELECT COALESCE(SUM(unrealized_pl), 0) FROM trading_positions WHERE user_id = p_user_id) as total_profit_loss,
            CASE
                WHEN p.equity > 0 THEN
                    ((SELECT COALESCE(SUM(unrealized_pl), 0) FROM trading_positions WHERE user_id = p_user_id) / p.equity) * 100
                ELSE 0
            END as total_profit_loss_percent,
            (
                SELECT COALESCE(json_agg(
                    json_build_object(
                        'symbol', symbol,
                        'quantity', quantity,
                        'cost_basis', cost_basis,
                        'market_value', market_value,
                        'unrealized_pl', unrealized_pl,
                        'unrealized_plpc', unrealized_plpc
                    )
                ), '[]'::json)
                FROM trading_positions
                WHERE user_id = p_user_id
            ) as positions
        FROM trading_portfolios p
        WHERE p.user_id = p_user_id
    )
    SELECT
        COALESCE(total_equity, 0),
        COALESCE(total_cash, 0),
        COALESCE(total_value, 0),
        COALESCE(total_profit_loss, 0),
        COALESCE(total_profit_loss_percent, 0),
        COALESCE(positions, '[]'::json)
    FROM portfolio_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's trading history
CREATE OR REPLACE FUNCTION get_user_trading_history(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    symbol TEXT,
    quantity NUMERIC,
    price NUMERIC,
    order_type TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        th.id,
        th.symbol,
        th.quantity,
        th.price,
        th.order_type,
        th.status,
        th.created_at
    FROM trading_history th
    WHERE th.user_id = p_user_id
    ORDER BY th.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a sell order would result in a wash sale
CREATE OR REPLACE FUNCTION check_wash_sale(
    p_user_id UUID,
    p_symbol TEXT,
    p_quantity NUMERIC
) RETURNS TABLE (
    is_wash_sale BOOLEAN,
    buy_date TIMESTAMPTZ,
    buy_price NUMERIC,
    potential_loss NUMERIC
) AS $$
DECLARE
    v_recent_buy RECORD;
    v_current_price NUMERIC;
BEGIN
    -- Get most recent buy within 30 days
    SELECT *
    INTO v_recent_buy
    FROM trading_history
    WHERE user_id = p_user_id
        AND symbol = p_symbol
        AND order_type = 'buy'
        AND created_at >= NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get current position's market value per share
    SELECT market_value / NULLIF(quantity, 0)
    INTO v_current_price
    FROM trading_positions
    WHERE user_id = p_user_id AND symbol = p_symbol;

    RETURN QUERY
    SELECT
        v_recent_buy IS NOT NULL,
        v_recent_buy.created_at,
        v_recent_buy.price,
        CASE
            WHEN v_recent_buy IS NOT NULL AND v_current_price IS NOT NULL THEN
                (v_current_price - v_recent_buy.price) * LEAST(p_quantity, v_recent_buy.quantity)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update position price and recalculate P/L
CREATE OR REPLACE FUNCTION update_position_price(
  p_user_id UUID,
  p_symbol TEXT,
  p_current_price NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Update position with new price and recalculate P/L
  UPDATE trading_positions
  SET 
    market_value = quantity * p_current_price,
    unrealized_pl = (quantity * p_current_price) - (quantity * cost_basis),
    unrealized_plpc = ((quantity * p_current_price) - (quantity * cost_basis)) / (quantity * cost_basis) * 100,
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND symbol = p_symbol;

  -- Update portfolio summary
  UPDATE trading_portfolios tp
  SET 
    equity = (
      SELECT COALESCE(SUM(market_value), 0)
      FROM trading_positions
      WHERE user_id = p_user_id
    ),
    updated_at = NOW()
  WHERE 
    tp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trading portfolio summary
CREATE OR REPLACE FUNCTION get_trading_portfolio(user_id_param UUID)
RETURNS TABLE (
  equity NUMERIC,
  cash NUMERIC,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.equity,
    p.cash,
    p.updated_at
  FROM trading_portfolios p
  WHERE p.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trading positions
CREATE OR REPLACE FUNCTION get_trading_positions(user_id_param UUID)
RETURNS TABLE (
  symbol TEXT,
  quantity INTEGER,
  cost_basis NUMERIC,
  market_value NUMERIC,
  unrealized_pl NUMERIC,
  unrealized_plpc NUMERIC,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.symbol,
    p.quantity,
    p.cost_basis,
    p.market_value,
    p.unrealized_pl,
    p.unrealized_plpc,
    p.updated_at
  FROM trading_positions p
  WHERE p.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 