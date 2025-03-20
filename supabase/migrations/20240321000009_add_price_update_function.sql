-- Create function to update stock prices for a user's positions
CREATE OR REPLACE FUNCTION update_stock_prices_for_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all positions for the user
    FOR r IN 
        SELECT symbol, quantity, cost_basis
        FROM trading_positions
        WHERE user_id = p_user_id
    LOOP
        -- Update position with new price and calculations
        UPDATE trading_positions
        SET 
            current_price = COALESCE(
                (SELECT price FROM stock_prices WHERE symbol = r.symbol ORDER BY timestamp DESC LIMIT 1),
                current_price,
                r.cost_basis / NULLIF(r.quantity, 0)
            ),
            market_value = r.quantity * COALESCE(
                (SELECT price FROM stock_prices WHERE symbol = r.symbol ORDER BY timestamp DESC LIMIT 1),
                current_price,
                r.cost_basis / NULLIF(r.quantity, 0)
            ),
            unrealized_pl = (
                r.quantity * COALESCE(
                    (SELECT price FROM stock_prices WHERE symbol = r.symbol ORDER BY timestamp DESC LIMIT 1),
                    current_price,
                    r.cost_basis / NULLIF(r.quantity, 0)
                )
            ) - r.cost_basis,
            unrealized_plpc = CASE 
                WHEN r.cost_basis > 0 THEN 
                    ((r.quantity * COALESCE(
                        (SELECT price FROM stock_prices WHERE symbol = r.symbol ORDER BY timestamp DESC LIMIT 1),
                        current_price,
                        r.cost_basis / NULLIF(r.quantity, 0)
                    )) - r.cost_basis) / r.cost_basis * 100
                ELSE 0
            END,
            updated_at = NOW()
        WHERE 
            user_id = p_user_id 
            AND symbol = r.symbol;
    END LOOP;

    -- Update portfolio totals
    UPDATE trading_portfolios
    SET 
        equity = (
            SELECT COALESCE(SUM(market_value), 0)
            FROM trading_positions
            WHERE user_id = p_user_id
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_stock_prices_for_user(UUID) TO authenticated; 