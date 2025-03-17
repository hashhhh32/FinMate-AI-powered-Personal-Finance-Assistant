
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

// Simple ARIMA-inspired prediction model
function predictPrices(historicalPrices: number[], days: number): number[] {
  if (historicalPrices.length < 5) {
    return Array(days).fill(historicalPrices[historicalPrices.length - 1] || 100);
  }
  
  const predictions: number[] = [];
  const shortTermSMA = calculateSMA(historicalPrices, 5);
  const longTermSMA = calculateSMA(historicalPrices, 20);
  const ema = calculateEMA(historicalPrices, 10);
  
  // Calculate recent momentum
  const recentPrices = historicalPrices.slice(-5);
  const momentum = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
  
  // Volatility estimate
  let volatility = 0;
  for (let i = 1; i < historicalPrices.length; i++) {
    const dailyReturn = Math.log(historicalPrices[i] / historicalPrices[i - 1]);
    volatility += dailyReturn * dailyReturn;
  }
  volatility = Math.sqrt(volatility / historicalPrices.length) * Math.sqrt(252); // Annualized
  
  // Last price
  const lastPrice = historicalPrices[historicalPrices.length - 1];
  
  // Generate predictions for each day
  for (let day = 1; day <= days; day++) {
    // Combine different signals for prediction
    const trendFactor = shortTermSMA > longTermSMA ? 1.002 : 0.998;
    const momentumFactor = 1 + (momentum / 10); // Dampen momentum effect
    
    // Random walk component with increasing uncertainty over time
    const randomComponent = 1 + (Math.random() * volatility / 10) * (Math.random() > 0.5 ? 1 : -1) * Math.sqrt(day);
    
    // Calculate prediction
    const baselinePrediction = lastPrice * Math.pow(trendFactor * momentumFactor, day);
    let prediction = baselinePrediction * randomComponent;
    
    // Ensure the prediction is reasonable (not too different from last price)
    const maxChange = 0.15 * Math.sqrt(day); // Max 15% change per sqrt(day)
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
      
      if (!historicalData || historicalData.length === 0) {
        console.warn(`No historical data found for ${symbol}`);
        continue;
      }
      
      // Extract close prices for prediction
      const prices = historicalData.map(item => item.close);
      
      // Generate predictions for 7 days
      const predictionDays = 7;
      const predictedPrices = predictPrices(prices, predictionDays);
      
      predictions[symbol] = {
        symbol,
        predictions: []
      };
      
      // Generate dates for predictions
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
