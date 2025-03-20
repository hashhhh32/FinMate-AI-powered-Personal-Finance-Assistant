-- Create trading_portfolios table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trading_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cash DECIMAL(19,4) DEFAULT 10000,
    equity DECIMAL(19,4) DEFAULT 0,
    total_cost DECIMAL(19,4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.trading_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own portfolio"
    ON public.trading_portfolios
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
    ON public.trading_portfolios
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
    ON public.trading_portfolios
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create trading_positions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trading_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    symbol TEXT NOT NULL,
    quantity DECIMAL(19,4) NOT NULL,
    cost_basis DECIMAL(19,4) NOT NULL,
    current_price DECIMAL(19,4),
    market_value DECIMAL(19,4),
    unrealized_pl DECIMAL(19,4),
    unrealized_plpc DECIMAL(19,4),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own positions"
    ON public.trading_positions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
    ON public.trading_positions
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
    ON public.trading_positions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Modify the handle_new_user function to be more resilient
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    portfolio_id UUID;
BEGIN
    -- Insert into user_profiles
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Create initial trading portfolio
    INSERT INTO public.trading_portfolios (
        user_id,
        cash,
        equity,
        total_cost,
        updated_at
    ) VALUES (
        NEW.id,
        10000,
        0,
        0,
        NOW()
    )
    RETURNING id INTO portfolio_id;

    -- Log successful creation
    RAISE NOTICE 'Created new user profile and portfolio for user %', NEW.id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$; 