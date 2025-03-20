/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alpha Vantage API configuration
const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY') || '';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Function to get real-time stock price
async function getStockPrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    if (!response.ok) {
      console.error('Alpha Vantage API error:', response.status);
      return null;
    }

    const data = await response.json();
    const price = parseFloat(data['Global Quote']?.['05. price']);
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
}

// Function to update prices for all symbols
async function updateAllPrices(): Promise<{ success: boolean; message: string }> {
  try {
    // Get symbols that need updates
    const { data: symbols, error: symbolsError } = await supabase
      .rpc('get_symbols_for_price_update');

    if (symbolsError) {
      throw symbolsError;
    }

    if (!symbols || symbols.length === 0) {
      return {
        success: true,
        message: 'No symbols need updating'
      };
    }

    // Update each symbol's price
    const updates = await Promise.all(
      symbols.map(async ({ symbol }) => {
        const price = await getStockPrice(symbol);
        if (price !== null) {
          await supabase.rpc('update_stock_prices', {
            p_symbol: symbol,
            p_price: price
          });
          return { symbol, success: true, price };
        }
        return { symbol, success: false };
      })
    );

    const successCount = updates.filter(u => u.success).length;
    const failCount = updates.length - successCount;

    return {
      success: true,
      message: `Updated ${successCount} symbols, failed to update ${failCount} symbols`
    };
  } catch (error) {
    console.error('Error updating prices:', error);
    return {
      success: false,
      message: `Error updating prices: ${error.message}`
    };
  }
}

// Main serve function
serve(async (req) => {
  try {
    const result = await updateAllPrices();
    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in price update function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error updating prices: ${error.message}`
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}); 