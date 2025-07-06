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
  data_source?: 'SP-API' | 'Keepa' | 'Error';
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

    console.log('Starting product fetch for ASIN:', identifier);
    setLoading(true);
    setProduct(null);
    
    try {
      // First attempt: SP-API for connected sellers
      console.log('Attempting SP-API fetch...');
      
      const { data: spApiResponse, error: spApiError } = await supabase.functions.invoke('fetch-sp-api-data', {
        body: { asin: identifier, marketplaceId: 'ATVPDKIKX0DER' }
      });

      if (spApiResponse?.success && spApiResponse.data) {
        console.log('SP-API fetch successful:', spApiResponse.data);
        
        const spData = spApiResponse.data;
        const productDetails = spData.productDetails;
        const pricing = spData.pricing;
        const inventory = spData.inventory;
        const sales = spData.sales;
        const eligibility = spData.eligibility;
        const competition = spData.competitionAnalysis;
        const fees = spData.fees;

        // Build product from real SP-API data
        const spApiProduct: AmazonProduct = {
          asin: identifier,
          title: productDetails?.title || 'Product title not available',
          brand: productDetails?.brand || null,
          category: productDetails?.categories?.[0] || null,
          image_url: productDetails?.images?.[0]?.link || null,
          dimensions: productDetails?.dimensions ? 
            `${productDetails.dimensions.length} x ${productDetails.dimensions.width} x ${productDetails.dimensions.height}` : null,
          weight: productDetails?.weight || null,
          description: productDetails?.description || null,
          manufacturer: productDetails?.manufacturer || null,
          model: productDetails?.model || null,
          color: productDetails?.color || null,
          size: productDetails?.size || null,
          features: productDetails?.features || [],
          
          // Real pricing data from SP-API
          current_price: pricing?.buyBoxPrice || null,
          buy_box_price: pricing?.buyBoxPrice || null,
          lowest_fba_price: pricing?.lowestFBAPrice || null,
          lowest_fbm_price: pricing?.lowestFBMPrice || null,
          
          // Real inventory and sales data
          sales_rank: productDetails?.salesRank || null,
          estimated_monthly_sales: sales?.estimatedMonthlySales || null,
          amazon_in_stock: inventory?.availableQuantity > 0,
          inventory_level: inventory?.availableQuantity > 100 ? 'High Stock' : 
                          inventory?.availableQuantity > 10 ? 'Medium Stock' : 
                          inventory?.availableQuantity > 0 ? 'Low Stock' : 'Out of Stock',
          
          // Real competition data
          offer_count: competition?.totalOffers || 0,
          prime_eligible_offers: competition?.primeOffers || 0,
          amazon_seller_present: competition?.fbaOffers > 0,
          competition_level: competition?.totalOffers < 5 ? 'Low' : 
                           competition?.totalOffers < 15 ? 'Medium' : 'High',
          
          // Real seller eligibility
          seller_eligibility: {
            can_sell: eligibility?.canSell || false,
            restrictions: eligibility?.restrictions?.map((r: any) => r.message) || [],
            requires_approval: eligibility?.requiresApproval || false,
            category_gated: eligibility?.categoryGated || false
          },
          
          // Buy box info
          buybox_seller: pricing?.offers?.[0]?.sellerId || 'Unknown',
          buybox_seller_type: pricing?.offers?.[0]?.fulfillmentChannel === 'Amazon' ? 'FBA' : 'FBM',
          
          // Risk assessment from real data
          amazon_risk_score: eligibility?.restrictions?.length > 0 ? 4 : 1,
          ip_risk_score: productDetails?.brand ? 1 : 3,
          
          data_source: 'SP-API',
          last_updated: new Date().toISOString(),
          debug_data: debugMode ? spApiResponse : undefined
        };

        setProduct(spApiProduct);
        toast({
          title: "Real SP-API Data Loaded",
          description: `Live Amazon data loaded for ${spApiProduct.title}`,
        });
        return;
      }

      // Second attempt: Keepa API fallback
      console.log('SP-API failed, attempting Keepa fallback...', spApiError);
      
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin: identifier, domain: 1 }
      });

      if (keepaResponse?.success && keepaResponse.data) {
        console.log('Keepa fetch successful:', keepaResponse.data);
        
        const keepaData = keepaResponse.data;
        
        // Extract real category from Keepa
        const keepaCategoryMap: { [key: number]: string } = {
          1: 'Books', 2: 'Movies & TV', 3: 'Music', 4: 'Video Games', 5: 'Electronics',
          6: 'Camera & Photo', 7: 'Computers', 8: 'Cell Phones & Accessories', 
          9: 'Sports & Outdoors', 10: 'Home & Garden', 11: 'Tools & Home Improvement',
          12: 'Automotive', 13: 'Health & Personal Care', 14: 'Beauty', 
          15: 'Grocery & Gourmet Food', 16: 'Pet Supplies', 17: 'Baby',
          18: 'Clothing, Shoes & Jewelry', 19: 'Handmade', 20: 'Arts, Crafts & Sewing'
        };

        const categoryName = keepaData.categories?.[0] ? 
          keepaCategoryMap[keepaData.categories[0]] || `Category ${keepaData.categories[0]}` : null;

        // Build product from real Keepa data
        const keepaProduct: AmazonProduct = {
          asin: identifier,
          title: keepaData.title || 'Product title not available',
          brand: keepaData.brand || null,
          category: categoryName,
          image_url: `https://images-na.ssl-images-amazon.com/images/P/${identifier}.01.L.jpg`,
          description: keepaData.description || null,
          manufacturer: keepaData.manufacturer || null,
          model: keepaData.model || null,
          color: keepaData.color || null,
          size: keepaData.size || null,
          features: keepaData.features || [],
          
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
          amazon_in_stock: keepaData.amazonInStock === true,
          inventory_level: keepaData.inventoryLevel || 'Data not available',
          
          // Real competition data from Keepa
          offer_count: keepaData.offerCount || 0,
          prime_eligible_offers: keepaData.primeEligibleOffers || 0,
          amazon_seller_present: keepaData.amazonSellerPresent || false,
          competition_level: keepaData.competitionLevel || 'Medium',
          
          // Buy box from Keepa
          buybox_seller: 'Data not available',
          buybox_seller_type: 'FBA',
          
          // Real historical data
          price_history: keepaData.priceHistory || [],
          
          // Risk scores from Keepa
          amazon_risk_score: keepaData.amazonRiskScore || 2,
          ip_risk_score: keepaData.ipRiskScore || 1,
          
          data_source: 'Keepa',
          last_updated: new Date().toISOString(),
          debug_data: debugMode ? keepaResponse : undefined
        };

        setProduct(keepaProduct);
        toast({
          title: "Real Keepa Data Loaded",
          description: `Historical data loaded for ${keepaProduct.title}`,
        });
        return;
      }

      // Both APIs failed
      console.error('Both SP-API and Keepa failed:', { spApiError, keepaError });
      
      toast({
        title: "Product Data Unavailable",
        description: `Unable to fetch real data for ASIN ${identifier}. Both SP-API and Keepa failed.`,
        variant: "destructive",
      });

      // Set error state product
      setProduct({
        asin: identifier,
        title: 'Product data not available',
        data_source: 'Error',
        last_updated: new Date().toISOString(),
        debug_data: debugMode ? { spApiError, keepaError } : undefined
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
