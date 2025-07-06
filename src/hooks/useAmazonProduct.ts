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
      // Try Keepa API first
      console.log('Attempting to fetch from Keepa API first...');
      
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin: identifier }
      });

      if (keepaResponse?.success && keepaResponse.data) {
        console.log('Successfully fetched Keepa data:', keepaResponse.data.title);
        
        const combinedProduct: AmazonProduct = {
          asin: identifier,
          title: keepaResponse.data.title || 'Product Title Not Available',
          brand: keepaResponse.data.brand || 'Unknown Brand',
          category: 'General',
          image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop',
          current_price: keepaResponse.data.currentPrice || null,
          buy_box_price: keepaResponse.data.buyBoxPrice || null,
          lowest_fba_price: keepaResponse.data.lowestFBAPrice || null,
          lowest_fbm_price: keepaResponse.data.lowestFBMPrice || null,
          sales_rank: keepaResponse.data.salesRank || null,
          amazon_in_stock: keepaResponse.data.amazonInStock !== false,
          review_count: null,
          rating: null,
          roi_percentage: null,
          profit_margin: null,
          estimated_monthly_sales: null,
          competition_level: null,
          amazon_risk_score: null,
          ip_risk_score: null,
          time_to_sell_days: null,
          buybox_seller: 'Unknown',
          buybox_seller_type: 'FBM'
        };

        setProduct(combinedProduct);
        toast({
          title: "Product Found via Keepa",
          description: `Successfully loaded data for ${combinedProduct.title}`,
        });
        return;
      }

      // If Keepa fails, try SP-API as fallback
      console.log('Keepa failed, trying SP-API as fallback...');
      
      const { data: spApiData, error: spApiError } = await supabase.functions.invoke('fetch-sp-api-data', {
        body: { asin: identifier }
      });

      if (spApiData?.success && spApiData?.data) {
        console.log('Successfully fetched SP-API data');
        
        // Extract product details from SP-API response
        const productDetails = spApiData.data.productDetails;
        const pricing = spApiData.data.pricing;
        
        const combinedProduct: AmazonProduct = {
          asin: identifier,
          title: productDetails?.title || 'Product Title Not Available',
          brand: productDetails?.brand || 'Unknown Brand',
          category: productDetails?.category || 'General',
          image_url: productDetails?.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop',
          dimensions: productDetails?.dimensions || 'Not specified',
          weight: productDetails?.weight || 'Not specified',
          current_price: pricing?.currentPrice || null,
          buy_box_price: pricing?.buyBoxPrice || null,
          lowest_fba_price: pricing?.lowestFBAPrice || null,
          lowest_fbm_price: pricing?.lowestFBMPrice || null,
          sales_rank: productDetails?.salesRank || null,
          amazon_in_stock: pricing?.amazonInStock !== false,
          review_count: productDetails?.reviewCount || null,
          rating: productDetails?.rating || null,
          roi_percentage: null,
          profit_margin: null,
          estimated_monthly_sales: null,
          competition_level: null,
          amazon_risk_score: null,
          ip_risk_score: null,
          time_to_sell_days: null,
          buybox_seller: pricing?.buyboxSeller || 'Unknown',
          buybox_seller_type: pricing?.buyboxSellerType || 'FBM'
        };

        setProduct(combinedProduct);
        toast({
          title: "Product Found via SP-API",
          description: `Successfully loaded data for ${combinedProduct.title}`,
        });
        return;
      }

      // If both APIs fail, show error
      console.error('Both Keepa and SP-API failed for ASIN:', identifier);
      
      toast({
        title: "Product Not Found",
        description: `Unable to fetch product data for ASIN ${identifier}. Please check the ASIN and try again.`,
        variant: "destructive",
      });

      throw new Error('Unable to fetch product data from any source');

    } catch (error) {
      console.error('Error in fetchProduct:', error);
      
      toast({
        title: "Error",
        description: `Failed to fetch product data: ${error.message}`,
        variant: "destructive",
      });
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
