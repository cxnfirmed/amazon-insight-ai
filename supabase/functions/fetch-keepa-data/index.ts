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
    avg30: number[];
    avg90: number[];
    avg180: number[];
  };
  csv: number[][];
  offersSuccessful: boolean;
  offerCSV: string;
  variations: any[];
  parent: string;
  type: number;
  hazardousMaterialType: number;
  packageQuantity: number;
  availabilityAmazon: number;
  frequentlyBoughtTogether: string[];
  features: string[];
  description: string;
  manufacturer: string;
  model: string;
  color: string;
  size: string;
  edition: string;
  format: string;
  isEbook: boolean;
  isAdultProduct: boolean;
  numberOfItems: number;
  numberOfPages: number;
  publicationDate: number;
  releaseDate: number;
  languages: any[];
  lastUpdate: number;
  lastRatingUpdate: number;
  lastPriceChange: number;
  lastEbayUpdate: number;
  ebayListingIds: string[];
  couponCSV: string;
  promotionCSV: string;
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

    console.log(`Fetching comprehensive Keepa data for ASIN: ${asin}`);

    // Enhanced Keepa API call with more parameters for detailed data
    const keepaUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=${domain}&asin=${asin}&stats=1&offers=50&buybox=1&fbafees=1&variations=1&history=1&rating=1&reviews=1&update=1&days=365`;
    
    const response = await fetch(keepaUrl);
    if (!response.ok) {
      throw new Error(`Keepa API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      throw new Error('Product not found in Keepa database');
    }

    const product: KeepaProduct = data.products[0];
    
    // Parse comprehensive price history data with more data points
    const priceHistory = [];
    if (product.csv && product.csv[0]) {
      const timestamps = product.csv[0] || [];
      const amazonPrices = product.csv[0] || []; // Amazon price
      const newPrices = product.csv[1] || []; // New 3rd party price
      const usedPrices = product.csv[2] || []; // Used price
      const salesRanks = product.csv[3] || []; // Sales rank
      const buyBoxPrices = product.csv[18] || []; // Buy Box price
      const newFBAPrices = product.csv[16] || []; // New FBA price
      const newFBMPrices = product.csv[17] || []; // New FBM price
      const availabilityAmazon = product.csv[19] || []; // Amazon availability
      const offerCounts = product.csv[11] || []; // Offer count

      for (let i = 0; i < timestamps.length; i += 2) {
        if (timestamps[i] && timestamps[i + 1] !== undefined) {
          const timestamp = new Date((timestamps[i] + 21564000) * 60000); // Keepa time conversion
          
          priceHistory.push({
            timestamp: timestamp.toISOString(),
            amazonPrice: amazonPrices[i + 1] && amazonPrices[i + 1] > 0 ? amazonPrices[i + 1] / 100 : null,
            newPrice: newPrices[i + 1] && newPrices[i + 1] > 0 ? newPrices[i + 1] / 100 : null,
            usedPrice: usedPrices[i + 1] && usedPrices[i + 1] > 0 ? usedPrices[i + 1] / 100 : null,
            buyBoxPrice: buyBoxPrices[i + 1] && buyBoxPrices[i + 1] > 0 ? buyBoxPrices[i + 1] / 100 : null,
            newFBAPrice: newFBAPrices[i + 1] && newFBAPrices[i + 1] > 0 ? newFBAPrices[i + 1] / 100 : null,
            newFBMPrice: newFBMPrices[i + 1] && newFBMPrices[i + 1] > 0 ? newFBMPrices[i + 1] / 100 : null,
            salesRank: salesRanks[i + 1] || null,
            amazonInStock: availabilityAmazon[i + 1] === 1,
            offerCount: offerCounts[i + 1] || 0
          });
        }
      }
    }

    // Extract current stats with more precision
    const currentStats = product.stats?.current || [];
    const avgStats = product.stats?.avg || [];
    const avg30Stats = product.stats?.avg30 || [];
    const avg90Stats = product.stats?.avg90 || [];
    const avg180Stats = product.stats?.avg180 || [];

    // Enhanced offer analysis
    let offerCount = 0;
    let lowestFBAPrice = null;
    let lowestFBMPrice = null;
    let amazonSellerPresent = false;
    let primeEligibleOffers = 0;
    
    if (product.offerCSV) {
      const offers = product.offerCSV.split(',');
      offerCount = Math.floor(offers.length / 2);
      
      for (let i = 0; i < offers.length; i += 2) {
        const price = parseInt(offers[i + 1]);
        if (price > 0) {
          const priceInDollars = price / 100;
          
          // Determine if it's FBA or FBM based on offer characteristics
          const isFBA = i % 4 === 0; // Simple heuristic - in real implementation, this would be more sophisticated
          
          if (isFBA) {
            if (!lowestFBAPrice || priceInDollars < lowestFBAPrice) {
              lowestFBAPrice = priceInDollars;
            }
            primeEligibleOffers++;
          } else {
            if (!lowestFBMPrice || priceInDollars < lowestFBMPrice) {
              lowestFBMPrice = priceInDollars;
            }
          }
        }
      }
    }

    // Calculate estimated sales volume based on sales rank and category
    let estimatedMonthlySales = null;
    if (currentStats[3]) { // Sales rank exists
      const salesRank = currentStats[3];
      const categoryMultiplier = product.categories?.[0] === 5 ? 2.5 : 1.5; // Electronics vs other categories
      
      if (salesRank < 1000) {
        estimatedMonthlySales = Math.floor((1000 / salesRank) * 500 * categoryMultiplier);
      } else if (salesRank < 10000) {
        estimatedMonthlySales = Math.floor((10000 / salesRank) * 100 * categoryMultiplier);
      } else if (salesRank < 100000) {
        estimatedMonthlySales = Math.floor((100000 / salesRank) * 20 * categoryMultiplier);
      } else {
        estimatedMonthlySales = Math.floor((1000000 / salesRank) * 5 * categoryMultiplier);
      }
    }

    // Enhanced inventory analysis
    const inventoryLevel = product.availabilityAmazon === 1 ? 'In Stock' : 
                          product.availabilityAmazon === 0 ? 'Out of Stock' : 'Limited Stock';
    
    // Competition analysis
    const competitionLevel = offerCount < 5 ? 'Low' : 
                           offerCount < 15 ? 'Medium' : 'High';

    // Risk assessment based on multiple factors
    let amazonRiskScore = 1;
    if (product.brand && product.brand.toLowerCase().includes('amazon')) amazonRiskScore += 2;
    if (offerCount > 20) amazonRiskScore += 1;
    if (currentStats[3] && currentStats[3] < 1000) amazonRiskScore += 1; // High sales rank = more competitive
    
    const result = {
      success: true,
      data: {
        asin: product.asin,
        title: product.title || 'Unknown Product',
        brand: product.brand || null,
        categories: product.categories || [],
        description: product.description || null,
        manufacturer: product.manufacturer || null,
        model: product.model || null,
        color: product.color || null,
        size: product.size || null,
        packageQuantity: product.packageQuantity || 1,
        isAdultProduct: product.isAdultProduct || false,
        hazardousMaterialType: product.hazardousMaterialType || 0,
        
        // Current pricing data
        currentPrice: currentStats[0] ? currentStats[0] / 100 : null,
        buyBoxPrice: currentStats[18] ? currentStats[18] / 100 : null,
        amazonPrice: currentStats[0] ? currentStats[0] / 100 : null,
        lowestFBAPrice,
        lowestFBMPrice,
        
        // Sales and ranking data
        salesRank: currentStats[3] || null,
        estimatedMonthlySales,
        
        // Inventory and availability
        amazonInStock: product.availabilityAmazon === 1,
        inventoryLevel,
        
        // Seller and competition data
        offerCount,
        amazonSellerPresent,
        primeEligibleOffers,
        competitionLevel,
        
        // Risk assessment
        amazonRiskScore: Math.min(amazonRiskScore, 5),
        ipRiskScore: product.brand ? 1 : 2, // Lower risk if branded
        
        // Historical data
        priceHistory: priceHistory.slice(-180), // Last 180 data points
        
        // Average pricing data
        avgPrice30: avg30Stats[0] ? avg30Stats[0] / 100 : null,
        avgPrice90: avg90Stats[0] ? avg90Stats[0] / 100 : null,
        avgPrice180: avg180Stats[0] ? avg180Stats[0] / 100 : null,
        
        // Additional product details
        features: product.features || [],
        frequentlyBoughtTogether: product.frequentlyBoughtTogether || [],
        variations: product.variations || [],
        
        // Dates
        releaseDate: product.releaseDate ? new Date(product.releaseDate * 60000).toISOString() : null,
        lastPriceChange: product.lastPriceChange ? new Date((product.lastPriceChange + 21564000) * 60000).toISOString() : null,
        lastUpdate: product.lastUpdate ? new Date((product.lastUpdate + 21564000) * 60000).toISOString() : null
      }
    };

    console.log('Enhanced Keepa data processed successfully:', result.data.title);

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
