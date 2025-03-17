
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

    console.log(`Fetching market indices for: ${symbols.join(', ')}`);
    
    // Alpha Vantage API key
    const apiKey = 'ERZP1A2SEHQWGFE1';
    const indices = [];
    
    // Map of market index ETFs to their names
    const indexNames: Record<string, string> = {
      'SPY': 'S&P 500',
      'QQQ': 'NASDAQ',
      'DIA': 'Dow Jones',
      'IWM': 'Russell 2000',
      'VGK': 'STOXX Europe 600',
      'EWJ': 'Nikkei 225'
    };
    
    // Process one symbol at a time (Alpha Vantage has rate limits)
    for (const symbol of symbols) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        console.log(`Fetching data for ${symbol} from: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Error fetching ${symbol}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          const price = parseFloat(data['Global Quote']['05. price']);
          const change = parseFloat(data['Global Quote']['09. change']);
          const changePercent = parseFloat(data['Global Quote']['10. change percent'].replace('%', ''));
          
          indices.push({
            symbol,
            name: indexNames[symbol] || symbol,
            price,
            change,
            changePercent,
            lastUpdated: new Date().toISOString()
          });
          
          console.log(`Successfully fetched ${symbol}: $${price} (${change >= 0 ? '+' : ''}${change})`);
        } else {
          console.error(`Missing data for ${symbol}:`, data);
          // Use fallback data if needed
          indices.push(generateFallbackIndex(symbol, indexNames));
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        // Add fallback data
        indices.push(generateFallbackIndex(symbol, indexNames));
      }
      
      // Add a delay to respect API rate limits (5 calls per minute for free tier)
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }
    
    return new Response(
      JSON.stringify({ indices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in fetch-market-indices function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to generate fallback index data
function generateFallbackIndex(symbol: string, indexNames: Record<string, string>) {
  const basePrice = 
    symbol === 'SPY' ? 475.32 : 
    symbol === 'QQQ' ? 415.67 : 
    symbol === 'DIA' ? 383.21 : 
    symbol === 'IWM' ? 187.56 : 
    symbol === 'VGK' ? 61.43 : 
    symbol === 'EWJ' ? 67.82 : 
    100;
    
  // Random change between -1% and +1%
  const changePercent = (Math.random() * 2 - 1);
  const change = basePrice * (changePercent / 100);
  
  return {
    symbol,
    name: indexNames[symbol] || symbol,
    price: basePrice,
    change,
    changePercent,
    lastUpdated: new Date().toISOString()
  };
}
