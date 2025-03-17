
-- Enable realtime for the realtime_stock_prices table
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_stock_prices;

-- Enable realtime for the predicted_stock_prices table
ALTER PUBLICATION supabase_realtime ADD TABLE public.predicted_stock_prices;
