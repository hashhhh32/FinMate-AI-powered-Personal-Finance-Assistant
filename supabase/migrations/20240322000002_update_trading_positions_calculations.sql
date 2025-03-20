-- Add average_price column
ALTER TABLE trading_positions
ADD COLUMN IF NOT EXISTS average_price decimal(10,2) DEFAULT 0.00;

-- Add total_value column (total cost of shares bought)
ALTER TABLE trading_positions
ADD COLUMN IF NOT EXISTS total_value decimal(10,2) DEFAULT 0.00;

-- Ensure market_value column exists (current_price * quantity)
ALTER TABLE trading_positions
ADD COLUMN IF NOT EXISTS market_value decimal(10,2) DEFAULT 0.00;

-- Add comments to clarify column meanings
COMMENT ON COLUMN trading_positions.average_price IS 'Average cost per share based on buy transactions';
COMMENT ON COLUMN trading_positions.total_value IS 'Total cost of all shares bought (quantity * average_price)';
COMMENT ON COLUMN trading_positions.market_value IS 'Current market value of position (quantity * current_price)';
COMMENT ON COLUMN trading_positions.unrealized_pl IS 'Unrealized profit/loss (market_value - total_value)';
COMMENT ON COLUMN trading_positions.unrealized_plpc IS 'Unrealized profit/loss percentage ((market_value - total_value) / total_value * 100)';

-- Create function to calculate average price from trade history
CREATE OR REPLACE FUNCTION calculate_average_price(p_user_id UUID, p_symbol TEXT)
RETURNS decimal AS $$
DECLARE
    v_total_cost decimal := 0;
    v_total_shares decimal := 0;
BEGIN
    -- Calculate total cost and shares from buy transactions
    SELECT 
        COALESCE(SUM(CASE WHEN order_type = 'buy' THEN quantity * price ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN order_type = 'buy' THEN quantity ELSE 0 END), 0)
    INTO v_total_cost, v_total_shares
    FROM trading_history
    WHERE user_id = p_user_id AND symbol = p_symbol;

    -- Return average price or 0 if no shares
    RETURN CASE 
        WHEN v_total_shares > 0 THEN v_total_cost / v_total_shares
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update position calculations
CREATE OR REPLACE FUNCTION update_position_calculations()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate average price
    NEW.average_price := calculate_average_price(NEW.user_id, NEW.symbol);
    
    -- Calculate total value
    NEW.total_value := NEW.quantity * NEW.average_price;
    
    -- Calculate market value
    NEW.market_value := NEW.quantity * NEW.current_price;
    
    -- Calculate unrealized P/L
    NEW.unrealized_pl := NEW.market_value - NEW.total_value;
    
    -- Calculate unrealized P/L percentage
    NEW.unrealized_plpc := CASE 
        WHEN NEW.total_value > 0 THEN 
            ((NEW.market_value - NEW.total_value) / NEW.total_value) * 100
        ELSE 0
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on trading_positions table
DROP TRIGGER IF EXISTS trigger_update_position_calculations ON trading_positions;
CREATE TRIGGER trigger_update_position_calculations
    BEFORE INSERT OR UPDATE ON trading_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_position_calculations();

-- Update existing positions
UPDATE trading_positions
SET 
    average_price = calculate_average_price(user_id, symbol),
    current_price = current_price, -- This will trigger the calculations through the trigger
    updated_at = NOW();

-- Function to update position price and recalculate values
CREATE OR REPLACE FUNCTION update_position_price(
  p_symbol TEXT,
  p_current_price DECIMAL,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_position RECORD;
BEGIN
  -- Get current position data
  SELECT * INTO v_position
  FROM trading_positions
  WHERE user_id = p_user_id AND symbol = p_symbol;

  IF v_position IS NULL THEN
    RETURN; -- No position found
  END IF;

  -- Update position with new price and recalculate values
  UPDATE trading_positions
  SET 
    current_price = p_current_price,
    market_value = quantity * p_current_price,
    unrealized_pl = quantity * (p_current_price - cost_basis),
    unrealized_plpc = CASE 
      WHEN cost_basis > 0 THEN 
        ((p_current_price - cost_basis) / cost_basis) * 100
      ELSE 0 
    END,
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND symbol = p_symbol;

  -- Update portfolio equity
  UPDATE trading_portfolios
  SET 
    equity = (
      SELECT COALESCE(SUM(market_value), 0)
      FROM trading_positions
      WHERE user_id = p_user_id
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql; 