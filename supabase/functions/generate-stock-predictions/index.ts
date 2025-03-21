import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface StockData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  rsi: number;
  macd: number;
  ema20: number;
  sma50: number;
  sma200: number;
  bollingerUpper: number;
  bollingerLower: number;
  atr: number;
}

interface PredictionResult {
  symbol: string;
  predicted_price: number;
  confidence_level: number;
  risk_level: string;
  recommendation: string;
  features_used: TechnicalIndicators;
}

// Calculate RSI
function calculateRSI(prices: number[], periods = 14): number {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < periods + 1; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  const avgGain = gains / periods;
  const avgLoss = losses / periods;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
function calculateEMA(prices: number[], periods: number): number {
  const multiplier = 2 / (periods + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Calculate MACD
function calculateMACD(prices: number[]): number {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return ema12 - ema26;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], periods = 20): { upper: number; lower: number } {
  const sma = prices.slice(-periods).reduce((a, b) => a + b) / periods;
  const squaredDiffs = prices.slice(-periods).map(price => Math.pow(price - sma, 2));
  const standardDeviation = Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / periods);
  
  return {
    upper: sma + (standardDeviation * 2),
    lower: sma - (standardDeviation * 2)
  };
}

// Calculate ATR (Average True Range)
function calculateATR(data: StockData[], periods = 14): number {
  const trueRanges = data.map((day, i) => {
    if (i === 0) return day.high - day.low;
    const previousClose = data[i - 1].close;
    return Math.max(
      day.high - day.low,
      Math.abs(day.high - previousClose),
      Math.abs(day.low - previousClose)
    );
  });

  return trueRanges.slice(-periods).reduce((a, b) => a + b) / periods;
}

// Generate prediction for a single stock
async function generatePrediction(
  symbol: string,
  historicalData: StockData[]
): Promise<PredictionResult> {
  const closePrices = historicalData.map(d => d.close);
  const volumes = historicalData.map(d => d.volume);
  
  // Calculate technical indicators
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const ema20 = calculateEMA(closePrices, 20);
  const sma50 = closePrices.slice(-50).reduce((a, b) => a + b) / 50;
  const sma200 = closePrices.slice(-200).reduce((a, b) => a + b) / 200;
  const bollingerBands = calculateBollingerBands(closePrices);
  const atr = calculateATR(historicalData);

  const lastPrice = closePrices[closePrices.length - 1];
  const priceVolatility = atr / lastPrice;
  
  // Determine trend strength
  const trendStrength = (ema20 - sma50) / sma50;
  
  // Calculate prediction
  let predictedMove = 0;
  
  // RSI signals
  if (rsi > 70) predictedMove -= 0.02;
  else if (rsi < 30) predictedMove += 0.02;
  
  // MACD signals
  if (macd > 0) predictedMove += 0.01;
  else predictedMove -= 0.01;
  
  // Trend following
  if (lastPrice > sma50 && sma50 > sma200) predictedMove += 0.01;
  else if (lastPrice < sma50 && sma50 < sma200) predictedMove -= 0.01;
  
  // Bollinger Band signals
  if (lastPrice < bollingerBands.lower) predictedMove += 0.015;
  else if (lastPrice > bollingerBands.upper) predictedMove -= 0.015;
  
  const predicted_price = lastPrice * (1 + predictedMove);
  
  // Calculate confidence level based on indicator agreement
  let confidenceFactors = 0;
  if ((rsi < 30 && predictedMove > 0) || (rsi > 70 && predictedMove < 0)) confidenceFactors++;
  if ((macd > 0 && predictedMove > 0) || (macd < 0 && predictedMove < 0)) confidenceFactors++;
  if ((lastPrice > sma50 && predictedMove > 0) || (lastPrice < sma50 && predictedMove < 0)) confidenceFactors++;
  if ((lastPrice < bollingerBands.lower && predictedMove > 0) || 
      (lastPrice > bollingerBands.upper && predictedMove < 0)) confidenceFactors++;
  
  const confidence_level = Math.min(95, 60 + (confidenceFactors * 8));
  
  // Determine risk level
  let risk_level = "Medium";
  if (priceVolatility > 0.03) risk_level = "High";
  else if (priceVolatility < 0.01) risk_level = "Low";
  
  // Generate recommendation
  let recommendation = "Hold";
  if (predictedMove > 0.03) recommendation = "Strong Buy";
  else if (predictedMove > 0.01) recommendation = "Buy";
  else if (predictedMove < -0.03) recommendation = "Strong Sell";
  else if (predictedMove < -0.01) recommendation = "Sell";
  
  return {
    symbol,
    predicted_price,
    confidence_level,
    risk_level,
    recommendation,
    features_used: {
      rsi,
      macd,
      ema20,
      sma50,
      sma200,
      bollingerUpper: bollingerBands.upper,
      bollingerLower: bollingerBands.lower,
      atr
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const predictions: PredictionResult[] = [];

    for (const symbol of symbols) {
      // Fetch historical data
      const { data: historicalData, error: historyError } = await supabaseClient
        .from("historical_stock_data")
        .select("*")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: true })
        .limit(200);

      if (historyError) throw historyError;
      if (!historicalData || historicalData.length < 200) {
        console.error(`Insufficient historical data for ${symbol}`);
        continue;
      }

      // Generate prediction
      const prediction = await generatePrediction(symbol, historicalData);
      predictions.push(prediction);

      // Store prediction in database
      const { error: insertError } = await supabaseClient
        .from("stock_predictions")
        .insert([{
          symbol: prediction.symbol,
          predicted_price: prediction.predicted_price,
          confidence_level: prediction.confidence_level,
          risk_level: prediction.risk_level,
          recommendation: prediction.recommendation,
          prediction_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          model_version: "1.0.0",
          features_used: prediction.features_used
        }]);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ predictions }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating predictions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
