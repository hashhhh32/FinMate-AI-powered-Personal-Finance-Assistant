/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Type declarations for Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Define environment variables with proper type checking
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY') ?? '';
const ALPACA_API_SECRET = Deno.env.get('ALPACA_API_SECRET') ?? '';

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY || !ALPACA_API_KEY || !ALPACA_API_SECRET) {
  throw new Error('Missing required environment variables');
}

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define response headers that include CORS
const responseHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders,
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Alpaca API base URLs
const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

// Alpaca API headers
const alpacaHeaders = {
  'APCA-API-KEY-ID': ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
  'Content-Type': 'application/json'
};

// Alpha Vantage API key (reusing existing key)
const ALPHA_VANTAGE_API_KEY = 'ERZP1A2SEHQWGFE1';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationHistory {
  messages: ChatMessage[];
  lastUpdated: string;
}

// Add this function to validate Alpaca API connectivity
async function validateAlpacaConnection() {
  try {
    const response = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
      headers: alpacaHeaders
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const account = await response.json();
    console.log('Alpaca API connection validated:', {
      id: account.id,
      status: account.status,
      trading_enabled: !account.trading_blocked,
      buying_power: account.buying_power
    });
    return true;
  } catch (error) {
    console.error('Alpaca API validation error:', error);
    return false;
  }
}

// Add this function to store conversation history
async function storeConversationHistory(userId: string, message: ChatMessage) {
  try {
    // Get existing conversation history
    const { data: existingHistory, error: fetchError } = await supabase
      .from('conversation_history')
      .select('messages')
      .eq('user_id', userId)
      .single();
    
    let messages: ChatMessage[] = [];
    if (!fetchError && existingHistory) {
      messages = existingHistory.messages || [];
    }
    
    // Add new message
    messages.push(message);
    
    // Update or insert conversation history
    const { error: upsertError } = await supabase
      .from('conversation_history')
      .upsert({
        user_id: userId,
        messages,
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (upsertError) {
      console.error('Error storing conversation history:', upsertError);
    }
  } catch (error) {
    console.error('Error in storeConversationHistory:', error);
  }
}

// Add new type for price update request
interface PriceUpdateRequest {
  userId: string;
  symbols: string[];
}

// Add new function to fetch stock prices
async function fetchStockPrices(symbols: string[]): Promise<{ [key: string]: number }> {
  try {
    const prices: { [key: string]: number } = {};
    
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
            headers: {
              'APCA-API-KEY-ID': Deno.env.get('ALPACA_API_KEY') || '',
              'APCA-API-SECRET-KEY': Deno.env.get('ALPACA_API_SECRET') || ''
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch quote for ${symbol}: ${response.statusText}`);
          }

          const data = await response.json();
          const price = data?.quote?.ap || data?.quote?.bp;

          if (price) {
            prices[symbol] = price;
          } else {
            // Fallback to latest trade
            const tradeResponse = await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/trades/latest`, {
              headers: {
                'APCA-API-KEY-ID': Deno.env.get('ALPACA_API_KEY') || '',
                'APCA-API-SECRET-KEY': Deno.env.get('ALPACA_API_SECRET') || ''
              }
            });

            if (tradeResponse.ok) {
              const tradeData = await tradeResponse.json();
              if (tradeData?.trade?.p) {
                prices[symbol] = tradeData.trade.p;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
        }
      })
    );

    return prices;
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    throw error;
  }
}

// Define the main handler for the Edge Function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId, messageType = 'text' } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: message and userId are required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Extract the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: responseHeaders
        }
      );
    }

    console.log('=== Starting request processing ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Validate environment variables with detailed logging
    console.log('=== Validating environment variables ===');
    const envCheck = {
      GEMINI_API_KEY: !!GEMINI_API_KEY,
      ALPACA_API_KEY: !!ALPACA_API_KEY,
      ALPACA_API_SECRET: !!ALPACA_API_SECRET,
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_KEY: !!SUPABASE_SERVICE_ROLE_KEY
    };
    console.log('Environment check:', envCheck);
    
    // Log partial keys for debugging (safely)
    if (ALPACA_API_KEY) console.log('Alpaca API Key (first 4 chars):', ALPACA_API_KEY.substring(0, 4));
    if (ALPACA_API_SECRET) console.log('Alpaca Secret (first 4 chars):', ALPACA_API_SECRET.substring(0, 4));
    if (GEMINI_API_KEY) console.log('Gemini API Key (first 4 chars):', GEMINI_API_KEY.substring(0, 4));
    
    // Test Alpaca API connectivity
    console.log('=== Testing Alpaca API connectivity ===');
    try {
      const testResponse = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET
        }
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Alpaca API test failed:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: errorText
        });
        throw new Error(`Alpaca API test failed: ${testResponse.status} - ${errorText}`);
      }
      
      const accountData = await testResponse.json();
      console.log('Alpaca API test successful:', {
        account_status: accountData.status,
        trading_enabled: accountData.trading_blocked === false,
        buying_power: accountData.buying_power
      });
    } catch (error) {
      console.error('Alpaca API connectivity test error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "I'm having trouble connecting to the trading service. Please verify your API credentials.",
          debug: {
            error: error.message,
            alpaca_url: ALPACA_BASE_URL,
            has_credentials: !!ALPACA_API_KEY && !!ALPACA_API_SECRET
          }
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Store user message
    await storeConversationHistory(userId, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Process message with Gemini
    console.log('=== Processing message with Gemini ===');
    let intent;
    try {
      intent = await processMessageWithGemini(message);
      console.log('Gemini intent result:', intent);
      
      // Validate intent structure
      if (!intent || typeof intent !== 'object') {
        throw new Error('Invalid intent structure returned from Gemini');
      }
      
      if (!['GET_STOCK_PRICE', 'BUY_STOCK', 'SELL_STOCK', 'GET_PORTFOLIO', 'GENERAL', 'GET_MARKET_STATUS'].includes(intent.action)) {
        throw new Error(`Invalid action in intent: ${intent.action}`);
      }
    } catch (error) {
      console.error('Gemini processing error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error processing your request with AI',
          debug: {
            error: error.message,
            intent: intent || null
          }
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Handle different intents with error tracking
    console.log('=== Handling intent ===', intent?.action);
    let response;
    try {
      switch (intent?.action) {
      case 'GET_STOCK_PRICE':
          console.log('Getting stock price for:', intent.symbol);
        response = await getStockPrice(intent.symbol);
        break;
      case 'BUY_STOCK':
          console.log('Executing buy order for:', intent.symbol, intent.quantity);
        response = await executeTrade(userId, intent.symbol, intent.quantity, 'BUY_STOCK');
        break;
      case 'SELL_STOCK':
          console.log('Executing sell order for:', intent.symbol, intent.quantity);
        response = await executeTrade(userId, intent.symbol, intent.quantity, 'SELL_STOCK');
        break;
      case 'GET_PORTFOLIO':
          console.log('Getting portfolio for user:', userId);
        response = await getPortfolio(userId);
        break;
      case 'GET_MARKET_STATUS':
        const status = await getMarketStatus();
        response = {
          success: true,
          message: formatMarketStatusMessage(status),
          data: status
        };
        break;
      default:
          console.log('Getting general response');
        response = await getGeneralResponse(message);
        break;
      }
      console.log('Action response:', response);
      
      // Validate response structure
      if (!response || typeof response !== 'object' || typeof response.success !== 'boolean') {
        throw new Error('Invalid response structure from action handler');
      }
    } catch (error) {
      console.error('Error handling intent:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error processing your request',
          debug: {
            error: error.message,
            intent: intent?.action,
            response: response || null
          }
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Store conversation
    console.log('=== Storing conversation ===');
    try {
    await storeConversation(userId, message, response.message);
    } catch (error) {
      console.error('Error storing conversation:', error);
      // Don't fail the request if conversation storage fails
    }
    
    // Store assistant response
    await storeConversationHistory(userId, {
      role: 'assistant',
      content: response.message,
      timestamp: new Date().toISOString()
    });
    
    console.log('=== Request processing complete ===');
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Fatal error in request processing:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "I'm having trouble processing your request right now. Please try again later.",
        debug: {
          error: error.message,
          stack: error.stack
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Modify processMessageWithGemini for better error handling
async function processMessageWithGemini(message: string) {
  console.log('=== Processing message ===');
  try {
    // First, try to match trade commands directly
    const buyMatch = message.match(/buy\s+(\d+)\s+shares?\s+of\s+([A-Z]{1,5})/i);
    const sellMatch = message.match(/sell\s+(\d+)\s+shares?\s+of\s+([A-Z]{1,5})/i);
    const portfolioMatch = message.toLowerCase().includes('portfolio') || 
                         message.toLowerCase().includes('positions') ||
                         message.toLowerCase().includes('balance');
    const priceMatch = message.match(/(?:price|quote|value)\s+(?:of|for)?\s+([A-Z]{1,5})/i);

    // Handle trade commands directly without Gemini
    if (buyMatch || sellMatch) {
      const match = buyMatch || sellMatch;
      const quantity = parseInt(match![1]);
      const symbol = match![2].toUpperCase();
      
      return {
        action: buyMatch ? 'BUY_STOCK' : 'SELL_STOCK',
        symbol,
        quantity,
        confidence: 1.0
      };
    }

    // Handle portfolio queries directly
    if (portfolioMatch) {
      return {
        action: 'GET_PORTFOLIO',
        symbol: null,
        quantity: null,
        confidence: 1.0
      };
    }

    // Handle price queries directly
    if (priceMatch) {
      return {
        action: 'GET_STOCK_PRICE',
        symbol: priceMatch[1].toUpperCase(),
        quantity: null,
        confidence: 1.0
      };
    }

    // Only use Gemini for general questions
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a financial assistant that helps users trade stocks and analyze their portfolio.
                   Based on the following user message, provide guidance on using the trading platform.
                   Message: "${message}"
                   
                   Important instructions:
                   1. For trading, tell users to use exact format: "Buy X shares of SYMBOL" or "Sell X shares of SYMBOL"
                   2. For portfolio, tell users to say "Show my portfolio" or "Check my positions"
                   3. For prices, tell users to say "What's the price of SYMBOL"
                   4. Keep responses under 150 words and focus on platform usage
                   
                   Remember to always guide users to use the exact command formats mentioned above.`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 256
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      action: 'GENERAL',
      symbol: null,
      quantity: null,
      confidence: 1.0,
      message: data.candidates[0].content.parts[0].text.trim()
    };
  } catch (error) {
    console.error('Error in message processing:', error);
    throw error;
  }
}

// Get stock price from Alpha Vantage API
async function getStockPrice(symbol: string) {
  console.log('=== Getting stock price ===');
  console.log('Symbol:', symbol);
  
  try {
    if (!symbol) {
      console.error('Missing symbol');
      return {
        success: false,
        message: "I couldn't determine which stock you're asking about. Please specify a stock symbol or company name.",
        debug: { error: 'MISSING_SYMBOL' }
      };
    }
    
    if (!ALPHA_VANTAGE_API_KEY) {
      console.error('Missing Alpha Vantage API key');
      return {
        success: false,
        message: "I can't fetch stock prices right now because the price service is not configured properly.",
        debug: { error: 'ALPHA_VANTAGE_API_KEY_MISSING' }
      };
    }
    
    console.log('Fetching price from Alpha Vantage...');
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alpha Vantage API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return {
        success: false,
        message: `I encountered an error while fetching the price for ${symbol}. Please try again later.`,
        debug: {
          error: 'ALPHA_VANTAGE_API_ERROR',
          status: response.status,
          details: errorText
        }
      };
    }
    
    const data = await response.json();
    console.log('Alpha Vantage response:', data);
    
    // Check for API limit error
    if (data['Note'] && data['Note'].includes('API call frequency')) {
      console.error('Alpha Vantage API limit reached:', data['Note']);
      return {
        success: false,
        message: `I'm having trouble fetching the current price for ${symbol} due to API rate limits. Please try again in a minute.`,
        debug: { error: 'ALPHA_VANTAGE_API_LIMIT', details: data['Note'] }
      };
    }
    
    // Check for valid response structure
    if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
      console.error('Invalid Alpha Vantage response structure:', data);
      
      // Check for information message
      if (data['Information']) {
        console.error('Alpha Vantage information message:', data['Information']);
        return {
          success: false,
          message: `I couldn't fetch the price for ${symbol}. The service returned: ${data['Information']}`,
          debug: { error: 'ALPHA_VANTAGE_INFO_MESSAGE', details: data['Information'] }
        };
      }
      
      // Check if symbol exists
      if (Object.keys(data).length === 0 || (data['Global Quote'] && Object.keys(data['Global Quote']).length === 0)) {
        return {
          success: false,
          message: `I couldn't find price information for ${symbol}. Please check if the stock symbol is correct.`,
          debug: { error: 'INVALID_SYMBOL', data }
        };
      }
      
      return {
        success: false,
        message: `I received an unexpected response format while fetching the price for ${symbol}. Please try again later.`,
        debug: { error: 'INVALID_RESPONSE_FORMAT', data }
      };
    }
    
    // Parse price data
    try {
      const price = parseFloat(data['Global Quote']['05. price']);
      const change = parseFloat(data['Global Quote']['09. change']);
      const changePercent = data['Global Quote']['10. change percent'];
      
      if (isNaN(price)) {
        throw new Error('Invalid price value');
      }
      
      console.log('Successfully fetched price:', { symbol, price, change, changePercent });
      
      return {
        success: true,
        message: `The current price of ${symbol} is $${price.toFixed(2)}. It has changed by $${change.toFixed(2)} (${changePercent}) today.`,
        data: {
          symbol,
          price,
          change,
          changePercent
        }
      };
    } catch (error) {
      console.error('Error parsing price data:', error);
      return {
        success: false,
        message: `I had trouble processing the price information for ${symbol}. Please try again later.`,
        debug: { error: 'PRICE_PARSING_ERROR', details: error.message, data }
      };
    }
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return {
      success: false,
      message: `I encountered an error while fetching the price for ${symbol}. Please try again later.`,
      debug: { error: error.message }
    };
  }
}

// Helper function to update position prices
async function updatePositionPrices(userId: string, symbol: string, currentPrice: number) {
  try {
    console.log(`Updating position prices for ${symbol} to ${currentPrice}`);
    
    // Call the database function to update prices
    const { error } = await supabase.rpc('update_position_price', {
      p_user_id: userId,
      p_symbol: symbol,
      p_current_price: currentPrice
    });

    if (error) {
      console.error('Error in updatePositionPrices:', error);
      throw error;
    }

    console.log(`Successfully updated position prices for ${symbol}`);
  } catch (error) {
    console.error('Error updating position prices:', error);
    throw error;
  }
}

// Helper function to update trading position
async function updateTradingPosition(
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
  isBuy: boolean
) {
  try {
    await supabase.rpc('update_trading_position', {
      p_user_id: userId,
      p_symbol: symbol,
      p_quantity: quantity,
      p_price: price,
      p_is_buy: isBuy
    });
    console.log(`Updated trading position for ${symbol}`);
  } catch (error) {
    console.error('Error updating trading position:', error);
    throw error;
  }
}

// Helper function to setup real-time price updates
async function setupRealtimePriceUpdates(userId: string, symbol: string) {
  try {
    console.log(`Setting up real-time price updates for ${symbol}`);
    
    // Initialize Alpaca WebSocket connection
    const alpaca = new AlpacaClient({
      credentials: {
        key: ALPACA_API_KEY,
        secret: ALPACA_API_SECRET,
      },
      paper: true,
    });

    // Subscribe to quote updates
    alpaca.subscribe.quotes([symbol], async (quote) => {
      if (quote.ap > 0) { // Use ask price if available
        await updatePositionPrices(userId, symbol, quote.ap);
      } else if (quote.bp > 0) { // Fallback to bid price
        await updatePositionPrices(userId, symbol, quote.bp);
      }
    });

    // Handle connection events
    alpaca.subscribe.onConnect(() => {
      console.log('Connected to Alpaca WebSocket');
    });

    alpaca.subscribe.onDisconnect(() => {
      console.log('Disconnected from Alpaca WebSocket, attempting to reconnect...');
      setupRealtimePriceUpdates(userId, symbol);
    });

    console.log(`Successfully set up real-time price updates for ${symbol}`);
  } catch (error) {
    console.error('Error setting up real-time price updates:', error);
    throw error;
  }
}

// Update the executeTrade function
async function executeTrade(userId: string, symbol: string, quantity: number, action: 'BUY_STOCK' | 'SELL_STOCK') {
  console.log('=== Executing trade ===', { userId, symbol, quantity, action });
  
  try {
    // Validate Alpaca connection
    const isValid = await validateAlpacaConnection();
    if (!isValid) {
      throw new Error('Failed to validate Alpaca connection');
    }

    // Check if market is open
    const marketStatus = await getMarketStatus();
    if (!marketStatus.is_open) {
      throw new Error('Market is currently closed');
    }

    // Get latest quote
    const quoteResponse = await fetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/quotes/latest`,
      { headers: alpacaHeaders }
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Could not get current price for ${symbol}`);
    }
    
    const quote = await quoteResponse.json();
    const currentPrice = quote.quote?.ap || quote.quote?.bp;

    if (!currentPrice) {
      throw new Error(`Could not determine current price for ${symbol}`);
    }

    // Check buying power for buys
    if (action === 'BUY_STOCK') {
      const accountResponse = await fetch(
        `${ALPACA_BASE_URL}/v2/account`,
        { headers: alpacaHeaders }
      );
      
      if (!accountResponse.ok) {
        throw new Error('Could not verify buying power');
      }
      
      const account = await accountResponse.json();
      const requiredFunds = quantity * currentPrice;
      
      if (parseFloat(account.buying_power) < requiredFunds) {
        throw new Error(`Insufficient buying power. Required: $${requiredFunds}, Available: $${account.buying_power}`);
      }
    }

    // Check existing position for sells
    if (action === 'SELL_STOCK') {
      const positionResponse = await fetch(
        `${ALPACA_BASE_URL}/v2/positions/${symbol}`,
        { headers: alpacaHeaders }
      );
      
      if (!positionResponse.ok && positionResponse.status !== 404) {
        throw new Error('Could not verify position');
      }
      
      const position = positionResponse.status === 404 ? null : await positionResponse.json();
      
      if (!position || parseInt(position.qty) < quantity) {
        throw new Error(`Insufficient shares to sell. Requested: ${quantity}, Available: ${position ? position.qty : 0}`);
      }
    }

    // Execute trade
    const orderResponse = await fetch(`${ALPACA_BASE_URL}/v2/orders`, {
      method: 'POST',
      headers: alpacaHeaders,
      body: JSON.stringify({
        symbol: symbol,
        qty: quantity,
        side: action === 'BUY_STOCK' ? 'buy' : 'sell',
        type: 'market',
        time_in_force: 'day'
      })
    });

    if (!orderResponse.ok) {
      throw new Error(`Order placement failed: ${orderResponse.statusText}`);
    }

    const order = await orderResponse.json();

    // Update trading position
    await updateTradingPosition(
      userId,
      symbol,
      quantity,
      currentPrice,
      action === 'BUY_STOCK'
    );

    // Store the trade in the database
    await storeTradeInDatabase(userId, {
      orderId: order.id,
      symbol,
      quantity,
      price: currentPrice,
      type: action === 'BUY_STOCK' ? 'buy' : 'sell',
      status: order.status
    });

    const response = {
      success: true,
      message: `Successfully ${action === 'BUY_STOCK' ? 'bought' : 'sold'} ${quantity} shares of ${symbol} at $${currentPrice}`,
      data: {
        order,
        currentPrice,
        total: quantity * currentPrice
      }
    };

    // Store assistant response in conversation history
    await storeConversationHistory(userId, {
      role: 'assistant',
      content: response.message,
      timestamp: new Date().toISOString()
    });

    return response;
  } catch (error) {
    console.error('Trade execution error:', error);
    const errorMessage = `Failed to ${action === 'BUY_STOCK' ? 'buy' : 'sell'} ${symbol}: ${error.message}`;
    
    // Store error response in conversation history
    await storeConversationHistory(userId, {
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      message: errorMessage
    };
  }
}

// Get portfolio from Alpaca API
async function getPortfolio(userId: string) {
  try {
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      return {
        success: false,
        message: "Sorry, I can't fetch your portfolio right now because the trading service is not configured properly."
      };
    }
    
    // Get account information
    const accountResponse = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET
      }
    });
    
    const accountData = await accountResponse.json();
    
    // Get positions
    const positionsResponse = await fetch(`${ALPACA_BASE_URL}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET
      }
    });
    
    const positionsData = await positionsResponse.json();
    
    if (accountResponse.ok && positionsResponse.ok) {
      const equity = parseFloat(accountData.equity);
      const cash = parseFloat(accountData.cash);
      
      // Format positions data
      const positions = positionsData.map((position: any) => ({
        symbol: position.symbol,
        quantity: parseInt(position.qty),
        market_value: parseFloat(position.market_value),
        cost_basis: parseFloat(position.cost_basis),
        unrealized_pl: parseFloat(position.unrealized_pl),
        unrealized_plpc: parseFloat(position.unrealized_plpc) * 100
      }));
      
      // Store portfolio data in Supabase for future reference
      await storePortfolioInDatabase(userId, {
        equity,
        cash,
        positions,
        updated_at: new Date().toISOString()
      });
      
      // Generate a human-readable summary
      let summary = `Your portfolio is worth $${equity.toFixed(2)} with $${cash.toFixed(2)} in cash. `;
      
      if (positions.length > 0) {
        summary += `You own ${positions.length} different stocks:\n\n`;
        
        positions.forEach((pos: any) => {
          const plPrefix = pos.unrealized_pl >= 0 ? '+' : '';
          summary += `- ${pos.quantity} shares of ${pos.symbol}: $${pos.market_value.toFixed(2)} (${plPrefix}$${pos.unrealized_pl.toFixed(2)}, ${plPrefix}${pos.unrealized_plpc.toFixed(2)}%)\n`;
        });
      } else {
        summary += "You don't have any stock positions yet.";
      }
      
      return {
        success: true,
        message: summary,
        data: {
          account: accountData,
          positions
        }
      };
    } else {
      const errorMessage = accountResponse.ok 
        ? `Failed to fetch positions: ${JSON.stringify(positionsData)}` 
        : `Failed to fetch account: ${JSON.stringify(accountData)}`;
      
      return {
        success: false,
        message: `I couldn't fetch your complete portfolio. ${errorMessage}`
      };
    }
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return {
      success: false,
      message: "I encountered an error while fetching your portfolio. Please try again later."
    };
  }
}

// Get general response from Gemini API
async function getGeneralResponse(message: string) {
  try {
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        message: "I'm sorry, but I can't provide a detailed response at the moment because the AI service is not configured properly."
      };
    }
    
    const url = `https://generativelanguage.googleapis.com/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
      You are a helpful financial assistant that specializes in stocks, trading, and investment advice.
      
      User's message: "${message}"
      
      Provide a helpful, accurate, and concise response. If the user is asking about specific trading actions, explain that they can use commands like "Buy X shares of [symbol]" or "Sell X shares of [symbol]".
      
      Keep your response under 150 words.
    `;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    
    return {
      success: true,
      message: responseText.trim()
    };
  } catch (error) {
    console.error('Error getting general response:', error);
    return {
      success: false,
      message: "I'm having trouble processing your request right now. Please try again later."
    };
  }
}

// Store conversation in database
async function storeConversation(userId: string, userMessage: string, assistantResponse: string) {
  try {
    console.log('=== Storing conversation ===');
    const timestamp = new Date().toISOString();

    // Get existing conversation history
    const { data: existingHistory, error: fetchError } = await supabase
      .from('conversation_history')
      .select('messages')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching conversation history:', fetchError);
      throw fetchError;
    }

    // Prepare new messages
    const newMessages = [
      { role: 'user', content: userMessage, timestamp },
      { role: 'assistant', content: assistantResponse, timestamp }
    ];

    // Combine with existing messages or create new array
    let messages = existingHistory?.messages || [];
    messages = [...messages, ...newMessages];

    // Keep only the last 100 messages
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    // Update conversation history
    const { error: upsertError } = await supabase
      .from('conversation_history')
      .upsert({
        user_id: userId,
        messages,
        last_updated: timestamp
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error storing conversation:', upsertError);
      throw upsertError;
    }

    console.log('Conversation stored successfully');
  } catch (error) {
    console.error('Error in storeConversation:', error);
    // Don't throw error to prevent breaking the main flow
  }
}

// Store trade in Supabase
async function storeTradeInDatabase(userId: string, tradeData: any) {
  try {
    const { error } = await supabase
      .from('trading_orders')
      .insert({
        user_id: userId,
        ...tradeData
      });
    
    if (error) {
      console.error('Error storing trade:', error);
    }
  } catch (error) {
    console.error('Error storing trade:', error);
  }
}

// Store portfolio in Supabase
async function storePortfolioInDatabase(userId: string, portfolioData: any) {
  try {
    // Store summary record
    const { error: summaryError } = await supabase
      .from('trading_portfolios')
      .upsert({
        user_id: userId,
        equity: portfolioData.equity,
        cash: portfolioData.cash,
        updated_at: portfolioData.updated_at
      }, { onConflict: 'user_id' });
    
    if (summaryError) {
      console.error('Error storing portfolio summary:', summaryError);
    }
    
    // Store position records
    for (const position of portfolioData.positions) {
      const { error: positionError } = await supabase
        .from('trading_positions')
        .upsert({
          user_id: userId,
          symbol: position.symbol,
          quantity: position.quantity,
          market_value: position.market_value,
          cost_basis: position.cost_basis,
          unrealized_pl: position.unrealized_pl,
          unrealized_plpc: position.unrealized_plpc,
          updated_at: portfolioData.updated_at
        }, { onConflict: 'user_id, symbol' });
      
      if (positionError) {
        console.error('Error storing position:', positionError);
      }
    }
  } catch (error) {
    console.error('Error storing portfolio:', error);
  }
}

// Helper function to get market status and trading day info
async function getMarketStatus() {
  try {
    const [clockResponse, calendarResponse] = await Promise.all([
      fetch(`${ALPACA_BASE_URL}/v2/clock`, { headers: alpacaHeaders }),
      fetch(`${ALPACA_BASE_URL}/v2/calendar?start=${new Date().toISOString().split('T')[0]}&end=${new Date().toISOString().split('T')[0]}`, 
        { headers: alpacaHeaders })
    ]);

    if (!clockResponse.ok || !calendarResponse.ok) {
      throw new Error('Failed to fetch market status');
    }

    const clock = await clockResponse.json();
    const calendar = await calendarResponse.json();
    const now = new Date();
    const marketDay = calendar[0];

    return {
      is_open: clock.is_open,
      next_open: new Date(clock.next_open),
      next_close: new Date(clock.next_close),
      timestamp: now,
      trading_day: marketDay ? {
        open: new Date(marketDay.open),
        close: new Date(marketDay.close)
      } : null
    };
  } catch (error) {
    console.error('Error getting market status:', error);
    throw error;
  }
}

// Helper function to format market status message
function formatMarketStatusMessage(status: any): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      timeZone: 'America/New_York'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  if (status.is_open) {
    return `The market is currently OPEN. Trading will close at ${formatTime(status.next_close)} ET (in ${status.minutes_remaining} minutes).\n\nTrading hours today: ${formatTime(status.trading_day.open)} - ${formatTime(status.trading_day.close)} ET`;
  } else {
    const nextOpenDate = formatDate(status.next_open);
    const nextOpenTime = formatTime(status.next_open);
    return `The market is currently CLOSED. Next trading session starts on ${nextOpenDate} at ${nextOpenTime} ET.\n\nRegular trading hours are 9:30 AM - 4:00 PM ET, Monday through Friday.`;
  }
}
