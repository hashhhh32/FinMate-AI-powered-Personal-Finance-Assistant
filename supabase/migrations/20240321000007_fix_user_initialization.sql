-- First, let's check if we have any existing users without portfolios
WITH users_without_portfolios AS (
    SELECT id as user_id
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 
        FROM trading_portfolios tp 
        WHERE tp.user_id = u.id
    )
)
INSERT INTO trading_portfolios (
    user_id,
    equity,
    cash,
    created_at,
    updated_at
)
SELECT 
    user_id,
    0,  -- Initial equity
    100000,  -- Initial cash balance ($100,000)
    NOW(),
    NOW()
FROM users_without_portfolios;

-- Initialize conversation history for users without any messages
WITH users_without_conversations AS (
    SELECT id as user_id
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 
        FROM conversation_history ch 
        WHERE ch.user_id = u.id
    )
)
INSERT INTO conversation_history (
    user_id,
    role,
    content,
    timestamp
)
SELECT 
    user_id,
    'assistant',
    'Hello! I''m your trading assistant. I can help you trade stocks, check prices, and manage your portfolio. You start with $100,000 in cash. Try commands like "Buy 5 shares of AAPL" or "What''s the price of TSLA?"',
    NOW()
FROM users_without_conversations;

-- Update the initialize_user_portfolio function to be more robust
CREATE OR REPLACE FUNCTION initialize_user_portfolio(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = p_user_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User does not exist: %', p_user_id;
    END IF;

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

    -- Create initial conversation if it doesn't exist
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

-- Create a function to get your user ID (for testing purposes)
CREATE OR REPLACE FUNCTION get_authenticated_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 