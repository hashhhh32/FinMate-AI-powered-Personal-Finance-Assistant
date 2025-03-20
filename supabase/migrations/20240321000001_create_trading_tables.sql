-- Create trading_history table
CREATE TABLE IF NOT EXISTS trading_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trading_portfolios table
CREATE TABLE IF NOT EXISTS trading_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    equity NUMERIC NOT NULL DEFAULT 0,
    cash NUMERIC NOT NULL DEFAULT 100000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trading_positions table
CREATE TABLE IF NOT EXISTS trading_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    cost_basis NUMERIC NOT NULL DEFAULT 0,
    market_value NUMERIC NOT NULL DEFAULT 0,
    unrealized_pl NUMERIC NOT NULL DEFAULT 0,
    unrealized_plpc NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Enable Row Level Security
ALTER TABLE trading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own trading history"
    ON trading_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
    ON trading_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own portfolio"
    ON trading_portfolios FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio"
    ON trading_portfolios FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own positions"
    ON trading_positions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions"
    ON trading_positions FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to update user portfolio
CREATE OR REPLACE FUNCTION update_user_portfolio(
    p_user_id UUID,
    p_symbol TEXT,
    p_quantity NUMERIC,
    p_price NUMERIC,
    p_order_type TEXT
) RETURNS void AS $$
DECLARE
    v_current_position trading_positions%ROWTYPE;
    v_portfolio trading_portfolios%ROWTYPE;
    v_new_quantity NUMERIC;
    v_new_cost_basis NUMERIC;
    v_market_value NUMERIC;
BEGIN
    -- Get current position
    SELECT * INTO v_current_position
    FROM trading_positions
    WHERE user_id = p_user_id AND symbol = p_symbol;

    -- Get portfolio
    SELECT * INTO v_portfolio
    FROM trading_portfolios
    WHERE user_id = p_user_id;

    -- Create portfolio if it doesn't exist
    IF v_portfolio IS NULL THEN
        INSERT INTO trading_portfolios (user_id)
        VALUES (p_user_id)
        RETURNING * INTO v_portfolio;
    END IF;

    -- Calculate new position
    IF v_current_position IS NULL THEN
        -- New position
        IF p_order_type = 'buy' THEN
            INSERT INTO trading_positions (
                user_id,
                symbol,
                quantity,
                cost_basis,
                market_value,
                unrealized_pl,
                unrealized_plpc
            ) VALUES (
                p_user_id,
                p_symbol,
                p_quantity,
                p_price,
                p_quantity * p_price,
                0,
                0
            );
        END IF;
    ELSE
        -- Update existing position
        IF p_order_type = 'buy' THEN
            v_new_quantity := v_current_position.quantity + p_quantity;
            v_new_cost_basis := (v_current_position.cost_basis * v_current_position.quantity + p_price * p_quantity) / v_new_quantity;
        ELSE
            v_new_quantity := v_current_position.quantity - p_quantity;
            v_new_cost_basis := v_current_position.cost_basis;
        END IF;

        v_market_value := v_new_quantity * p_price;

        IF v_new_quantity > 0 THEN
            UPDATE trading_positions
            SET quantity = v_new_quantity,
                cost_basis = v_new_cost_basis,
                market_value = v_market_value,
                unrealized_pl = v_market_value - (v_new_cost_basis * v_new_quantity),
                unrealized_plpc = ((v_market_value - (v_new_cost_basis * v_new_quantity)) / (v_new_cost_basis * v_new_quantity)) * 100,
                updated_at = NOW()
            WHERE user_id = p_user_id AND symbol = p_symbol;
        ELSE
            DELETE FROM trading_positions
            WHERE user_id = p_user_id AND symbol = p_symbol;
        END IF;
    END IF;

    -- Update portfolio
    UPDATE trading_portfolios
    SET cash = CASE
            WHEN p_order_type = 'buy' THEN cash - (p_price * p_quantity)
            ELSE cash + (p_price * p_quantity)
        END,
        equity = (
            SELECT COALESCE(SUM(market_value), 0)
            FROM trading_positions
            WHERE user_id = p_user_id
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 