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
  // Enhanced seller data
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
  // Enhanced historical data
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
  // Additional product details
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
}

export const useAmazonProduct = () => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<AmazonProduct | null>(null);
  const { toast } = useToast();

  // Enhanced Keepa category mapping
  const keepaCategoryMap: { [key: number]: string } = {
    1: 'Books',
    2: 'Movies & TV',
    3: 'Music',
    4: 'Video Games',
    5: 'Electronics',
    6: 'Camera & Photo',
    7: 'Computers',
    8: 'Cell Phones & Accessories',
    9: 'Sports & Outdoors',
    10: 'Home & Garden',
    11: 'Tools & Home Improvement',
    12: 'Automotive',
    13: 'Health & Personal Care',
    14: 'Beauty',
    15: 'Grocery & Gourmet Food',
    16: 'Pet Supplies',
    17: 'Baby',
    18: 'Clothing, Shoes & Jewelry',
    19: 'Handmade',
    20: 'Arts, Crafts & Sewing',
    21: 'Industrial & Scientific',
    22: 'Kitchen & Dining',
    23: 'Office Products',
    24: 'Patio, Lawn & Garden',
    25: 'Toys & Games',
    26: 'Everything Else'
  };

  const fetchProduct = async (identifier: string, forceFresh: boolean = false) => {
    if (!identifier) return;

    console.log('Starting fetchProduct for identifier:', identifier, 'forceFresh:', forceFresh);
    setLoading(true);
    setProduct(null);
    
    try {
      // Try Keepa API first for comprehensive historical data
      console.log('Attempting to fetch from enhanced Keepa API...');
      
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin: identifier }
      });

      if (keepaResponse?.success && keepaResponse.data) {
        console.log('Successfully fetched enhanced Keepa data:', keepaResponse.data);
        
        // Generate product image URL from Amazon
        const amazonImageUrl = `https://images-na.ssl-images-amazon.com/images/P/${identifier}.01.L.jpg`;
        
        // Extract comprehensive pricing data
        const buyBoxPrice = keepaResponse.data.buyBoxPrice && keepaResponse.data.buyBoxPrice > 0 
          ? keepaResponse.data.buyBoxPrice : null;
        const currentPrice = keepaResponse.data.currentPrice && keepaResponse.data.currentPrice > 0 
          ? keepaResponse.data.currentPrice : null;
        
        // Extract real category from Keepa data
        let categoryName = 'Unknown Category';
        if (keepaResponse.data.categories && keepaResponse.data.categories.length > 0) {
          const categoryId = keepaResponse.data.categories[0];
          categoryName = keepaCategoryMap[categoryId] || `Category ${categoryId}`;
        }

        const combinedProduct: AmazonProduct = {
          asin: identifier,
          title: keepaResponse.data.title || 'Product Title Not Available',
          brand: keepaResponse.data.brand || null,
          category: categoryName,
          image_url: amazonImageUrl,
          description: keepaResponse.data.description || null,
          manufacturer: keepaResponse.data.manufacturer || null,
          model: keepaResponse.data.model || null,
          color: keepaResponse.data.color || null,
          size: keepaResponse.data.size || null,
          package_quantity: keepaResponse.data.packageQuantity || 1,
          hazardous_material: keepaResponse.data.hazardousMaterialType || 0,
          
          // Pricing data
          current_price: currentPrice,
          buy_box_price: buyBoxPrice,
          lowest_fba_price: keepaResponse.data.lowestFBAPrice,
          lowest_fbm_price: keepaResponse.data.lowestFBMPrice,
          avg_price_30: keepaResponse.data.avgPrice30,
          avg_price_90: keepaResponse.data.avgPrice90,
          avg_price_180: keepaResponse.data.avgPrice180,
          
          // Sales and inventory data
          sales_rank: keepaResponse.data.salesRank || null,
          estimated_monthly_sales: keepaResponse.data.estimatedMonthlySales || null,
          amazon_in_stock: keepaResponse.data.amazonInStock === true,
          inventory_level: keepaResponse.data.inventoryLevel || 'Unknown',
          
          // Seller and competition data
          offer_count: keepaResponse.data.offerCount || 0,
          prime_eligible_offers: keepaResponse.data.primeEligibleOffers || 0,
          amazon_seller_present: keepaResponse.data.amazonSellerPresent || false,
          competition_level: keepaResponse.data.competitionLevel || 'Medium',
          
          // Risk assessment
          amazon_risk_score: keepaResponse.data.amazonRiskScore || 2,
          ip_risk_score: keepaResponse.data.ipRiskScore || 1,
          
          // Enhanced features
          features: keepaResponse.data.features || [],
          release_date: keepaResponse.data.releaseDate || null,
          last_price_change: keepaResponse.data.lastPriceChange || null,
          
          // Historical data
          price_history: keepaResponse.data.priceHistory || [],
          
          // Default values for missing data
          review_count: null,
          rating: null,
          roi_percentage: null,
          profit_margin: null,
          time_to_sell_days: null,
          buybox_seller: 'Amazon',
          buybox_seller_type: 'FBA'
        };

        setProduct(combinedProduct);
        toast({
          title: "Enhanced Product Data Loaded",
          description: `Successfully loaded comprehensive data for ${combinedProduct.title}`,
        });
        return;
      }

      // If Keepa fails, try enhanced SP-API as fallback
      console.log('Keepa failed, trying enhanced SP-API as fallback...');
      
      const { data: spApiData, error: spApiError } = await supabase.functions.invoke('fetch-sp-api-data', {
        body: { asin: identifier }
      });

      if (spApiData?.success && spApiData?.data) {
        console.log('Successfully fetched enhanced SP-API data');
        
        const productDetails = spApiData.data.productDetails;
        const pricing = spApiData.data.pricing;
        const inventory = spApiData.data.inventory;
        const sales = spApiData.data.sales;
        const eligibility = spApiData.data.eligibility;
        const competition = spApiData.data.competitionAnalysis;
        const risk = spApiData.data.riskAssessment;
        
        // Extract real category from SP-API data
        let categoryName = 'Unknown Category';
        if (productDetails?.categories && productDetails.categories.length > 0) {
          categoryName = productDetails.categories[0];
        }
        
        const combinedProduct: AmazonProduct = {
          asin: identifier,
          title: productDetails?.title || 'Product Title Not Available',
          brand: productDetails?.brand || null,
          category: categoryName,
          image_url: productDetails?.images?.[0]?.link || `https://images-na.ssl-images-amazon.com/images/P/${identifier}.01.L.jpg`,
          description: productDetails?.description || null,
          manufacturer: productDetails?.manufacturer || null,
          model: productDetails?.model || null,
          color: productDetails?.color || null,
          size: productDetails?.size || null,
          dimensions: productDetails?.dimensions || 'Not specified',
          weight: productDetails?.weight || 'Not specified',
          
          // Pricing data
          current_price: pricing?.buyBoxPrice || null,
          buy_box_price: pricing?.buyBoxPrice || null,
          lowest_fba_price: pricing?.lowestFBAPrice || null,
          lowest_fbm_price: pricing?.lowestFBMPrice || null,
          
          // Sales and inventory data
          sales_rank: productDetails?.salesRank || null,
          estimated_monthly_sales: sales?.estimatedMonthlySales || null,
          amazon_in_stock: inventory?.availableQuantity > 0,
          inventory_level: inventory?.availableQuantity > 100 ? 'High Stock' : 
                          inventory?.availableQuantity > 10 ? 'Medium Stock' : 
                          inventory?.availableQuantity > 0 ? 'Low Stock' : 'Out of Stock',
          
          // Seller and competition data
          offer_count: competition?.totalOffers || 0,
          prime_eligible_offers: competition?.primeOffers || 0,
          amazon_seller_present: competition?.fbaOffers > 0,
          competition_level: risk?.competitionLevel || 'Medium',
          
          // Seller eligibility
          seller_eligibility: {
            can_sell: eligibility?.canSell || false,
            restrictions: eligibility?.restrictions?.map((r: any) => r.message) || [],
            requires_approval: eligibility?.requiresApproval || false,
            category_gated: eligibility?.categoryGated || false
          },
          
          // Risk assessment
          amazon_risk_score: risk?.restrictionCount > 0 ? 4 : 2,
          ip_risk_score: productDetails?.brand ? 1 : 3,
          
          // Enhanced features
          features: productDetails?.features || [],
          
          // Default values
          review_count: null,
          rating: null,
          roi_percentage: null,
          profit_margin: null,
          time_to_sell_days: null,
          buybox_seller: pricing?.buyboxSeller || 'Amazon',
          buybox_seller_type: pricing?.buyboxSellerType || 'FBA'
        };

        setProduct(combinedProduct);
        toast({
          title: "Enhanced Product Data Loaded via SP-API",
          description: `Successfully loaded comprehensive data for ${combinedProduct.title}`,
        });
        return;
      }

      // If both APIs fail, show error
      console.error('Both enhanced Keepa and SP-API failed for ASIN:', identifier);
      
      toast({
        title: "Product Not Found",
        description: `Unable to fetch comprehensive product data for ASIN ${identifier}. Please check the ASIN and try again.`,
        variant: "destructive",
      });

      throw new Error('Unable to fetch product data from any source');

    } catch (error) {
      console.error('Error in fetchProduct:', error);
      
      toast({
        title: "Error",
        description: `Failed to fetch comprehensive product data: ${error.message}`,
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
