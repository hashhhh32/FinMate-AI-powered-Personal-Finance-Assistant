-- Add missing columns to trading_positions table
ALTER TABLE trading_positions
ADD COLUMN IF NOT EXISTS current_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS market_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS unrealized_pl DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS unrealized_plpc DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing positions with initial values
UPDATE trading_positions
SET
    current_price = COALESCE(current_price, cost_basis / NULLIF(quantity, 0)),
    market_value = quantity * COALESCE(current_price, cost_basis / NULLIF(quantity, 0)),
    unrealized_pl = quantity * COALESCE(current_price, cost_basis / NULLIF(quantity, 0)) - cost_basis,
    unrealized_plpc = CASE 
        WHEN cost_basis > 0 THEN 
            ((quantity * COALESCE(current_price, cost_basis / NULLIF(quantity, 0)) - cost_basis) / cost_basis) * 100
        ELSE 0
    END,
    updated_at = NOW()
WHERE current_price IS NULL;

-- Create or replace the trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_trading_position_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_trading_position_timestamp'
    ) THEN
        CREATE TRIGGER set_trading_position_timestamp
        BEFORE UPDATE ON trading_positions
        FOR EACH ROW
        EXECUTE FUNCTION update_trading_position_timestamp();
    END IF;
END
$$; 