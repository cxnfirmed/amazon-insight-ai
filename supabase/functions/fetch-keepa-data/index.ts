
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KeepaPriceHistory {
  csv: number[];
  domain: number;
}

interface KeepaProduct {
  asin: string;
  domainId: number;
  title: string;
  brand: string;
  categories: number[];
  imagesCSV: string;
  salesRanks: { [key: string]: number[] };
  stats: {
    current: number[];
    avg: number[];
  };
  csv: number[][];
  offersSuccessful: boolean;
  offerCSV: string;
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

    const keepaUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=${domain}&asin=${asin}&stats=1&offers=20`;
    
    const response = await fetch(keepaUrl);
    if (!response.ok) {
      throw new Error(`Keepa API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      throw new Error('Product not found in Keepa database');
    }

    const product: KeepaProduct = data.products[0];
    
    // Parse price history data
    const priceHistory = [];
    if (product.csv && product.csv[0]) {
      const timestamps = product.csv[0];
      const buyBoxPrices = product.csv[18] || []; // Buy Box price
      const amazonPrices = product.csv[0] || []; // Amazon price
      const newPrices = product.csv[1] || []; // New 3rd party price
      const salesRanks = product.csv[3] || []; // Sales rank

      for (let i = 0; i < timestamps.length; i += 2) {
        if (timestamps[i] && timestamps[i + 1]) {
          const timestamp = new Date((timestamps[i] + 21564000) * 60000); // Keepa time conversion
          const buyBoxPrice = buyBoxPrices[i + 1] ? buyBoxPrices[i + 1] / 100 : null;
          const amazonPrice = amazonPrices[i + 1] ? amazonPrices[i + 1] / 100 : null;
          const newPrice = newPrices[i + 1] ? newPrices[i + 1] / 100 : null;
          const salesRank = salesRanks[i + 1] || null;

          priceHistory.push({
            timestamp: timestamp.toISOString(),
            buyBoxPrice,
            amazonPrice,
            newPrice,
            salesRank,
            amazonInStock: amazonPrice !== null && amazonPrice > 0
          });
        }
      }
    }

    // Get current stats
    const currentStats = product.stats?.current || [];
    const avgStats = product.stats?.avg || [];

    // Parse offer information
    let offerCount = 0;
    let lowestFBAPrice = null;
    let lowestFBMPrice = null;
    
    if (product.offerCSV) {
      const offers = product.offerCSV.split(',');
      offerCount = offers.length / 2; // Each offer has 2 data points
      
      // Extract FBA and FBM prices from offers
      for (let i = 0; i < offers.length; i += 2) {
        const price = parseInt(offers[i + 1]);
        if (price > 0) {
          const priceInDollars = price / 100;
          // Assume FBA if price is higher (rough heuristic)
          if (!lowestFBAPrice || priceInDollars < lowestFBAPrice) {
            lowestFBAPrice = priceInDollars;
          }
          if (!lowestFBMPrice || priceInDollars < lowestFBMPrice) {
            lowestFBMPrice = priceInDollars;
          }
        }
      }
    }

    const result = {
      success: true,
      data: {
        asin: product.asin,
        title: product.title || 'Unknown Product',
        brand: product.brand || null,
        categories: product.categories || [], // Include raw category data
        currentPrice: currentStats[0] ? currentStats[0] / 100 : null,
        buyBoxPrice: currentStats[18] ? currentStats[18] / 100 : null,
        amazonPrice: currentStats[0] ? currentStats[0] / 100 : null,
        lowestFBAPrice,
        lowestFBMPrice,
        salesRank: currentStats[3] || null,
        offerCount,
        amazonInStock: currentStats[0] > 0,
        priceHistory: priceHistory.slice(-365), // Last 365 data points
        avgPrice30: avgStats[0] ? avgStats[0] / 100 : null,
        avgPrice90: avgStats[1] ? avgStats[1] / 100 : null,
        avgPrice180: avgStats[2] ? avgStats[2] / 100 : null
      }
    };

    console.log('Keepa data processed successfully:', result.data.title);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Keepa API error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
