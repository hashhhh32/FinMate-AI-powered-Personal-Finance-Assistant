-- Check if the table exists first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        -- Create user_profiles table
        CREATE TABLE public.user_profiles (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now())
        );

        -- Enable RLS
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view own profile" 
            ON public.user_profiles 
            FOR SELECT 
            USING (auth.uid() = id);

        CREATE POLICY "Users can update own profile" 
            ON public.user_profiles 
            FOR UPDATE 
            USING (auth.uid() = id);

        CREATE POLICY "Users can insert own profile" 
            ON public.user_profiles 
            FOR INSERT 
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into user_profiles
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Check if trading_portfolios exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trading_portfolios') THEN
        -- Create initial trading portfolio
        INSERT INTO public.trading_portfolios (
            user_id,
            cash,
            equity,
            updated_at
        ) VALUES (
            NEW.id,
            10000, -- Starting cash
            0,     -- Initial equity
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Safely create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 