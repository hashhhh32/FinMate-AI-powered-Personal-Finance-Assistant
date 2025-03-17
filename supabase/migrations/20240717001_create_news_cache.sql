
-- Create a table for caching financial news
CREATE TABLE IF NOT EXISTS public.financial_news_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  topics TEXT[] DEFAULT '{}',
  tickers TEXT[] DEFAULT '{}',
  fetch_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No need for RLS on this table as it's public news data
ALTER TABLE public.financial_news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to news cache" ON public.financial_news_cache FOR SELECT USING (true);
