/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Alpaca API credentials
const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY') || '';
const ALPACA_API_SECRET = Deno.env.get('ALPACA_API_SECRET') || '';
const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets'; // Paper trading URL

// Gemini API key
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

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
        lastUpdated: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (upsertError) {
      console.error('Error storing conversation history:', upsertError);
    }
  } catch (error) {
    console.error('Error in storeConversationHistory:', error);
  }
}

// Define the main handler for the Edge Function
serve(async (req) => {
  // Add CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Extract the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log('=== Starting request processing ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Get request body
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    const { message, userId, messageType } = requestBody;
    
    // Validate environment variables with detailed logging
    console.log('=== Validating environment variables ===');
    const envCheck = {
      GEMINI_API_KEY: !!GEMINI_API_KEY,
      ALPACA_API_KEY: !!ALPACA_API_KEY,
      ALPACA_API_SECRET: !!ALPACA_API_SECRET,
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_KEY: !!supabaseKey
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
      
      if (!['GET_STOCK_PRICE', 'BUY_STOCK', 'SELL_STOCK', 'GET_PORTFOLIO', 'GENERAL'].includes(intent.action)) {
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
        response = await executeTrade(userId, 'buy', intent.symbol, intent.quantity);
        break;
      case 'SELL_STOCK':
          console.log('Executing sell order for:', intent.symbol, intent.quantity);
        response = await executeTrade(userId, 'sell', intent.symbol, intent.quantity);
        break;
      case 'GET_PORTFOLIO':
          console.log('Getting portfolio for user:', userId);
        response = await getPortfolio(userId);
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
async function processMessageWithGemini(message) {
  console.log('=== Starting Gemini processing ===');
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }
    
    // Extract stock symbol and quantity before Gemini processing
    const buyMatch = message.match(/buy\s+(\d+)\s+shares?\s+of\s+([A-Z]{1,5})/i);
    const sellMatch = message.match(/sell\s+(\d+)\s+shares?\s+of\s+([A-Z]{1,5})/i);
    const match = buyMatch || sellMatch;
    
    if (match) {
      const quantity = parseInt(match[1]);
      const symbol = match[2];
      const action = buyMatch ? 'BUY_STOCK' : 'SELL_STOCK';
      
      console.log('Extracted trade details:', { action, symbol, quantity });
      
      return {
        action,
        symbol,
        quantity,
        confidence: 0.95
      };
    }
    
    // Fallback to Gemini processing for other queries
    const url = `https://generativelanguage.googleapis.com/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    console.log('Sending request to Gemini API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a financial assistant that helps users trade stocks and analyze their portfolio.
                   Based on the following user message, determine the user's intent and extract relevant information.
                   Message: "${message}"
                   Respond with a JSON object in this exact format:
                   {
                     "action": "GET_STOCK_PRICE" | "BUY_STOCK" | "SELL_STOCK" | "GET_PORTFOLIO" | "GENERAL",
                     "symbol": "Stock symbol if applicable",
                     "quantity": "Number of shares if applicable",
                     "confidence": "Confidence score between 0 and 1"
                   }
                   
                   Examples:
                   - "What's the price of AAPL?" → {"action": "GET_STOCK_PRICE", "symbol": "AAPL", "quantity": null, "confidence": 0.95}
                   - "Buy 5 shares of TSLA" → {"action": "BUY_STOCK", "symbol": "TSLA", "quantity": 5, "confidence": 0.98}
                   
                   Only respond with the JSON object, no other text.`
          }]
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Gemini API raw response:', JSON.stringify(data));
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('GEMINI_INVALID_RESPONSE_FORMAT');
    }
    
    const textResponse = data.candidates[0].content.parts[0].text;
    console.log('Gemini text response:', textResponse);
    
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('GEMINI_NO_JSON_FOUND');
    }
    
      try {
        const intentJson = JSON.parse(jsonMatch[0]);
      console.log('Parsed intent:', intentJson);
      
      // Validate intent structure
      if (!intentJson.action || !['GET_STOCK_PRICE', 'BUY_STOCK', 'SELL_STOCK', 'GET_PORTFOLIO', 'GENERAL'].includes(intentJson.action)) {
        throw new Error(`Invalid action in intent: ${intentJson.action}`);
      }
      
      // Use extracted symbol and quantity if available
      if (symbol) intentJson.symbol = symbol;
      if (quantity) intentJson.quantity = quantity;
      
        return intentJson;
      } catch (e) {
        console.error('Error parsing JSON from Gemini response:', e);
      throw new Error('GEMINI_INVALID_JSON');
    }
  } catch (error) {
    console.error('Error in Gemini processing:', error);
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

// Execute a stock trade via Alpaca API
async function executeTrade(userId: string, orderType: 'buy' | 'sell', symbol: string, quantity: number) {
  console.log('=== Starting trade execution ===');
  console.log('Trade parameters:', { userId, orderType, symbol, quantity });
  
  try {
    // Validate API credentials
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      console.error('Missing Alpaca API credentials');
      return {
        success: false,
        message: "Sorry, I can't execute trades right now because the trading service is not configured properly.",
        debug: { error: 'ALPACA_CREDENTIALS_MISSING' }
      };
    }
    
    // Validate trade parameters
    if (!symbol) {
      console.error('Missing symbol');
      return {
        success: false,
        message: "I couldn't determine which stock you want to trade. Please specify a stock symbol.",
        debug: { error: 'MISSING_SYMBOL' }
      };
    }
    
    if (!quantity || quantity <= 0) {
      console.error('Invalid quantity:', quantity);
      return {
        success: false,
        message: `Please specify how many shares of ${symbol} you want to ${orderType}.`,
        debug: { error: 'INVALID_QUANTITY', quantity }
      };
    }
    
    // Get current price
    console.log('Fetching current price for:', symbol);
    const priceInfo = await getStockPrice(symbol);
    if (!priceInfo?.success || !priceInfo?.data?.price) {
      console.error('Failed to get price info:', priceInfo);
      return {
        success: false,
        message: `I couldn't get the current price for ${symbol}. Please try again later.`,
        debug: { error: 'PRICE_FETCH_FAILED', priceInfo }
      };
    }
    
    const currentPrice = priceInfo.data.price;
    console.log('Current price:', currentPrice);
    
    // Check account status and buying power (for buy orders)
    if (orderType === 'buy') {
      console.log('Checking account status...');
      try {
        const accountResponse = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_API_SECRET
          }
        });
        
        if (!accountResponse.ok) {
          const accountError = await accountResponse.text();
          console.error('Failed to fetch account info:', accountError);
          return {
            success: false,
            message: "I couldn't verify your account status. Please try again later.",
            debug: { error: 'ACCOUNT_FETCH_FAILED', details: accountError }
          };
        }
        
        const accountData = await accountResponse.json();
        const buyingPower = parseFloat(accountData.buying_power);
        const orderCost = currentPrice * quantity;
        
        if (orderCost > buyingPower) {
          console.error('Insufficient buying power:', { buyingPower, orderCost });
          return {
            success: false,
            message: `You don't have enough buying power to purchase ${quantity} shares of ${symbol} at $${currentPrice.toFixed(2)} (Total cost: $${orderCost.toFixed(2)}, Available: $${buyingPower.toFixed(2)})`,
            debug: { error: 'INSUFFICIENT_BUYING_POWER', buyingPower, orderCost }
          };
        }
      } catch (error) {
        console.error('Error checking account status:', error);
        return {
          success: false,
          message: "I couldn't verify your account status. Please try again later.",
          debug: { error: 'ACCOUNT_CHECK_FAILED', details: error.message }
        };
      }
    }
    
    // Create order
    console.log('Creating Alpaca order:', {
      symbol,
      qty: quantity,
      side: orderType,
      type: 'market',
      time_in_force: 'day'
    });
    
    const orderResponse = await fetch(`${ALPACA_BASE_URL}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: symbol,
        qty: quantity,
        side: orderType,
        type: 'market',
        time_in_force: 'day'
      })
    });
    
    const orderData = await orderResponse.json();
    console.log('Alpaca order response:', orderData);
    
    if (!orderResponse.ok) {
      console.error('Order creation failed:', orderData);
      return {
        success: false,
        message: `Failed to ${orderType} ${symbol}: ${orderData.message || 'Unknown error'}`,
        debug: { error: 'ORDER_CREATION_FAILED', response: orderData }
      };
    }
    
    // Store order in database
    console.log('Storing order in database...');
    try {
      await storeTradeInDatabase(userId, {
        order_id: orderData.id,
        symbol,
        quantity,
        price: currentPrice,
        order_type: orderType,
        status: orderData.status,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store order in database:', error);
      // Don't fail the request if database storage fails
    }
    
    // Update portfolio
    console.log('Updating portfolio...');
    try {
      await updatePortfolioAfterTrade(userId, symbol, quantity, currentPrice, orderType);
    } catch (error) {
      console.error('Failed to update portfolio:', error);
      // Don't fail the request if portfolio update fails
    }
    
    console.log('=== Trade execution complete ===');
      return {
        success: true,
      message: `Successfully placed order to ${orderType} ${quantity} shares of ${symbol} at $${currentPrice.toFixed(2)}. Order ID: ${orderData.id}, Status: ${orderData.status}`,
      data: {
        order: orderData,
        price: currentPrice
      }
    };
    
  } catch (error) {
    console.error('Error executing trade:', error);
    return {
      success: false,
      message: `I encountered an error while trying to ${orderType} ${symbol}. Please try again later.`,
      debug: { error: error.message }
    };
  }
}

// New function to update portfolio after trade
async function updatePortfolioAfterTrade(userId: string, symbol: string, quantity: number, price: number, orderType: 'buy' | 'sell') {
  console.log('=== Starting portfolio update after trade ===');
  console.log('Trade details:', { userId, symbol, quantity, price, orderType });

  try {
    // Get current portfolio data
    let portfolioData;
    const { data: portfolioResult, error: portfolioError } = await supabase
      .from('trading_portfolios')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (portfolioError) {
      console.error('Error fetching portfolio:', portfolioError);
      if (portfolioError.code === 'PGRST116') { // No portfolio found
        // Create initial portfolio if it doesn't exist
        const { data: newPortfolio, error: createError } = await supabase
          .from('trading_portfolios')
          .insert({
            user_id: userId,
            equity: 0,
            cash: 100000, // Default starting cash
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating initial portfolio:', createError);
          return;
        }
        
        portfolioData = newPortfolio;
      } else {
        return;
      }
    } else {
      portfolioData = portfolioResult;
    }
    
    console.log('Current portfolio data:', portfolioData);
    
    // Get current positions
    const { data: positionsData, error: positionsError } = await supabase
      .from('trading_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .single();
    
    if (positionsError && positionsError.code !== 'PGRST116') {
      console.error('Error fetching positions:', positionsError);
      return;
    }
    
    const currentPosition = positionsData || {
      symbol,
      quantity: 0,
      cost_basis: 0,
      market_value: 0,
      unrealized_pl: 0,
      unrealized_plpc: 0
    };
    
    console.log('Current position data:', currentPosition);
    
    // Calculate new position values
    const newQuantity = orderType === 'buy' 
      ? currentPosition.quantity + quantity 
      : currentPosition.quantity - quantity;
    
    if (newQuantity < 0) {
      console.error('Invalid trade: Would result in negative shares');
      return;
    }
    
    const newMarketValue = newQuantity * price;
    const newCostBasis = orderType === 'buy'
      ? (currentPosition.cost_basis * currentPosition.quantity + price * quantity) / newQuantity
      : currentPosition.cost_basis;
    
    const newUnrealizedPl = newMarketValue - (newCostBasis * newQuantity);
    const newUnrealizedPlpc = newUnrealizedPl / (newCostBasis * newQuantity) * 100;
    
    console.log('Calculated new position values:', {
      newQuantity,
      newMarketValue,
      newCostBasis,
      newUnrealizedPl,
      newUnrealizedPlpc
    });
    
    // Update or insert position
    if (newQuantity > 0) {
      const { error: upsertError } = await supabase
        .from('trading_positions')
        .upsert({
          user_id: userId,
          symbol,
          quantity: newQuantity,
          market_value: newMarketValue,
          cost_basis: newCostBasis,
          unrealized_pl: newUnrealizedPl,
          unrealized_plpc: newUnrealizedPlpc,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, symbol' });
      
      if (upsertError) {
        console.error('Error updating position:', upsertError);
        return;
      }
      console.log('Successfully updated position');
    } else {
      // Delete position if quantity is 0
      const { error: deleteError } = await supabase
        .from('trading_positions')
        .delete()
        .eq('user_id', userId)
        .eq('symbol', symbol);
      
      if (deleteError) {
        console.error('Error deleting position:', deleteError);
        return;
      }
      console.log('Successfully deleted position');
    }
    
    // Update portfolio summary
    const { data: allPositions, error: allPositionsError } = await supabase
      .from('trading_positions')
      .select('market_value')
      .eq('user_id', userId);
    
    if (allPositionsError) {
      console.error('Error fetching all positions:', allPositionsError);
      return;
    }
    
    const totalEquity = allPositions?.reduce((sum, pos) => sum + pos.market_value, 0) || 0;
    const cash = orderType === 'buy' 
      ? portfolioData.cash - (price * quantity)
      : portfolioData.cash + (price * quantity);
    
    if (cash < 0) {
      console.error('Invalid trade: Would result in negative cash balance');
      return;
    }
    
    console.log('Updating portfolio summary:', { totalEquity, cash });
    
    const { error: portfolioUpdateError } = await supabase
      .from('trading_portfolios')
      .upsert({
        user_id: userId,
        equity: totalEquity,
        cash,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (portfolioUpdateError) {
      console.error('Error updating portfolio:', portfolioUpdateError);
      return;
    }
    
    console.log('=== Portfolio update completed successfully ===');
  } catch (error) {
    console.error('Error updating portfolio after trade:', error);
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

// Store conversation in Supabase
async function storeConversation(userId: string, userMessage: string, assistantResponse: string) {
  try {
    const timestamp = new Date().toISOString();
    const newMessages = [
      { role: 'user', content: userMessage, timestamp },
      { role: 'assistant', content: assistantResponse, timestamp }
    ];

    // Get existing conversation history
    const { data: existingData, error: fetchError } = await supabase
      .from('conversation_history')
      .select('messages')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching conversation history:', fetchError);
      return;
    }

    let messages = existingData?.messages || [];
    messages = [...messages, ...newMessages];

    // Keep only the last 100 messages
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    // Upsert conversation history
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
    }
  } catch (error) {
    console.error('Error in storeConversation:', error);
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
