-- Function to initialize user's portfolio and trading data
CREATE OR REPLACE FUNCTION initialize_user_portfolio(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Create initial portfolio if it doesn't exist
    INSERT INTO trading_portfolios (
        user_id,
        equity,
        cash,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        0,  -- Initial equity
        100000,  -- Initial cash balance ($100,000)
        NOW(),
        NOW()
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

-- Create a trigger to automatically initialize portfolio for new users
CREATE OR REPLACE FUNCTION auto_initialize_user_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_portfolio(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_auto_initialize_user_portfolio ON auth.users;

-- Create trigger
CREATE TRIGGER tr_auto_initialize_user_portfolio
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_initialize_user_portfolio();