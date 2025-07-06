import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AmazonProduct {
  asin: string;
  title: string;
  manufacturer?: string;
  category?: string;
  image_url?: string;
  buy_box_price?: number;
  lowest_fba_price?: number;
  lowest_fbm_price?: number;
  offer_count?: number;
  estimated_monthly_sales?: number;
  in_stock?: boolean;
  sales_rank?: number;
  price_history?: Array<{
    timestamp: string;
    buyBoxPrice?: number;
    amazonPrice?: number;
    newPrice?: number;
    salesRank?: number;
    offerCount?: number;
  }>;
  data_source?: 'Keepa' | 'Error';
  last_updated?: string;
  debug_data?: any;
}

export const useAmazonProduct = () => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<AmazonProduct | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();

  const fetchProduct = async (identifier: string, forceFresh: boolean = false) => {
    if (!identifier) return;

    console.log('Starting Keepa product fetch for ASIN:', identifier);
    setLoading(true);
    setProduct(null);
    
    try {
      console.log('Fetching product data from Keepa API...');
      
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin: identifier, domain: 1 }
      });

      if (keepaResponse?.success && keepaResponse.data) {
        console.log('Keepa fetch successful:', keepaResponse.data);
        
        const keepaData = keepaResponse.data;
        
        // Build product from Keepa data
        const keepaProduct: AmazonProduct = {
          asin: identifier,
          title: keepaData.title,
          manufacturer: keepaData.manufacturer,
          category: keepaData.category,
          image_url: keepaData.imageUrl,
          
          // Pricing data
          buy_box_price: keepaData.buyBoxPrice,
          lowest_fba_price: keepaData.lowestFBAPrice,
          lowest_fbm_price: keepaData.lowestFBMPrice,
          
          // Sales and inventory
          offer_count: keepaData.offerCount,
          estimated_monthly_sales: keepaData.estimatedMonthlySales,
          in_stock: keepaData.inStock,
          sales_rank: keepaData.salesRank,
          
          // Historical data
          price_history: keepaData.priceHistory || [],
          
          data_source: 'Keepa',
          last_updated: new Date().toISOString(),
          debug_data: debugMode ? keepaResponse : undefined
        };

        setProduct(keepaProduct);
        
        toast({
          title: "Keepa Data Loaded",
          description: `Product data loaded: ${keepaProduct.title}`,
        });
        
        return;
      }

      // Keepa API failed
      console.error('Keepa API failed:', keepaError);
      
      toast({
        title: "Keepa API Failed",
        description: `Unable to fetch data for ASIN ${identifier}. ${keepaError?.message || 'API error occurred'}`,
        variant: "destructive",
      });

      // Set error state product
      setProduct({
        asin: identifier,
        title: 'Keepa API data not available',
        data_source: 'Error',
        last_updated: new Date().toISOString(),
        debug_data: debugMode ? { keepaError } : undefined
      } as AmazonProduct);

    } catch (error) {
      console.error('Critical error in fetchProduct:', error);
      
      toast({
        title: "System Error",
        description: `Critical error fetching product data: ${error.message}`,
        variant: "destructive",
      });

      setProduct({
        asin: identifier,
        title: 'System error occurred',
        data_source: 'Error',
        last_updated: new Date().toISOString(),
        debug_data: debugMode ? { error: error.message } : undefined
      } as AmazonProduct);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    product,
    fetchProduct,
    setProduct,
    debugMode,
    setDebugMode
  };
};
