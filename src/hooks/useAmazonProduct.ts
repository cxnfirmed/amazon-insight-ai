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
  inventory_level?: string;
  offer_count?: number;
  prime_eligible_offers?: number;
  amazon_seller_present?: boolean;
  seller_eligibility?: {
    can_sell: boolean;
    restrictions: string[];
    requires_approval: boolean;
    category_gated: boolean;
  };
  price_history?: Array<{
    timestamp: string;
    buyBoxPrice?: number;
    amazonPrice?: number;
    newPrice?: number;
    usedPrice?: number;
    newFBAPrice?: number;
    newFBMPrice?: number;
    salesRank?: number;
    amazonInStock?: boolean;
    offerCount?: number;
  }>;
  features?: string[];
  description?: string;
  manufacturer?: string;
  model?: string;
  color?: string;
  size?: string;
  release_date?: string;
  last_price_change?: string;
  package_quantity?: number;
  hazardous_material?: number;
  avg_price_30?: number;
  avg_price_90?: number;
  avg_price_180?: number;
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
      // Use Keepa API exclusively
      console.log('Fetching product data from Keepa API...');
      
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin: identifier, domain: 1 }
      });

      if (keepaResponse?.success && keepaResponse.data) {
        console.log('Keepa fetch successful:', keepaResponse.data);
        
        const keepaData = keepaResponse.data;
        
        // Extract real category from Keepa category tree
        const getCategoryName = (categories: number[]) => {
          if (!categories || categories.length === 0) return null;
          
          const keepaCategoryMap: { [key: number]: string } = {
            1: 'Books', 2: 'Movies & TV', 3: 'Music', 4: 'Video Games', 5: 'Electronics',
            6: 'Camera & Photo', 7: 'Computers', 8: 'Cell Phones & Accessories', 
            9: 'Sports & Outdoors', 10: 'Home & Garden', 11: 'Tools & Home Improvement',
            12: 'Automotive', 13: 'Health & Personal Care', 14: 'Beauty', 
            15: 'Grocery & Gourmet Food', 16: 'Pet Supplies', 17: 'Baby',
            18: 'Clothing, Shoes & Jewelry', 19: 'Handmade', 20: 'Arts, Crafts & Sewing'
          };

          return keepaCategoryMap[categories[0]] || `Category ${categories[0]}`;
        };

        // Build image URL from Keepa imagesCSV
        const getImageUrl = (imagesCSV: string | null) => {
          if (!imagesCSV) return null;
          
          const images = imagesCSV.split(',');
          if (images.length === 0) return null;
          
          const firstImage = images[0].trim();
          return `https://images-na.ssl-images-amazon.com/images/I/${firstImage}.jpg`;
        };

        // Determine stock status based on offers and buy box
        const isInStock = () => {
          const hasOffers = (keepaData.offerCount || 0) > 0;
          const hasBuyBox = keepaData.buyBoxPrice && keepaData.buyBoxPrice > 0;
          const hasAmazonPrice = keepaData.amazonPrice && keepaData.amazonPrice > 0;
          const hasFBAPrice = keepaData.lowestFBAPrice && keepaData.lowestFBAPrice > 0;
          const hasFBMPrice = keepaData.lowestFBMPrice && keepaData.lowestFBMPrice > 0;
          
          return hasOffers || hasBuyBox || hasAmazonPrice || hasFBAPrice || hasFBMPrice;
        };

        // Determine inventory level
        const getInventoryLevel = () => {
          const offerCount = keepaData.offerCount || 0;
          if (offerCount === 0) return 'Out of Stock';
          if (offerCount < 3) return 'Low Stock';
          if (offerCount < 10) return 'Medium Stock';
          return 'High Stock';
        };

        // Build product from real Keepa data
        const keepaProduct: AmazonProduct = {
          asin: identifier,
          title: keepaData.title || 'Product title not available',
          brand: keepaData.brand || null,
          category: getCategoryName(keepaData.categories),
          image_url: getImageUrl(keepaData.imagesCSV),
          description: keepaData.description || null,
          manufacturer: keepaData.manufacturer || null,
          model: keepaData.model || null,
          color: keepaData.color || null,
          size: keepaData.size || null,
          features: keepaData.features || [],
          package_quantity: keepaData.packageQuantity || 1,
          hazardous_material: keepaData.hazardousMaterialType || 0,
          
          // Real pricing from Keepa
          current_price: keepaData.currentPrice || null,
          buy_box_price: keepaData.buyBoxPrice || null,
          lowest_fba_price: keepaData.lowestFBAPrice || null,
          lowest_fbm_price: keepaData.lowestFBMPrice || null,
          avg_price_30: keepaData.avgPrice30 || null,
          avg_price_90: keepaData.avgPrice90 || null,
          avg_price_180: keepaData.avgPrice180 || null,
          
          // Real sales and inventory from Keepa
          sales_rank: keepaData.salesRank || null,
          estimated_monthly_sales: keepaData.estimatedMonthlySales || null,
          amazon_in_stock: isInStock(),
          inventory_level: getInventoryLevel(),
          
          // Real competition data from Keepa
          offer_count: keepaData.offerCount || 0,
          prime_eligible_offers: keepaData.primeEligibleOffers || 0,
          amazon_seller_present: keepaData.amazonSellerPresent || false,
          competition_level: keepaData.competitionLevel || 'Medium',
          
          // Buy box from Keepa
          buybox_seller: 'Data from Keepa',
          buybox_seller_type: keepaData.amazonSellerPresent ? 'Amazon' : 'FBA',
          
          // Real historical data
          price_history: keepaData.priceHistory || [],
          
          // Risk scores from Keepa
          amazon_risk_score: keepaData.amazonRiskScore || 2,
          ip_risk_score: keepaData.ipRiskScore || 1,
          
          // Release dates
          release_date: keepaData.releaseDate || null,
          last_price_change: keepaData.lastPriceChange || null,
          
          data_source: 'Keepa',
          last_updated: new Date().toISOString(),
          debug_data: debugMode ? keepaResponse : undefined
        };

        setProduct(keepaProduct);
        
        toast({
          title: "Real Keepa Data Loaded",
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
