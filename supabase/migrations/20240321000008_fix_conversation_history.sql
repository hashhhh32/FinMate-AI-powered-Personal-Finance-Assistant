-- First, check if the conversation_history table exists
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add the role column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'conversation_history' 
                  AND column_name = 'role') THEN
        ALTER TABLE conversation_history 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'assistant'
        CHECK (role IN ('user', 'assistant'));
    END IF;
END $$;

-- Enable RLS on conversation_history if not already enabled
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversation_history;
CREATE POLICY "Users can view their own conversations"
    ON conversation_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversation_history;
CREATE POLICY "Users can insert their own conversations"
    ON conversation_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update the initialize_user_portfolio function
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
        cash
    )
    VALUES (
        p_user_id,
        0,  -- Initial equity
        100000  -- Initial cash balance ($100,000)
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

-- Initialize portfolios for all existing users
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
    cash
)
SELECT 
    user_id,
    0,  -- Initial equity
    100000  -- Initial cash balance ($100,000)
FROM users_without_portfolios;

-- Initialize conversation history for all existing users
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