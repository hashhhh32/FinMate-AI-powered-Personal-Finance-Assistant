-- Create conversation_history table
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on conversation_history
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_history
CREATE POLICY "Users can view their own conversations"
    ON conversation_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON conversation_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to get recent conversations
CREATE OR REPLACE FUNCTION get_recent_conversations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    role TEXT,
    content TEXT,
    timestamp TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.role,
        ch.content,
        ch.timestamp,
        ch.metadata
    FROM conversation_history ch
    WHERE ch.user_id = p_user_id
    ORDER BY ch.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store conversation
CREATE OR REPLACE FUNCTION store_conversation(
    p_user_id UUID,
    p_role TEXT,
    p_content TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    INSERT INTO conversation_history (
        user_id,
        role,
        content,
        metadata
    ) VALUES (
        p_user_id,
        p_role,
        p_content,
        p_metadata
    )
    RETURNING id INTO v_conversation_id;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear conversation history
CREATE OR REPLACE FUNCTION clear_conversation_history(
    p_user_id UUID
) RETURNS void AS $$
BEGIN
    DELETE FROM conversation_history
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 