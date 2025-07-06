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
  buyBoxPriceHistory: number[];
  fbaNewPrice: number;
  fbmNewPrice: number;
  offerCountHistory: number[];
  lastUpdate: number;
  stats?: {
    sales30?: number;
    sales90?: number;
    buyBoxShipped30?: number;
  };
}

// Helper function to convert Keepa timestamp to ISO
function keepaTimeToISO(keepaTime: number): string {
  return new Date((keepaTime + 21564000) * 60 * 1000).toISOString();
}

// Helper function to get last non-null value from array
function getLastNonNullValue(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined && arr[i] > 0) {
      return arr[i];
    }
  }
  return null;
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
    
    // Extract basic product info
    const title = product.title || 'Product title not available';
    const manufacturer = product.manufacturer || null;
    const category = product.categoryTree?.[0]?.name || 'Unknown';
    
    // Extract image URL
    let imageUrl = null;
    if (product.imagesCSV) {
      const images = product.imagesCSV.split(',');
      if (images.length > 0 && images[0].trim()) {
        imageUrl = `https://images-na.ssl-images-amazon.com/images/I/${images[0].trim()}.jpg`;
      }
    }

    // Extract pricing data - get last non-null values and convert from cents
    const buyBoxPrice = getLastNonNullValue(product.buyBoxPriceHistory);
    const buyBoxPriceUSD = buyBoxPrice ? buyBoxPrice / 100 : null;
    
    const lowestFBAPrice = getLastNonNullValue([product.fbaNewPrice]);
    const lowestFBAPriceUSD = lowestFBAPrice ? lowestFBAPrice / 100 : null;
    
    const lowestFBMPrice = getLastNonNullValue([product.fbmNewPrice]);
    const lowestFBMPriceUSD = lowestFBMPrice ? lowestFBMPrice / 100 : null;

    // Extract offer data
    const offerCount = getLastNonNullValue(product.offerCountHistory) || product.offerCount || 0;
    const inStock = offerCount > 0 || buyBoxPriceUSD !== null;

    // Extract sales rank
    const salesRank = product.salesRanks ? Object.values(product.salesRanks)[0]?.[0] : null;

    // Calculate estimated monthly sales using strict hierarchy
    let estimatedMonthlySales = null;
    if (product.stats?.sales30 && product.stats.sales30 > 0) {
      estimatedMonthlySales = product.stats.sales30;
    } else if (product.stats?.sales90 && product.stats.sales90 > 0) {
      estimatedMonthlySales = Math.floor(product.stats.sales90 / 3);
    } else if (product.stats?.buyBoxShipped30 && product.stats.buyBoxShipped30 > 0) {
      estimatedMonthlySales = product.stats.buyBoxShipped30;
    }

    // Parse historical price data from CSV format
    const priceHistory = [];
    if (product.csv && product.csv.length > 0) {
      // Keepa CSV indices: [0] = Amazon, [1] = New, [18] = Buy Box, [3] = Sales Rank, [11] = Offer Count
      const timestamps = product.csv[0] || [];
      const buyBoxPrices = product.csv[18] || [];
      const amazonPrices = product.csv[0] || [];
      const newPrices = product.csv[1] || [];
      const salesRanks = product.csv[3] || [];
      const offerCounts = product.csv[11] || [];

      for (let i = 0; i < timestamps.length; i += 2) {
        if (timestamps[i] && timestamps[i + 1] !== undefined) {
          const timestamp = keepaTimeToISO(timestamps[i]);
          
          const historyEntry = {
            timestamp,
            buyBoxPrice: buyBoxPrices[i + 1] && buyBoxPrices[i + 1] > 0 ? buyBoxPrices[i + 1] / 100 : null,
            amazonPrice: amazonPrices[i + 1] && amazonPrices[i + 1] > 0 ? amazonPrices[i + 1] / 100 : null,
            newPrice: newPrices[i + 1] && newPrices[i + 1] > 0 ? newPrices[i + 1] / 100 : null,
            salesRank: salesRanks[i + 1] || null,
            offerCount: offerCounts[i + 1] || 0
          };

          // Only add entries that have at least some data
          if (historyEntry.buyBoxPrice || historyEntry.amazonPrice || historyEntry.newPrice || historyEntry.salesRank) {
            priceHistory.push(historyEntry);
          }
        }
      }
    }

    const result = {
      success: true,
      data: {
        asin: product.asin,
        title,
        manufacturer,
        category,
        imageUrl,
        
        // Current pricing data
        buyBoxPrice: buyBoxPriceUSD,
        lowestFBAPrice: lowestFBAPriceUSD,
        lowestFBMPrice: lowestFBMPriceUSD,
        
        // Sales and inventory data
        offerCount,
        estimatedMonthlySales,
        inStock,
        
        // Sales rank data
        salesRank,
        
        // Historical data - parsed and cleaned
        priceHistory,
        
        // Metadata
        tokensUsed: data.tokensConsumed || 1,
        tokensLeft: data.tokensLeft || 0,
        processingTime: data.processingTimeInMs || 0,
        lastUpdate: product.lastUpdate ? keepaTimeToISO(product.lastUpdate) : null
      }
    };

    console.log('Keepa data processed successfully:', {
      title: result.data.title,
      buyBoxPrice: result.data.buyBoxPrice,
      lowestFBAPrice: result.data.lowestFBAPrice,
      priceHistoryPoints: result.data.priceHistory.length,
      tokensLeft: result.data.tokensLeft,
      offerCount: result.data.offerCount,
      inStock: result.data.inStock,
      monthlySales: result.data.estimatedMonthlySales
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
