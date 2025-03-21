-- Create historical stock data table
CREATE TABLE IF NOT EXISTS historical_stock_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open DECIMAL(10, 2) NOT NULL,
  high DECIMAL(10, 2) NOT NULL,
  low DECIMAL(10, 2) NOT NULL,
  close DECIMAL(10, 2) NOT NULL,
  volume BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on symbol and timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_historical_data_symbol_timestamp ON historical_stock_data(symbol, timestamp);

-- Create realtime stock prices table
CREATE TABLE IF NOT EXISTS realtime_stock_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on symbol and timestamp for realtime prices
CREATE INDEX IF NOT EXISTS idx_realtime_prices_symbol_timestamp ON realtime_stock_prices(symbol, timestamp);

-- Create stock predictions table
CREATE TABLE IF NOT EXISTS stock_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  predicted_price DECIMAL(10, 2) NOT NULL,
  confidence_level INTEGER NOT NULL,
  risk_level VARCHAR(10) NOT NULL,
  recommendation VARCHAR(20) NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL,
  target_date TIMESTAMPTZ NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  features_used JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on symbol and prediction dates
CREATE INDEX IF NOT EXISTS idx_predictions_symbol_dates ON stock_predictions(symbol, prediction_date, target_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for historical_stock_data
DROP TRIGGER IF EXISTS update_historical_stock_data_updated_at ON historical_stock_data;
CREATE TRIGGER update_historical_stock_data_updated_at
  BEFORE UPDATE ON historical_stock_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE historical_stock_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_stock_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON historical_stock_data
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON realtime_stock_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON stock_predictions
  FOR SELECT TO authenticated USING (true);

-- Create function to fetch historical data
CREATE OR REPLACE FUNCTION fetch_historical_data(
  p_symbol VARCHAR,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  symbol_out VARCHAR,
  date_timestamp TIMESTAMPTZ,
  price_open DECIMAL,
  price_high DECIMAL,
  price_low DECIMAL,
  price_close DECIMAL,
  trade_volume BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.symbol,
    h.timestamp,
    h.open,
    h.high,
    h.low,
    h.close,
    h.volume
  FROM historical_stock_data h
  WHERE h.symbol = p_symbol
    AND h.timestamp BETWEEN p_start_date AND p_end_date
  ORDER BY h.timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create market indicators table
CREATE TABLE IF NOT EXISTS market_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  symbol VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  change DECIMAL(10, 2),
  change_percent DECIMAL(5, 2),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on market indicator name
CREATE INDEX IF NOT EXISTS idx_market_indicators_name ON market_indicators(name);

-- Enable RLS for market indicators
ALTER TABLE market_indicators ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON market_indicators
  FOR SELECT TO authenticated USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_market_indicators_symbol ON market_indicators(symbol);
CREATE INDEX IF NOT EXISTS idx_market_indicators_updated_at ON market_indicators(updated_at);

-- Add RLS policies
ALTER TABLE market_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
    ON market_indicators
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow service role full access"
    ON market_indicators
    TO service_role
    USING (true)
    WITH CHECK (true); 