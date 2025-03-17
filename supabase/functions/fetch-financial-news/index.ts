
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

// News cache in Supabase database
interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  topics: string[];
  tickers: string[];
  fetch_date: string;
}

// Define the main handler for the Edge Function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { watchlistSymbols = [] } = await req.json();
    
    console.log(`Fetching financial news, watchlist symbols: ${watchlistSymbols.join(', ')}`);
    
    // Check if we have cached news that's less than 1 hour old
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const { data: cachedNews, error: cacheError } = await supabase
      .from('financial_news_cache')
      .select('*')
      .gt('fetch_date', oneHourAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(30);
    
    if (cacheError) {
      console.error('Error fetching cached news:', cacheError);
    } else if (cachedNews && cachedNews.length > 0) {
      console.log(`Using ${cachedNews.length} cached news items from database`);
      return new Response(
        JSON.stringify({ news: cachedNews }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // No cached news or cache is expired, fetch new news from Alpha Vantage
    const apiKey = 'ERZP1A2SEHQWGFE1';
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${apiKey}`;
    
    console.log(`Fetching news from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error fetching news: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `API error: ${response.statusText}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.feed || !Array.isArray(data.feed)) {
      console.error('Unexpected API response format:', data);
      return new Response(
        JSON.stringify({ error: 'Unexpected API response format', news: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Transform API response to our format
    const news: NewsItem[] = data.feed.map((item: any, index: number) => ({
      id: item.id || `news-${index}-${Date.now()}`,
      title: item.title,
      summary: item.summary,
      url: item.url,
      source: item.source,
      published_at: item.time_published,
      topics: item.topics?.map((t: any) => t.topic) || [],
      tickers: item.ticker_sentiment?.map((t: any) => t.ticker) || [],
      fetch_date: new Date().toISOString()
    }));
    
    console.log(`Fetched ${news.length} news items from API`);
    
    // Store news in cache
    if (news.length > 0) {
      // First, clear old cache
      const { error: deleteError } = await supabase
        .from('financial_news_cache')
        .delete()
        .lt('fetch_date', oneHourAgo.toISOString());
        
      if (deleteError) {
        console.error('Error clearing old news cache:', deleteError);
      }
      
      // Insert new items into cache
      const { error: insertError } = await supabase
        .from('financial_news_cache')
        .insert(news);
        
      if (insertError) {
        console.error('Error caching news:', insertError);
      } else {
        console.log(`Cached ${news.length} news items in database`);
      }
    }
    
    return new Response(
      JSON.stringify({ news }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in fetch-financial-news function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
