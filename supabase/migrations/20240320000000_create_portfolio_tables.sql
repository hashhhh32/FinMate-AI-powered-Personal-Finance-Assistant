-- Create user_portfolios table
CREATE TABLE IF NOT EXISTS user_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    symbol TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    average_price DECIMAL NOT NULL,
    current_price DECIMAL,
    total_market_value DECIMAL,
    total_cost_basis DECIMAL NOT NULL,
    unrealized_pl DECIMAL,
    unrealized_plpc DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON user_portfolios(user_id);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_user_portfolio(UUID, TEXT, DECIMAL, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS get_user_portfolio_summary(UUID);
DROP FUNCTION IF EXISTS update_portfolio_prices();

-- Function to update portfolio after a trade
CREATE OR REPLACE FUNCTION update_user_portfolio(
    p_user_id UUID,
    p_symbol TEXT,
    p_quantity DECIMAL,
    p_price DECIMAL,
    p_order_type TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO user_portfolios (user_id, symbol, quantity, average_price, total_cost_basis)
    VALUES (p_user_id, p_symbol, p_quantity, p_price, p_quantity * p_price)
    ON CONFLICT (user_id, symbol) DO UPDATE
    SET 
        quantity = CASE 
            WHEN p_order_type = 'buy' THEN user_portfolios.quantity + p_quantity
            ELSE user_portfolios.quantity - p_quantity
        END,
        average_price = CASE 
            WHEN p_order_type = 'buy' THEN 
                (user_portfolios.total_cost_basis + (p_quantity * p_price)) / 
                (user_portfolios.quantity + p_quantity)
            ELSE user_portfolios.average_price
        END,
        total_cost_basis = CASE 
            WHEN p_order_type = 'buy' THEN user_portfolios.total_cost_basis + (p_quantity * p_price)
            ELSE user_portfolios.total_cost_basis - (p_quantity * p_price)
        END,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get portfolio summary
CREATE OR REPLACE FUNCTION get_user_portfolio_summary(p_user_id UUID)
RETURNS TABLE (
    symbol TEXT,
    quantity DECIMAL,
    average_price DECIMAL,
    current_price DECIMAL,
    total_market_value DECIMAL,
    total_cost_basis DECIMAL,
    unrealized_pl DECIMAL,
    unrealized_plpc DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.symbol,
        up.quantity,
        up.average_price,
        up.current_price,
        up.total_market_value,
        up.total_cost_basis,
        up.unrealized_pl,
        up.unrealized_plpc,
        up.last_updated
    FROM user_portfolios up
    WHERE up.user_id = p_user_id
    AND up.quantity > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to update current prices and calculate P/L
CREATE OR REPLACE FUNCTION update_portfolio_prices()
RETURNS void AS $$
BEGIN
    UPDATE user_portfolios up
    SET 
        total_market_value = up.quantity * up.current_price,
        unrealized_pl = (up.quantity * up.current_price) - up.total_cost_basis,
        unrealized_plpc = CASE 
            WHEN up.total_cost_basis > 0 THEN 
                ((up.quantity * up.current_price) - up.total_cost_basis) / up.total_cost_basis * 100
            ELSE 0
        END,
        last_updated = NOW()
    WHERE up.current_price IS NOT NULL;
END;
$$ LANGUAGE plpgsql; 