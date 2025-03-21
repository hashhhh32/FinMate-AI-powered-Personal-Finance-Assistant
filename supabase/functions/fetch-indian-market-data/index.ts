// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.0";
import { corsHeaders } from "../_shared/cors.ts";

interface MarketData {
  price: number;
  change: number | null;
  changePercent: number | null;
  symbol: string;
}

const INDICES = {
  "NIFTY 50": { yahoo: "^NSEI", alpha: "NSEI" },
  "SENSEX": { yahoo: "^BSESN", alpha: "BSE" },
  "NIFTY BANK": { yahoo: "^NSEBANK", alpha: "NSEBANK" },
  "NIFTY IT": { yahoo: "^CNXIT", alpha: "CNXIT" }
};

// For development only - replace with environment variables in production
const supabaseUrl = 'https://wsywtdxkxznowdmtfbiy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzeXd0ZHhreHpub3dkbXRmYml5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjEwNzE2NSwiZXhwIjoyMDU3NjgzMTY1fQ.ErLzM3BP1dpJh51WmzB906O5PKWQJw5czSg3Gw6VyE8';
const ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with your Alpha Vantage API key

async function fetchYahooFinanceData(indexName: string, symbol: string): Promise<MarketData | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data?.chart?.result?.[0]?.meta) {
      throw new Error('Invalid data format');
    }

    const quote = Number(data.chart.result[0].meta.regularMarketPrice);
    const previousClose = Number(data.chart.result[0].meta.previousClose);
    
    let change = null;
    let changePercent = null;
    
    if (previousClose > 0) {
      change = Number((quote - previousClose).toFixed(2));
      changePercent = Number(((quote - previousClose) / previousClose * 100).toFixed(2));
    }

    return {
      price: quote,
      change,
      changePercent,
      symbol
    };
  } catch (error) {
    console.error(`Yahoo Finance API error for ${indexName}:`, error);
    return null;
  }
}

async function fetchAlphaVantageData(indexName: string, symbol: string): Promise<MarketData | null> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data['Global Quote']) {
      throw new Error('Invalid data format');
    }

    const quote = Number(data['Global Quote']['05. price']);
    const previousClose = Number(data['Global Quote']['08. previous close']);
    
    let change = null;
    let changePercent = null;
    
    if (previousClose > 0) {
      change = Number((quote - previousClose).toFixed(2));
      changePercent = Number(((quote - previousClose) / previousClose * 100).toFixed(2));
    }

    return {
      price: quote,
      change,
      changePercent,
      symbol
    };
  } catch (error) {
    console.error(`Alpha Vantage API error for ${indexName}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const marketData: Record<string, MarketData> = {};
    let hasError = false;
    
    for (const [indexName, symbols] of Object.entries(INDICES)) {
      try {
        console.log(`Fetching data for ${indexName}`);
        
        // Try Yahoo Finance first
        let data = await fetchYahooFinanceData(indexName, symbols.yahoo);
        
        // If Yahoo fails, try Alpha Vantage
        if (!data) {
          console.log(`Falling back to Alpha Vantage for ${indexName}`);
          data = await fetchAlphaVantageData(indexName, symbols.alpha);
        }
        
        if (!data) {
          console.error(`Failed to fetch data for ${indexName} from both APIs`);
          hasError = true;
          continue;
        }

        marketData[indexName] = data;
        console.log(`Successfully fetched data for ${indexName}:`, data);
      } catch (error) {
        console.error(`Error fetching ${indexName}:`, error);
        hasError = true;
        continue;
      }
    }

    if (Object.keys(marketData).length === 0) {
      throw new Error('Failed to fetch data for any market indices');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const { error: upsertError } = await supabaseClient
      .from('market_indicators')
      .upsert(
        Object.entries(marketData).map(([name, data]) => ({
          name,
          symbol: data.symbol,
          price: data.price,
          change: data.change,
          change_percent: data.changePercent,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'name' }
      );

    if (upsertError) {
      console.error('Error upserting market data:', upsertError);
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: marketData,
        hasPartialError: hasError,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: error.hint || 'Check the function logs for more details',
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
}); 