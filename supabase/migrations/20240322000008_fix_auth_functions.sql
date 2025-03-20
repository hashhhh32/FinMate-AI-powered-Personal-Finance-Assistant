-- Drop existing objects first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.initialize_user_portfolio(UUID);

-- Ensure tables exist with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.trading_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cash DECIMAL(19,4) DEFAULT 10000,
    equity DECIMAL(19,4) DEFAULT 0,
    total_cost DECIMAL(19,4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create the initialize_user_portfolio function
CREATE OR REPLACE FUNCTION public.initialize_user_portfolio(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.trading_portfolios (
        user_id,
        cash,
        equity,
        total_cost,
        updated_at
    ) VALUES (
        user_id,
        10000,
        0,
        0,
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into user_profiles
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        avatar_url
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    )
    ON CONFLICT (id) DO NOTHING;

    -- Initialize user portfolio
    PERFORM initialize_user_portfolio(NEW.id);

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_portfolios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own portfolio" ON public.trading_portfolios;
DROP POLICY IF EXISTS "Users can update own portfolio" ON public.trading_portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolio" ON public.trading_portfolios;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create policies for trading_portfolios
CREATE POLICY "Users can view own portfolio"
    ON public.trading_portfolios FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
    ON public.trading_portfolios FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
    ON public.trading_portfolios FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
ALTER TABLE public.user_profiles OWNER TO postgres;
ALTER TABLE public.trading_portfolios OWNER TO postgres;

GRANT ALL ON public.user_profiles TO postgres;
GRANT ALL ON public.trading_portfolios TO postgres;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.trading_portfolios TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.trading_portfolios TO service_role;

-- Grant USAGE on sequences if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role; 