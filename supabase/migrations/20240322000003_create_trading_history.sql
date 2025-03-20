-- Create trading_history table
CREATE TABLE IF NOT EXISTS public.trading_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trading_history_user_id ON public.trading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_history_symbol ON public.trading_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_history_created_at ON public.trading_history(created_at);

-- Add RLS policies
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trading history"
    ON public.trading_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading history"
    ON public.trading_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_trading_history_updated_at
    BEFORE UPDATE ON public.trading_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 