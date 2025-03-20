-- Add timestamp columns to trading_portfolios if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'trading_portfolios' 
                  AND column_name = 'created_at') THEN
        ALTER TABLE trading_portfolios 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'trading_portfolios' 
                  AND column_name = 'updated_at') THEN
        ALTER TABLE trading_portfolios 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update the initialize_user_portfolio function
CREATE OR REPLACE FUNCTION initialize_user_portfolio(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Create initial portfolio if it doesn't exist
    INSERT INTO trading_portfolios (
        user_id,
        equity,
        cash
    )
    VALUES (
        p_user_id,
        0,  -- Initial equity
        100000  -- Initial cash balance ($100,000)
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create initial conversation
    INSERT INTO conversation_history (
        user_id,
        role,
        content,
        timestamp
    )
    VALUES (
        p_user_id,
        'assistant',
        'Hello! I''m your trading assistant. I can help you trade stocks, check prices, and manage your portfolio. You start with $100,000 in cash. Try commands like "Buy 5 shares of AAPL" or "What''s the price of TSLA?"',
        NOW()
    )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 