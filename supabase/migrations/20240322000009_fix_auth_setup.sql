-- Wrap everything in a transaction
BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, clean up any existing objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_portfolio(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.auto_initialize_user_portfolio() CASCADE;

-- Drop tables if they exist
DROP TABLE IF EXISTS public.trading_portfolios CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user_profiles table first
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(auth_user_id),
    UNIQUE(email)
);

-- Create trading_portfolios table
CREATE TABLE public.trading_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cash DECIMAL(19,4) DEFAULT 10000,
    equity DECIMAL(19,4) DEFAULT 0,
    total_cost DECIMAL(19,4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id)
);

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _email text;
    _full_name text;
    _avatar_url text;
BEGIN
    -- Get values with proper error handling
    _email := NEW.email;
    _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    _avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL);

    -- Insert into user_profiles with error handling
    INSERT INTO public.user_profiles (
        auth_user_id,
        email,
        full_name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        _email,
        _full_name,
        _avatar_url,
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create function to handle portfolio initialization
CREATE OR REPLACE FUNCTION public.handle_new_user_portfolio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create initial portfolio
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
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error initializing portfolio: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create the triggers
CREATE TRIGGER on_auth_user_created_profiles
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_portfolio
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_portfolio();

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
    USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

-- Create policies for trading_portfolios
CREATE POLICY "Users can view own portfolio"
    ON public.trading_portfolios FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own portfolio"
    ON public.trading_portfolios FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own portfolio"
    ON public.trading_portfolios FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Set up permissions
ALTER TABLE public.user_profiles OWNER TO postgres;
ALTER TABLE public.trading_portfolios OWNER TO postgres;

GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon, service_role;

GRANT ALL ON public.user_profiles TO postgres, authenticated, service_role;
GRANT ALL ON public.trading_portfolios TO postgres, authenticated, service_role;

-- Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- Verify the setup
DO $$
BEGIN
    -- Check if tables exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        RAISE EXCEPTION 'user_profiles table was not created properly';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trading_portfolios') THEN
        RAISE EXCEPTION 'trading_portfolios table was not created properly';
    END IF;
    
    -- Check if triggers exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname IN ('on_auth_user_created_profiles', 'on_auth_user_created_portfolio')
    ) THEN
        RAISE EXCEPTION 'Triggers were not created properly';
    END IF;
END$$;

COMMIT; 