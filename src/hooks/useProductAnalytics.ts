import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductAnalytics {
  asin: string;
  keepaData?: any;
  spApiData?: any;
  priceHistory?: any[];
  profitability?: {
    netProfit: number;
    roi: number;
    margin: number;
    breakeven: number;
  };
  buyScore?: number;
  eligibility?: {
    canSell: boolean;
    restrictions: string[];
  };
}

export const useProductAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = async (asin: string, userSettings?: any) => {
    setLoading(true);
    setAnalytics(null);

    try {
      console.log('Fetching comprehensive analytics for:', asin);

      // Fetch Keepa data
      const { data: keepaResponse, error: keepaError } = await supabase.functions.invoke('fetch-keepa-data', {
        body: { asin }
      });

      if (keepaError) {
        console.warn('Keepa data fetch failed:', keepaError);
      }

      // Fetch SP-API data
      const { data: spApiResponse, error: spApiError } = await supabase.functions.invoke('fetch-sp-api-data', {
        body: { asin }
      });

      if (spApiError) {
        console.warn('SP-API data fetch failed:', spApiError);
      }

      // Calculate profitability if we have pricing data
      let profitability = null;
      if (keepaResponse?.success && keepaResponse.data.buyBoxPrice && userSettings) {
        const sellPrice = keepaResponse.data.buyBoxPrice;
        const productCost = userSettings.productCost || 0;
        const shippingCost = userSettings.shippingCost || 0;
        const prepCost = userSettings.prepCost || 0;
        const fbaFee = userSettings.fbaFee || sellPrice * 0.15; // Estimate
        const referralFee = sellPrice * 0.08; // 8% for electronics

        const totalCosts = productCost + shippingCost + prepCost + fbaFee + referralFee;
        const netProfit = sellPrice - totalCosts;
        const roi = ((netProfit / (productCost + shippingCost + prepCost)) * 100);
        const margin = (netProfit / sellPrice) * 100;
        const breakeven = totalCosts;

        profitability = {
          netProfit: Number(netProfit.toFixed(2)),
          roi: Number(roi.toFixed(1)),
          margin: Number(margin.toFixed(1)),
          breakeven: Number(breakeven.toFixed(2))
        };
      }

      // Calculate Buy Score (0-100)
      let buyScore = 0;
      if (keepaResponse?.success) {
        const data = keepaResponse.data;
        
        // ROI Score (0-40 points)
        if (profitability) {
          if (profitability.roi >= 50) buyScore += 40;
          else if (profitability.roi >= 30) buyScore += 30;
          else if (profitability.roi >= 15) buyScore += 20;
          else if (profitability.roi >= 5) buyScore += 10;
        }

        // Sales Rank Score (0-30 points)
        if (data.salesRank) {
          if (data.salesRank <= 1000) buyScore += 30;
          else if (data.salesRank <= 5000) buyScore += 25;
          else if (data.salesRank <= 10000) buyScore += 20;
          else if (data.salesRank <= 50000) buyScore += 15;
          else if (data.salesRank <= 100000) buyScore += 10;
          else if (data.salesRank <= 500000) buyScore += 5;
        }

        // Amazon presence (0-20 points)
        if (!data.amazonInStock) buyScore += 20; // Better if Amazon is not selling
        else buyScore += 5;

        // Offer count (0-10 points)
        if (data.offerCount <= 5) buyScore += 10;
        else if (data.offerCount <= 10) buyScore += 7;
        else if (data.offerCount <= 20) buyScore += 5;
        else if (data.offerCount <= 50) buyScore += 3;
      }

      const result: ProductAnalytics = {
        asin,
        keepaData: keepaResponse?.success ? keepaResponse.data : null,
        spApiData: spApiResponse?.success ? spApiResponse.data : null,
        priceHistory: keepaResponse?.success ? keepaResponse.data.priceHistory : [],
        profitability,
        buyScore: Math.min(buyScore, 100),
        eligibility: spApiResponse?.success ? spApiResponse.data.eligibility : null
      };

      setAnalytics(result);
      
      toast({
        title: "Analytics Updated",
        description: `Successfully analyzed ${asin}`,
      });

    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast({
        title: "Error",
        description: `Failed to fetch analytics: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const convertUpcToAsin = async (upc: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('convert-upc-to-asin', {
        body: { upc }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'UPC conversion failed');
      }

      return data.data.asin;
    } catch (error) {
      console.error('UPC conversion error:', error);
      throw error;
    }
  };

  return {
    loading,
    analytics,
    fetchAnalytics,
    convertUpcToAsin,
    setAnalytics
  };
};
