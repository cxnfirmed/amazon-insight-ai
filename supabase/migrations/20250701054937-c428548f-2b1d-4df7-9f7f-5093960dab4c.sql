
-- Create products table to store Amazon product data
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asin VARCHAR(10) UNIQUE NOT NULL,
  upc VARCHAR(20),
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  dimensions TEXT,
  weight TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_history table to track pricing data over time
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asin VARCHAR(10) NOT NULL REFERENCES public.products(asin) ON DELETE CASCADE,
  buy_box_price DECIMAL(10,2),
  lowest_fba_price DECIMAL(10,2),
  lowest_fbm_price DECIMAL(10,2),
  sales_rank INTEGER,
  amazon_in_stock BOOLEAN DEFAULT false,
  review_count INTEGER,
  rating DECIMAL(3,2),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_analytics table for calculated metrics
CREATE TABLE public.product_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asin VARCHAR(10) NOT NULL REFERENCES public.products(asin) ON DELETE CASCADE,
  roi_percentage DECIMAL(5,2),
  profit_margin DECIMAL(10,2),
  estimated_monthly_sales INTEGER,
  competition_level TEXT,
  amazon_risk_score INTEGER,
  ip_risk_score INTEGER,
  time_to_sell_days INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asin)
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is product data)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Anyone can view analytics" ON public.product_analytics FOR SELECT USING (true);

-- Create policies for system inserts/updates (for backend functions)
CREATE POLICY "System can manage products" ON public.products FOR ALL USING (true);
CREATE POLICY "System can manage price history" ON public.price_history FOR ALL USING (true);
CREATE POLICY "System can manage analytics" ON public.product_analytics FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_products_asin ON public.products(asin);
CREATE INDEX idx_products_upc ON public.products(upc);
CREATE INDEX idx_price_history_asin ON public.price_history(asin);
CREATE INDEX idx_price_history_timestamp ON public.price_history(timestamp DESC);
CREATE INDEX idx_analytics_asin ON public.product_analytics(asin);
