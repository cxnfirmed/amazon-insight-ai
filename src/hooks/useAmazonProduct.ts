
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AmazonProduct {
  asin: string;
  title: string;
  manufacturer: string | null;
  category: string;
  image_url: string | null;
  buy_box_price: number | null;
  lowest_fba_price: number | null;
  lowest_fbm_price: number | null;
  amazon_price: number | null;
  offer_count: number;
  estimated_monthly_sales: number | null;
  in_stock: boolean;
  sales_rank: number | null;
  last_updated: string | null;
  data_source: 'Keepa' | 'Error';
  debug_data?: any;
  fees?: {
    pickAndPackFee: number | null;
    referralFee: number | null;
    storageFee: number | null;
    variableClosingFee: number | null;
  };
  price_history?: Array<{
    timestamp: string;
    buyBoxPrice?: number | null;
    amazonPrice?: number | null;
    newPrice?: number | null;
    salesRank?: number | null;
    offerCount?: number;
  }>;
}

export const useAmazonProduct = () => {
  const [product, setProduct] = useState<AmazonProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();

  const fetchProduct = useCallback(async (asin: string, forceFresh = false) => {
    setLoading(true);
    setProduct(null);

    try {
      console.log('Fetching product data for ASIN:', asin);

      // Call Keepa API
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin }
      });

      if (keepaError) {
        console.error('Keepa API call failed:', keepaError);
        throw new Error(`Keepa API failed: ${keepaError.message}`);
      }

      if (!keepaResponse?.success) {
        console.error('Keepa API returned unsuccessful response:', keepaResponse);
        throw new Error(keepaResponse?.error || 'Failed to fetch product data from Keepa');
      }

      const keepaData = keepaResponse.data;
      console.log('Keepa API successful, processing data...', {
        title: keepaData.title,
        buyBoxPrice: keepaData.buyBoxPrice,
        amazonPrice: keepaData.amazonPrice,
        lowestFBAPrice: keepaData.lowestFBAPrice,
        lowestFBMPrice: keepaData.lowestFBMPrice,
        offerCount: keepaData.offerCount,
        estimatedMonthlySales: keepaData.estimatedMonthlySales,
        fees: keepaData.fees
      });

      const productData: AmazonProduct = {
        asin: keepaData.asin,
        title: keepaData.title || 'Product title not available',
        manufacturer: keepaData.manufacturer,
        category: keepaData.category || 'Unknown',
        image_url: keepaData.imageUrl,
        buy_box_price: keepaData.buyBoxPrice,
        lowest_fba_price: keepaData.lowestFBAPrice,
        lowest_fbm_price: keepaData.lowestFBMPrice,
        amazon_price: keepaData.amazonPrice,
        offer_count: keepaData.offerCount || 0,
        estimated_monthly_sales: keepaData.estimatedMonthlySales,
        in_stock: keepaData.inStock || false,
        sales_rank: keepaData.salesRank,
        last_updated: keepaData.lastUpdate,
        data_source: 'Keepa',
        fees: keepaData.fees || null,
        debug_data: keepaResponse,
        price_history: keepaData.priceHistory || []
      };

      console.log('Product data processed successfully:', productData.title);
      setProduct(productData);

      toast({
        title: "Product Data Updated",
        description: `Successfully fetched data for ${productData.title}`,
      });

    } catch (error) {
      console.error('Product fetch error:', error);
      
      // Create error product object
      const errorProduct: AmazonProduct = {
        asin,
        title: 'Error loading product',
        manufacturer: null,
        category: 'Unknown',
        image_url: null,
        buy_box_price: null,
        lowest_fba_price: null,
        lowest_fbm_price: null,
        amazon_price: null,
        offer_count: 0,
        estimated_monthly_sales: null,
        in_stock: false,
        sales_rank: null,
        last_updated: null,
        data_source: 'Error',
        debug_data: { error: error.message }
      };
      
      setProduct(errorProduct);
      
      toast({
        title: "Error",
        description: `Failed to fetch product data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    product,
    loading,
    debugMode,
    setDebugMode,
    fetchProduct,
    setProduct
  };
};
