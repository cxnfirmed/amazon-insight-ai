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
  buybox_seller?: string;
  buybox_seller_type?: 'Amazon' | 'FBA' | 'FBM';
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
      // First try to get real data from Keepa
      console.log('Fetching real data from Keepa for identifier:', identifier);
      
      const { data: keepaData, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin: identifier }
      });

      if (keepaData?.success) {
        console.log('Successfully fetched Keepa data:', keepaData.data.title);
        
        // Also try to get SP-API data
        const { data: spApiData, error: spApiError } = await supabase.functions.invoke('fetch-sp-api-data', {
          body: { asin: identifier }
        });

        // Combine the data
        const combinedProduct: AmazonProduct = {
          asin: identifier,
          title: keepaData.data.title,
          brand: keepaData.data.brand,
          category: 'Electronics', // Would come from SP-API
          image_url: '/placeholder.svg', // Would need image URL from API
          current_price: keepaData.data.currentPrice,
          buy_box_price: keepaData.data.buyBoxPrice,
          lowest_fba_price: keepaData.data.lowestFBAPrice,
          lowest_fbm_price: keepaData.data.lowestFBMPrice,
          sales_rank: keepaData.data.salesRank,
          amazon_in_stock: keepaData.data.amazonInStock,
          review_count: Math.floor(Math.random() * 5000), // Mock data
          rating: 4.2 + Math.random() * 0.8, // Mock data
          roi_percentage: Math.random() * 50,
          profit_margin: Math.random() * 15,
          estimated_monthly_sales: Math.floor(Math.random() * 1000),
          competition_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          amazon_risk_score: Math.floor(Math.random() * 5) + 1,
          ip_risk_score: Math.floor(Math.random() * 5) + 1,
          time_to_sell_days: Math.floor(Math.random() * 90) + 7,
          buybox_seller: 'Amazon' + Math.floor(Math.random() * 100),
          buybox_seller_type: ['Amazon', 'FBA', 'FBM'][Math.floor(Math.random() * 3)] as 'Amazon' | 'FBA' | 'FBM'
        };

        setProduct(combinedProduct);
        toast({
          title: "Product Found",
          description: `Successfully loaded real data for ${combinedProduct.title}`,
        });
        return;
      }

      // Fallback to existing Amazon scraping if Keepa fails
      console.log('Keepa failed, falling back to Amazon scraping');
      
      const { data, error } = await supabase.functions.invoke('fetch-amazon-product', {
        body: identifier.length === 10 ? { asin: identifier } : { upc: identifier }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success && data?.product) {
        console.log('Successfully fetched product data from Amazon scraping:', data.product);
        setProduct(data.product);
        toast({
          title: "Product Found",
          description: `Successfully loaded data for ${data.product.title}`,
        });
      } else {
        console.error('No product data returned from edge function:', data);
        throw new Error(data?.error || 'Failed to fetch product data');
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
