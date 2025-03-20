-- Function to update stock prices and portfolio values
CREATE OR REPLACE FUNCTION update_stock_prices(
    p_symbol TEXT,
    p_price NUMERIC
) RETURNS void AS $$
BEGIN
    -- Update positions with new price
    UPDATE trading_positions
    SET market_value = quantity * p_price,
        unrealized_pl = (quantity * p_price) - (quantity * cost_basis),
        unrealized_plpc = (((quantity * p_price) - (quantity * cost_basis)) / (quantity * cost_basis)) * 100,
        updated_at = NOW()
    WHERE symbol = p_symbol;

    -- Update portfolio equity values
    UPDATE trading_portfolios p
    SET equity = (
        SELECT COALESCE(SUM(market_value), 0)
        FROM trading_positions
        WHERE user_id = p.user_id
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get symbols that need price updates
CREATE OR REPLACE FUNCTION get_symbols_for_price_update()
RETURNS TABLE (symbol TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT tp.symbol
    FROM trading_positions tp
    WHERE tp.updated_at < NOW() - INTERVAL '1 minute'
    OR tp.market_value = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update portfolio values after position updates
CREATE OR REPLACE FUNCTION update_portfolio_after_position_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update portfolio equity
    UPDATE trading_portfolios
    SET equity = (
        SELECT COALESCE(SUM(market_value), 0)
        FROM trading_positions
        WHERE user_id = NEW.user_id
    ),
    updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for position changes
DROP TRIGGER IF EXISTS trigger_update_portfolio_after_position_change ON trading_positions;
CREATE TRIGGER trigger_update_portfolio_after_position_change
    AFTER INSERT OR UPDATE OR DELETE ON trading_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_after_position_change(); 