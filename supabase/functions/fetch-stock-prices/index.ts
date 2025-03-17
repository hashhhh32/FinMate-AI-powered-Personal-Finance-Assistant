
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

    console.log(`Fetching stock prices for: ${symbols.join(', ')}`);
    
    // In a production app, this would use a real API key from environment variables
    const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
    
    if (!apiKey) {
      // For demo purposes, generate simulated data if API key is not available
      console.log('API key not found, generating simulated data');
      const simulatedPrices: Record<string, number> = {};
      
      for (const symbol of symbols) {
        // Generate a reasonable price based on the symbol
        const basePrice = 
          symbol === 'AAPL' ? 174.82 : 
          symbol === 'MSFT' ? 328.79 : 
          symbol === 'NVDA' ? 437.53 : 
          symbol === 'AMZN' ? 132.65 : 
          symbol === 'TSLA' ? 224.57 : 
          100;
          
        // Add a small random variation (-2% to +2%)
        const randomFactor = 1 + (Math.random() * 0.04 - 0.02);
        simulatedPrices[symbol] = parseFloat((basePrice * randomFactor).toFixed(2));
      }
      
      // Store the simulated prices in Supabase
      for (const symbol in simulatedPrices) {
        const { error: upsertError } = await supabase
          .from('realtime_stock_prices')
          .upsert({
            symbol,
            price: simulatedPrices[symbol],
            timestamp: new Date().toISOString()
          }, { onConflict: 'symbol' });
          
        if (upsertError) {
          console.error(`Error inserting ${symbol}:`, upsertError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          prices: simulatedPrices,
          source: 'simulation'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // With a real API key, fetch actual data from Alpha Vantage
    // This is the code that would be used with a real API key
    const prices: Record<string, number> = {};
    
    // Process one symbol at a time (Alpha Vantage has rate limits)
    for (const symbol of symbols) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Error fetching ${symbol}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          prices[symbol] = parseFloat(data['Global Quote']['05. price']);
          
          // Store in Supabase
          const { error: upsertError } = await supabase
            .from('realtime_stock_prices')
            .upsert({
              symbol,
              price: prices[symbol],
              timestamp: new Date().toISOString()
            }, { onConflict: 'symbol' });
            
          if (upsertError) {
            console.error(`Error inserting ${symbol}:`, upsertError);
          }
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }
      
      // Add a small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    
    return new Response(
      JSON.stringify({ 
        prices,
        source: 'alpha_vantage'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in fetch-stock-prices function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
