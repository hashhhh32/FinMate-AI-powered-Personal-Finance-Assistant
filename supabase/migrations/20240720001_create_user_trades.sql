-- Create user portfolios table
CREATE TABLE IF NOT EXISTS user_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    average_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    total_market_value DECIMAL(10,2),
    total_cost_basis DECIMAL(10,2),
    unrealized_pl DECIMAL(10,2),
    unrealized_plpc DECIMAL(5,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON user_portfolios(user_id);

-- Create function to update portfolio after trade
CREATE OR REPLACE FUNCTION update_user_portfolio(
    p_user_id UUID,
    p_symbol TEXT,
    p_quantity INTEGER,
    p_price DECIMAL(10,2),
    p_order_type TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO user_portfolios (
        user_id,
        symbol,
        quantity,
        average_price,
        current_price,
        total_market_value,
        total_cost_basis,
        unrealized_pl,
        unrealized_plpc
    )
    VALUES (
        p_user_id,
        p_symbol,
        p_quantity,
        p_price,
        p_price,
        p_quantity * p_price,
        p_quantity * p_price,
        0,
        0
    )
    ON CONFLICT (user_id, symbol) DO UPDATE
    SET
        quantity = CASE 
            WHEN p_order_type = 'buy' THEN user_portfolios.quantity + p_quantity
            ELSE user_portfolios.quantity - p_quantity
        END,
        average_price = CASE 
            WHEN p_order_type = 'buy' THEN 
                (user_portfolios.average_price * user_portfolios.quantity + p_price * p_quantity) / 
                (user_portfolios.quantity + p_quantity)
            ELSE user_portfolios.average_price
        END,
        current_price = p_price,
        total_market_value = CASE 
            WHEN p_order_type = 'buy' THEN (user_portfolios.quantity + p_quantity) * p_price
            ELSE (user_portfolios.quantity - p_quantity) * p_price
        END,
        total_cost_basis = CASE 
            WHEN p_order_type = 'buy' THEN 
                (user_portfolios.average_price * user_portfolios.quantity + p_price * p_quantity)
            ELSE 
                user_portfolios.average_price * (user_portfolios.quantity - p_quantity)
        END,
        unrealized_pl = CASE 
            WHEN p_order_type = 'buy' THEN 
                (user_portfolios.quantity + p_quantity) * (p_price - user_portfolios.average_price)
            ELSE 
                (user_portfolios.quantity - p_quantity) * (p_price - user_portfolios.average_price)
        END,
        unrealized_plpc = CASE 
            WHEN p_order_type = 'buy' THEN 
                ((p_price - user_portfolios.average_price) / user_portfolios.average_price) * 100
            ELSE 
                ((p_price - user_portfolios.average_price) / user_portfolios.average_price) * 100
        END,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get user portfolio summary
CREATE OR REPLACE FUNCTION get_user_portfolio_summary(p_user_id UUID)
RETURNS TABLE (
    symbol TEXT,
    total_quantity INTEGER,
    average_buy_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    total_market_value DECIMAL(10,2),
    total_cost_basis DECIMAL(10,2),
    unrealized_pl DECIMAL(10,2),
    unrealized_plpc DECIMAL(5,2),
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.symbol,
        up.quantity as total_quantity,
        up.average_price as average_buy_price,
        up.current_price,
        up.total_market_value,
        up.total_cost_basis,
        up.unrealized_pl,
        up.unrealized_plpc,
        up.last_updated
    FROM user_portfolios up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql; 