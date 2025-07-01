
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
      // Always fetch fresh data - no more mock data allowed
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
        throw new Error(data?.error || 'Failed to fetch real Amazon data');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: `Failed to fetch real Amazon data: ${error.message}`,
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
