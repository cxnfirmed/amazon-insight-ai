
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AmazonProduct {
  asin: string;
  upc?: string;
  title: string;
  brand?: string;
  category?: string;
  image_url?: string;
  dimensions?: string;
  weight?: string;
  current_price?: number;
  buy_box_price?: number;
  lowest_fba_price?: number;
  lowest_fbm_price?: number;
  sales_rank?: number;
  amazon_in_stock?: boolean;
  review_count?: number;
  rating?: number;
  roi_percentage?: number;
  profit_margin?: number;
  estimated_monthly_sales?: number;
  competition_level?: string;
  amazon_risk_score?: number;
  ip_risk_score?: number;
  time_to_sell_days?: number;
}

export const useAmazonProduct = () => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<AmazonProduct | null>(null);
  const { toast } = useToast();

  const fetchProduct = async (identifier: string, forceFresh: boolean = false) => {
    if (!identifier) return;

    console.log('Starting fetchProduct for identifier:', identifier, 'forceFresh:', forceFresh);
    setLoading(true);
    setProduct(null);
    
    try {
      // If not forcing fresh data, check if we have the product in our database
      let shouldFetchFromAmazon = forceFresh;
      let existingProduct = null;

      if (!forceFresh) {
        console.log('Checking database for existing product...');
        const { data: dbProduct, error: dbError } = await supabase
          .from('products')
          .select(`
            *,
            product_analytics(*),
            price_history(*)
          `)
          .or(`asin.eq.${identifier},upc.eq.${identifier}`)
          .order('timestamp', { foreignTable: 'price_history', ascending: false })
          .limit(1, { foreignTable: 'price_history' })
          .single();

        if (dbProduct && !dbError) {
          console.log('Found existing product in database:', dbProduct);
          existingProduct = dbProduct;
          
          // Get the latest price data
          const latestPrice = dbProduct.price_history?.[0];
          
          // More specific mock data detection - only consider it mock if title contains "Amazon Product" AND brand is "Unknown Brand"
          const isMockData = (dbProduct.title?.includes('Amazon Product') && dbProduct.brand === 'Unknown Brand') ||
                           (!latestPrice?.buy_box_price && !latestPrice?.rating && !latestPrice?.review_count);
          
          if (isMockData) {
            console.log('Detected mock data in database, forcing fresh fetch');
            shouldFetchFromAmazon = true;
          } else {
            console.log('Found real product data in database, using cached version');
          }
        } else {
          console.log('No existing product found in database, will fetch fresh');
          shouldFetchFromAmazon = true;
        }
      }

      if (shouldFetchFromAmazon || !existingProduct) {
        console.log('Fetching fresh data from Amazon for identifier:', identifier);
        
        // Fetch from Amazon
        const { data, error } = await supabase.functions.invoke('fetch-amazon-product', {
          body: identifier.length === 10 ? { asin: identifier } : { upc: identifier }
        });

        console.log('Edge function response:', { data, error });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        if (data?.success && data?.product) {
          console.log('Successfully fetched fresh product data from Amazon:', data.product);
          setProduct(data.product);
          toast({
            title: "Product Found",
            description: `Successfully loaded fresh data for ${data.product.title}`,
          });
        } else {
          console.error('No product data returned from edge function:', data);
          throw new Error(data?.error || 'No product data returned');
        }
      } else {
        console.log('Using existing product data from database:', existingProduct);
        // Product exists and is not mock data, use cached data
        const latestPrice = existingProduct.price_history?.[0];
        const analytics = existingProduct.product_analytics?.[0];
        
        const productData = {
          asin: existingProduct.asin,
          upc: existingProduct.upc,
          title: existingProduct.title,
          brand: existingProduct.brand,
          category: existingProduct.category,
          image_url: existingProduct.image_url,
          dimensions: existingProduct.dimensions,
          weight: existingProduct.weight,
          buy_box_price: latestPrice?.buy_box_price,
          lowest_fba_price: latestPrice?.lowest_fba_price,
          lowest_fbm_price: latestPrice?.lowest_fbm_price,
          sales_rank: latestPrice?.sales_rank,
          amazon_in_stock: latestPrice?.amazon_in_stock,
          review_count: latestPrice?.review_count,
          rating: latestPrice?.rating,
          roi_percentage: analytics?.roi_percentage,
          profit_margin: analytics?.profit_margin,
          estimated_monthly_sales: analytics?.estimated_monthly_sales,
          competition_level: analytics?.competition_level,
          amazon_risk_score: analytics?.amazon_risk_score,
          ip_risk_score: analytics?.ip_risk_score,
          time_to_sell_days: analytics?.time_to_sell_days
        };
        
        console.log('Setting product data from database:', productData);
        setProduct(productData);
        
        toast({
          title: "Product Loaded",
          description: `Found cached data for ${productData.title}`,
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: `Failed to fetch product data: ${error.message}`,
        variant: "destructive",
      });
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    product,
    fetchProduct,
    setProduct
  };
};
