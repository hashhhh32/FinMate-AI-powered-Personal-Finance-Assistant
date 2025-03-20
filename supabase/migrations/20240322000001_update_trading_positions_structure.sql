-- Drop the average_price column if it exists
ALTER TABLE trading_positions DROP COLUMN IF EXISTS average_price;

-- Ensure cost_basis represents price per share
ALTER TABLE trading_positions 
  ALTER COLUMN cost_basis TYPE decimal(10,2),
  ALTER COLUMN cost_basis SET DEFAULT 0.00;

-- Update existing positions to fix cost_basis (if any positions have total cost instead of per-share cost)
UPDATE trading_positions 
SET cost_basis = CASE 
  WHEN quantity > 0 THEN cost_basis / quantity 
  ELSE cost_basis 
END
WHERE quantity > 0;

-- Add comment to clarify cost_basis meaning
COMMENT ON COLUMN trading_positions.cost_basis IS 'Original purchase price per share';

-- Ensure current_price column exists and is properly typed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_positions' 
    AND column_name = 'current_price'
  ) THEN
    ALTER TABLE trading_positions 
    ADD COLUMN current_price decimal(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Add comment to clarify current_price meaning
COMMENT ON COLUMN trading_positions.current_price IS 'Latest real-time market price per share';

-- Ensure market_value is calculated correctly
ALTER TABLE trading_positions 
  ALTER COLUMN market_value TYPE decimal(10,2),
  ALTER COLUMN market_value SET DEFAULT 0.00;

-- Update existing positions to fix market_value
UPDATE trading_positions 
SET market_value = quantity * current_price
WHERE quantity > 0 AND current_price > 0;

-- Add comment to clarify market_value meaning
COMMENT ON COLUMN trading_positions.market_value IS 'Total market value (quantity * current_price)';

-- Ensure unrealized_pl and unrealized_plpc are calculated correctly
UPDATE trading_positions 
SET 
  unrealized_pl = CASE 
    WHEN quantity > 0 AND cost_basis > 0 
    THEN quantity * (current_price - cost_basis)
    ELSE 0 
  END,
  unrealized_plpc = CASE 
    WHEN cost_basis > 0 
    THEN ((current_price - cost_basis) / cost_basis) * 100
    ELSE 0 
  END
WHERE quantity > 0; 