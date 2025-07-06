import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KeepaProduct {
  asin: string;
  domainId: number;
  title: string;
  manufacturer: string;
  categoryTree: Array<{
    catId: number;
    name: string;
  }>;
  imagesCSV: string;
  salesRanks: { [key: string]: number[] };
  csv: number[][];
  offerCount: number;
  buyBoxPrice: number;
  fbaNewPrice: number;
  fbmNewPrice: number;
  dropsPerMonth: number;
  buyBoxPriceHistory: number[];
  fbaPriceHistory: number[];
  salesRankDrops: number[];
  offerCountHistory: number[];
  lastUpdate: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asin, domain = 1 } = await req.json();
    
    if (!asin) {
      throw new Error('ASIN is required');
    }

    const keepaApiKey = Deno.env.get('KEEPA_API_KEY');
    if (!keepaApiKey) {
      throw new Error('Keepa API key not configured');
    }

    console.log(`Fetching Keepa data for ASIN: ${asin}`);

    // Call Keepa API with comprehensive parameters
    const keepaUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=${domain}&asin=${asin}&stats=1&offers=50&buybox=1&history=1&rating=1&update=1&days=365`;
    
    const response = await fetch(keepaUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Keepa API error response:', errorText);
      throw new Error(`Keepa API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Keepa API response received:', { 
      tokensLeft: data.tokensLeft, 
      processingTimeInMs: data.processingTimeInMs,
      productCount: data.products?.length 
    });
    
    if (!data.products || data.products.length === 0) {
      throw new Error('Product not found in Keepa database');
    }

    const product: KeepaProduct = data.products[0];
    
    // Parse historical price data from CSV format
    const parseHistoryData = () => {
      if (!product.csv || product.csv.length === 0) return [];
      
      const priceHistory = [];
      // Keepa CSV indices: [0] = Amazon, [1] = New, [18] = Buy Box, [3] = Sales Rank, [11] = Offer Count
      const timestamps = product.csv[0] || [];
      const buyBoxPrices = product.csv[18] || [];
      const amazonPrices = product.csv[0] || [];
      const newPrices = product.csv[1] || [];
      const salesRanks = product.csv[3] || [];
      const offerCounts = product.csv[11] || [];

      for (let i = 0; i < timestamps.length; i += 2) {
        if (timestamps[i] && timestamps[i + 1] !== undefined) {
          // Convert Keepa timestamp to standard timestamp
          const timestamp = new Date((timestamps[i] + 21564000) * 60000);
          
          priceHistory.push({
            timestamp: timestamp.toISOString(),
            buyBoxPrice: buyBoxPrices[i + 1] && buyBoxPrices[i + 1] > 0 ? buyBoxPrices[i + 1] / 100 : null,
            amazonPrice: amazonPrices[i + 1] && amazonPrices[i + 1] > 0 ? amazonPrices[i + 1] / 100 : null,
            newPrice: newPrices[i + 1] && newPrices[i + 1] > 0 ? newPrices[i + 1] / 100 : null,
            salesRank: salesRanks[i + 1] || null,
            offerCount: offerCounts[i + 1] || 0
          });
        }
      }
      
      return priceHistory.slice(-180); // Last 180 days
    };

    // Parse product image from imagesCSV
    const getImageUrl = () => {
      if (!product.imagesCSV) return null;
      const images = product.imagesCSV.split(',');
      if (images.length === 0) return null;
      const firstImage = images[0].trim();
      return `https://images-na.ssl-images-amazon.com/images/I/${firstImage}.jpg`;
    };

    // Parse category from categoryTree
    const getCategoryName = () => {
      if (!product.categoryTree || product.categoryTree.length === 0) return null;
      return product.categoryTree[0].name;
    };

    // Calculate monthly sales from dropsPerMonth or sales rank
    const calculateMonthlySales = () => {
      if (product.dropsPerMonth) {
        return Math.floor(product.dropsPerMonth * 30);
      }
      
      // Fallback: estimate from current sales rank
      const currentSalesRank = product.salesRanks ? Object.values(product.salesRanks)[0]?.[0] : null;
      if (currentSalesRank) {
        if (currentSalesRank < 1000) return Math.floor(1000 / currentSalesRank * 500);
        if (currentSalesRank < 10000) return Math.floor(10000 / currentSalesRank * 100);
        if (currentSalesRank < 100000) return Math.floor(100000 / currentSalesRank * 20);
        return Math.floor(1000000 / currentSalesRank * 5);
      }
      
      return null;
    };

    // Get current buy box price
    const getCurrentBuyBoxPrice = () => {
      if (product.buyBoxPrice && product.buyBoxPrice > 0) {
        return product.buyBoxPrice / 100;
      }
      
      // Try from history
      if (product.buyBoxPriceHistory && product.buyBoxPriceHistory.length > 0) {
        const latestPrice = product.buyBoxPriceHistory[product.buyBoxPriceHistory.length - 1];
        return latestPrice && latestPrice > 0 ? latestPrice / 100 : null;
      }
      
      return null;
    };

    // Determine stock status
    const isInStock = () => {
      const hasOffers = (product.offerCount || 0) > 0;
      const hasBuyBox = getCurrentBuyBoxPrice() !== null;
      return hasOffers || hasBuyBox;
    };

    const result = {
      success: true,
      data: {
        asin: product.asin,
        title: product.title || 'Product title not available',
        manufacturer: product.manufacturer || null,
        category: getCategoryName(),
        imageUrl: getImageUrl(),
        
        // Current pricing from Keepa
        buyBoxPrice: getCurrentBuyBoxPrice(),
        lowestFBAPrice: product.fbaNewPrice && product.fbaNewPrice > 0 ? product.fbaNewPrice / 100 : null,
        lowestFBMPrice: product.fbmNewPrice && product.fbmNewPrice > 0 ? product.fbmNewPrice / 100 : null,
        
        // Sales and inventory data
        offerCount: product.offerCount || 0,
        estimatedMonthlySales: calculateMonthlySales(),
        inStock: isInStock(),
        
        // Sales rank data
        salesRank: product.salesRanks ? Object.values(product.salesRanks)[0]?.[0] : null,
        
        // Historical data
        priceHistory: parseHistoryData(),
        
        // Metadata
        tokensUsed: data.tokensConsumed || 1,
        tokensLeft: data.tokensLeft || 0,
        processingTime: data.processingTimeInMs || 0,
        lastUpdate: product.lastUpdate ? new Date((product.lastUpdate + 21564000) * 60000).toISOString() : null
      }
    };

    console.log('Keepa data processed successfully:', {
      title: result.data.title,
      priceHistoryPoints: result.data.priceHistory.length,
      tokensLeft: result.data.tokensLeft,
      offerCount: result.data.offerCount,
      inStock: result.data.inStock
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Keepa API error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
