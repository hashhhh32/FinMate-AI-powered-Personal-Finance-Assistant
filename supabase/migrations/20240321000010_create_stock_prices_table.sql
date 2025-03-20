-- Create table for storing real-time stock prices
CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'alpha_vantage'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_timestamp ON stock_prices(symbol, timestamp DESC);

-- Enable RLS
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read stock prices
CREATE POLICY "Allow authenticated users to read stock prices"
ON stock_prices
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow service role to insert stock prices
CREATE POLICY "Allow service role to insert stock prices"
ON stock_prices
FOR INSERT
TO service_role
WITH CHECK (true); 