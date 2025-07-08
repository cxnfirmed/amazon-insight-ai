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
  upc_conversion?: {
    originalUpc: string;
    convertedAsin: string;
  };
}

export const useAmazonProduct = () => {
  const [product, setProduct] = useState<AmazonProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();

  // Helper function to detect if input is a UPC (12 digits)
  const isUpc = useCallback((input: string): boolean => {
    return /^\d{12}$/.test(input.trim());
  }, []);

  // Helper function to detect if input is an ASIN (10 alphanumeric characters)
  const isAsin = useCallback((input: string): boolean => {
    return /^[A-Z0-9]{10}$/.test(input.trim().toUpperCase());
  }, []);

  const convertUpcToAsin = useCallback(async (upc: string): Promise<string> => {
    console.log('Converting UPC to ASIN:', upc);
    
    try {
      const { data, error } = await supabase.functions.invoke('convert-upc-to-asin', {
        body: { upc }
      });

      if (error) {
        console.error('UPC conversion error:', error);
        throw new Error(`UPC conversion failed: ${error.message}`);
      }

      if (!data?.success) {
        console.error('UPC conversion unsuccessful:', data);
        throw new Error(data?.error || 'Could not convert UPC to ASIN');
      }

      console.log('UPC conversion successful:', data.data.asin);
      return data.data.asin;
    } catch (error) {
      console.error('UPC conversion error:', error);
      toast({
        title: "UPC Conversion Failed",
        description: `Unable to convert UPC ${upc} to ASIN: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const fetchProduct = useCallback(async (input: string, forceFresh = false) => {
    setLoading(true);
    setProduct(null);

    try {
      const trimmedInput = input.trim();
      console.log('Fetching product data for input:', trimmedInput);

      // Detect input type
      const inputIsUpc = isUpc(trimmedInput);
      const inputIsAsin = isAsin(trimmedInput);

      if (!inputIsUpc && !inputIsAsin) {
        throw new Error('Invalid input format. Please enter a valid ASIN (10 characters) or UPC (12 digits).');
      }

      let searchIdentifier = trimmedInput;
      let isUpcSearch = false;

      if (inputIsUpc) {
        console.log('UPC detected, will use Keepa productFinder');
        searchIdentifier = trimmedInput;
        isUpcSearch = true;
      } else {
        console.log('ASIN detected, proceeding with normal lookup');
        searchIdentifier = trimmedInput.toUpperCase();
      }

      // Call Keepa API with UPC flag
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { 
          asin: searchIdentifier,
          isUpc: isUpcSearch
        }
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
        asin: keepaData.asin,
        upcConversion: keepaData.upcConversion
      });

      const productData: AmazonProduct = {
        asin: keepaData.asin,
        title: keepaData.title || 'Product title not available',
        manufacturer: keepaData.manufacturer,
        category: keepaData.category || 'Unknown',
        image_url: keepaData.imageUrl,
        
        // Current pricing data
        buy_box_price: keepaData.buyBoxPrice,
        lowest_fba_price: keepaData.lowestFBAPrice,
        lowest_fbm_price: keepaData.lowestFBMPrice,
        amazon_price: keepaData.amazonPrice,
        
        // Enhanced fee data with fallback estimates
        fees: keepaData.fees || null,
        
        // Sales and inventory data
        offer_count: keepaData.offerCount || 0,
        estimated_monthly_sales: keepaData.estimatedMonthlySales,
        in_stock: keepaData.inStock || false,
        
        // Sales rank data
        sales_rank: keepaData.salesRank,
        
        // Historical data - parsed and cleaned
        price_history: keepaData.priceHistory || [],
        
        // UPC conversion info
        upc_conversion: keepaData.upcConversion || null,
        
        // Metadata
        last_updated: keepaData.lastUpdate,
        data_source: 'Keepa',
        debug_data: keepaResponse
      };

      console.log('Product data processed successfully:', productData.title);
      setProduct(productData);

      // Show appropriate success message
      let successMessage = `Successfully fetched data for ${productData.title}`;
      if (keepaData.upcConversion) {
        successMessage += ` (🔄 Searched by UPC. Found ASIN: ${keepaData.upcConversion.convertedAsin})`;
      }

      toast({
        title: "Product Data Updated",
        description: successMessage,
      });

    } catch (error) {
      console.error('Product fetch error:', error);
      
      // Create error product object
      const errorProduct: AmazonProduct = {
        asin: input,
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
  }, [toast, isUpc, isAsin]);

  return {
    product,
    loading,
    debugMode,
    setDebugMode,
    fetchProduct,
    setProduct,
    convertUpcToAsin
  };
};
