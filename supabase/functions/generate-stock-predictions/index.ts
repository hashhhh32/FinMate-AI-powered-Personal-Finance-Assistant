
// Follow the Supabase Edge Function format
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple moving average calculation
function calculateSMA(data: number[], window: number): number {
  if (data.length < window) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }
  
  const windowData = data.slice(data.length - window);
  return windowData.reduce((sum, val) => sum + val, 0) / window;
}

// Exponential moving average
function calculateEMA(data: number[], window: number): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0];
  
  const alpha = 2 / (window + 1);
  let ema = data[0];
  
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * alpha + ema * (1 - alpha);
  }
  
  return ema;
}

// Calculate price momentum
function calculateMomentum(data: number[], period: number): number {
  if (data.length <= period) return 0;
  
  const current = data[data.length - 1];
  const past = data[data.length - 1 - period];
  return (current - past) / past;
}

// Calculate volatility (standard deviation)
function calculateVolatility(data: number[]): number {
  if (data.length <= 1) return 0;
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  return Math.sqrt(variance);
}

// Advanced prediction model combining multiple signals
function predictPrices(historicalPrices: number[], days: number): number[] {
  if (historicalPrices.length < 10) {
    return Array(days).fill(historicalPrices[historicalPrices.length - 1] || 100);
  }
  
  const predictions: number[] = [];
  
  // Calculate various technical indicators
  const shortTermSMA = calculateSMA(historicalPrices, 5);
  const mediumTermSMA = calculateSMA(historicalPrices, 10);
  const longTermSMA = calculateSMA(historicalPrices, 20);
  
  const shortTermEMA = calculateEMA(historicalPrices, 5);
  const mediumTermEMA = calculateEMA(historicalPrices, 10);
  
  // Calculate momentum at different timescales
  const shortMomentum = calculateMomentum(historicalPrices, 3);
  const mediumMomentum = calculateMomentum(historicalPrices, 7);
  const longMomentum = calculateMomentum(historicalPrices, 14);
  
  // Calculate volatility
  const volatility = calculateVolatility(historicalPrices.slice(-20));
  
  // Last price
  const lastPrice = historicalPrices[historicalPrices.length - 1];
  
  // Trend analysis
  const bullishTrend = shortTermSMA > mediumTermSMA && mediumTermSMA > longTermSMA;
  const bearishTrend = shortTermSMA < mediumTermSMA && mediumTermSMA < longTermSMA;
  const sidewaysTrend = !bullishTrend && !bearishTrend;
  
  // Generate predictions for each day
  for (let day = 1; day <= days; day++) {
    // Combine different signals for prediction
    let trendFactor = 1.0;
    if (bullishTrend) trendFactor = 1.002;
    if (bearishTrend) trendFactor = 0.998;
    
    // Weight momentum by recency
    const momentumFactor = 1 + (shortMomentum * 0.5 + mediumMomentum * 0.3 + longMomentum * 0.2) / 10;
    
    // EMA crossover signal (short term EMA crossing above medium term is bullish)
    const emaCrossoverFactor = shortTermEMA > mediumTermEMA ? 1.001 : 0.999;
    
    // Random walk component with increasing uncertainty over time
    const randomComponent = 1 + (Math.random() * volatility / 10) * (Math.random() > 0.5 ? 1 : -1) * Math.sqrt(day);
    
    // Calculate prediction
    const baselinePrediction = lastPrice * Math.pow(trendFactor * momentumFactor * emaCrossoverFactor, day);
    let prediction = baselinePrediction * randomComponent;
    
    // Ensure the prediction is reasonable (not too different from last price)
    const maxChange = 0.10 * Math.sqrt(day); // Max 10% change per sqrt(day)
    const minPrediction = lastPrice * (1 - maxChange);
    const maxPrediction = lastPrice * (1 + maxChange);
    prediction = Math.max(minPrediction, Math.min(maxPrediction, prediction));
    
    // Round to 2 decimal places
    prediction = parseFloat(prediction.toFixed(2));
    predictions.push(prediction);
  }
  
  return predictions;
}

// Define the main handler for the Edge Function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing symbols array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Generating predictions for: ${symbols.join(', ')}`);
    
    // First, get the latest prices for all requested symbols
    const { data: latestPrices, error: pricesError } = await supabase
      .from('realtime_stock_prices')
      .select('symbol, price, timestamp')
      .in('symbol', symbols)
      .order('timestamp', { ascending: false });
    
    if (pricesError) {
      console.error('Error fetching latest prices:', pricesError);
    }
    
    // Create a map of symbol to latest price
    const latestPricesBySymbol: Record<string, number> = {};
    if (latestPrices) {
      for (const price of latestPrices) {
        if (!latestPricesBySymbol[price.symbol]) {
          latestPricesBySymbol[price.symbol] = price.price;
        }
      }
    }
    
    const predictions: Record<string, { symbol: string, predictions: Array<{ date: string, price: number }> }> = {};
    
    // For each symbol, get historical data and generate predictions
    for (const symbol of symbols) {
      // Get historical data from the database
      const { data: historicalData, error: historyError } = await supabase
        .from('historical_stock_data')
        .select('close, timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true });
        
      if (historyError) {
        console.error(`Error fetching historical data for ${symbol}:`, historyError);
        continue;
      }
      
      // If we don't have historical data, try to use the latest price plus some simulated history
      let prices: number[] = [];
      if (!historicalData || historicalData.length === 0) {
        console.warn(`No historical data found for ${symbol}, using simulated history`);
        
        const basePrice = latestPricesBySymbol[symbol] || 
          (symbol === 'AAPL' ? 174.82 : 
          symbol === 'MSFT' ? 328.79 : 
          symbol === 'NVDA' ? 437.53 : 
          symbol === 'AMZN' ? 132.65 : 
          symbol === 'TSLA' ? 224.57 : 
          100);
          
        // Generate 30 days of simulated historical data with some random walks
        prices = [basePrice];
        for (let i = 1; i < 30; i++) {
          const dailyChange = (Math.random() * 0.03 - 0.015) * prices[i-1]; // -1.5% to +1.5%
          prices.push(prices[i-1] + dailyChange);
        }
      } else {
        // Extract close prices for prediction
        prices = historicalData.map(item => item.close);
        
        // If we have a more recent price from realtime_stock_prices, add it
        if (latestPricesBySymbol[symbol]) {
          prices.push(latestPricesBySymbol[symbol]);
        }
      }
      
      // Generate predictions for 7 days
      const predictionDays = 7;
      const predictedPrices = predictPrices(prices, predictionDays);
      
      predictions[symbol] = {
        symbol,
        predictions: []
      };
      
      // Delete existing predictions for this symbol
      const { error: deleteError } = await supabase
        .from('predicted_stock_prices')
        .delete()
        .eq('symbol', symbol);
        
      if (deleteError) {
        console.error(`Error deleting existing predictions for ${symbol}:`, deleteError);
      }
      
      // Generate dates for predictions and store them
      const today = new Date();
      for (let i = 0; i < predictedPrices.length; i++) {
        const predictionDate = new Date(today);
        predictionDate.setDate(today.getDate() + i + 1); // +1 because predictions start tomorrow
        
        predictions[symbol].predictions.push({
          date: predictionDate.toISOString(),
          price: predictedPrices[i]
        });
        
        // Store prediction in database
        const { error: insertError } = await supabase
          .from('predicted_stock_prices')
          .insert({
            symbol,
            predicted_price: predictedPrices[i],
            timestamp: predictionDate.toISOString()
          });
          
        if (insertError) {
          console.error(`Error inserting prediction for ${symbol}:`, insertError);
        } else {
          console.log(`Stored prediction for ${symbol} on ${predictionDate.toDateString()}: $${predictedPrices[i]}`);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in generate-stock-predictions function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
