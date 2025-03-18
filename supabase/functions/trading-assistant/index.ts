
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

// Alpaca API credentials
const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY') || '';
const ALPACA_API_SECRET = Deno.env.get('ALPACA_API_SECRET') || '';
const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets'; // Paper trading URL

// Gemini API key
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

// Alpha Vantage API key (reusing existing key)
const ALPHA_VANTAGE_API_KEY = 'ERZP1A2SEHQWGFE1';

// Define the main handler for the Edge Function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { message, userId, messageType } = await req.json();
    
    console.log('Received request:', { message, userId, messageType });
    
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing message with Gemini API');
    
    // Check if API keys are properly set
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "I can't process your request right now because the AI service is not configured properly. Please try again later."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      console.error('Alpaca API credentials are not set');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "I can't process your trading request right now because the trading service is not configured properly. Please try again later."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Process the message using Gemini API to determine intent
    const intent = await processMessageWithGemini(message);
    
    console.log('Processed intent:', intent);
    
    let response;
    
    // Handle different intents
    switch (intent.action) {
      case 'GET_STOCK_PRICE':
        response = await getStockPrice(intent.symbol);
        break;
      case 'BUY_STOCK':
        response = await executeTrade(userId, 'buy', intent.symbol, intent.quantity);
        break;
      case 'SELL_STOCK':
        response = await executeTrade(userId, 'sell', intent.symbol, intent.quantity);
        break;
      case 'GET_PORTFOLIO':
        response = await getPortfolio(userId);
        break;
      default:
        // General conversation if no specific intent is detected
        response = await getGeneralResponse(message);
        break;
    }
    
    // Store the conversation in Supabase
    await storeConversation(userId, message, response.message);
    
    console.log('Returning response:', response);
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in trading-assistant function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `I'm having trouble processing your request right now. Please try again later. (Error: ${error.message})` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Process message with Gemini API to determine intent
async function processMessageWithGemini(message) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
      You are a financial assistant that helps users trade stocks and analyze their portfolio.
      
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
      - "What's the current price of Apple?" → { "action": "GET_STOCK_PRICE", "symbol": "AAPL", "quantity": null, "confidence": 0.95 }
      - "Buy 5 shares of Tesla" → { "action": "BUY_STOCK", "symbol": "TSLA", "quantity": 5, "confidence": 0.98 }
      - "Sell 10 Microsoft shares" → { "action": "SELL_STOCK", "symbol": "MSFT", "quantity": 10, "confidence": 0.97 }
      - "Show me my portfolio" → { "action": "GET_PORTFOLIO", "symbol": null, "quantity": null, "confidence": 0.96 }
      - "How does the market look today?" → { "action": "GENERAL", "symbol": null, "quantity": null, "confidence": 0.90 }
      
      Only respond with the JSON object, no other text.
    `;
    
    console.log('Sending prompt to Gemini API');
    
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
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status}, ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract the JSON response from the text
    const textResponse = data.candidates[0].content.parts[0].text;
    console.log('Gemini API response:', textResponse);
    
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const intentJson = JSON.parse(jsonMatch[0]);
        return intentJson;
      } catch (e) {
        console.error('Error parsing JSON from Gemini response:', e);
        return { action: 'GENERAL', symbol: null, quantity: null, confidence: 0 };
      }
    } else {
      console.error('Could not extract JSON from Gemini response:', textResponse);
      return { action: 'GENERAL', symbol: null, quantity: null, confidence: 0 };
    }
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    return { action: 'GENERAL', symbol: null, quantity: null, confidence: 0 };
  }
}

// Get stock price from Alpha Vantage API
async function getStockPrice(symbol: string) {
  try {
    if (!symbol) {
      return {
        success: false,
        message: "I couldn't determine which stock you're asking about. Please specify a stock symbol or company name."
      };
    }
    
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const price = parseFloat(data['Global Quote']['05. price']);
      const change = parseFloat(data['Global Quote']['09. change']);
      const changePercent = data['Global Quote']['10. change percent'];
      
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
    } else if (data['Note'] && data['Note'].includes('API call frequency')) {
      // Handle API limit error
      return {
        success: false,
        message: `I'm having trouble fetching the current price for ${symbol} due to API rate limits. Please try again in a minute.`
      };
    } else {
      // Handle invalid symbol or other errors
      return {
        success: false,
        message: `I couldn't find price information for ${symbol}. Please check if the stock symbol is correct.`
      };
    }
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return {
      success: false,
      message: `I encountered an error while fetching the price for ${symbol}. Please try again later.`
    };
  }
}

// Execute a stock trade via Alpaca API
async function executeTrade(userId: string, orderType: 'buy' | 'sell', symbol: string, quantity: number) {
  try {
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      return {
        success: false,
        message: "Sorry, I can't execute trades right now because the trading service is not configured properly."
      };
    }
    
    if (!symbol) {
      return {
        success: false,
        message: "I couldn't determine which stock you want to trade. Please specify a stock symbol."
      };
    }
    
    if (!quantity || quantity <= 0) {
      return {
        success: false,
        message: `Please specify how many shares of ${symbol} you want to ${orderType}.`
      };
    }
    
    // Get current price before executing the trade
    const priceInfo = await getStockPrice(symbol);
    
    // Create order with Alpaca API
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
    
    if (orderResponse.ok) {
      // Store the order in Supabase
      await storeTradeInDatabase(userId, {
        order_id: orderData.id,
        symbol,
        quantity,
        price: priceInfo.success ? priceInfo.data.price : null,
        order_type: orderType,
        status: orderData.status,
        created_at: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Successfully placed order to ${orderType} ${quantity} shares of ${symbol}. Order ID: ${orderData.id}, Status: ${orderData.status}`,
        data: orderData
      };
    } else {
      return {
        success: false,
        message: `Failed to ${orderType} ${symbol}: ${orderData.message || 'Unknown error'}`,
        data: orderData
      };
    }
  } catch (error) {
    console.error(`Error executing ${orderType} order:`, error);
    return {
      success: false,
      message: `I encountered an error while trying to ${orderType} ${symbol}. Please try again later.`
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
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
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
async function storeConversation(userId, userMessage, assistantResponse) {
  try {
    console.log('Storing conversation in Supabase');
    
    const { error } = await supabase
      .from('trading_conversations')
      .insert({
        user_id: userId,
        user_message: userMessage,
        assistant_response: assistantResponse,
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error storing conversation:', error);
    }
  } catch (error) {
    console.error('Error storing conversation:', error);
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
