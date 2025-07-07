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
  offers?: Array<{
    sellerId: string;
    isFBA: boolean;
    isFBM: boolean;
    isShippable: boolean;
    condition: number;
    conditionComment: string;
    price: number;
    shipping: number;
    availability: number;
    lastSeen: number;
  }>;
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

// Helper function to get current price from offerCSV - get the most recent valid price
function getCurrentPriceFromOfferCSV(offerCSV: number[]): number | null {
  if (!offerCSV || offerCSV.length === 0) return null;
  
  // offerCSV contains [timestamp, price, shipping, timestamp, price, shipping, ...]
  // We want the most recent price (last price entry)
  // Step backwards through the array in groups of 3 (timestamp, price, shipping)
  for (let i = offerCSV.length - 2; i >= 1; i -= 3) {
    if (offerCSV[i] && offerCSV[i] > 0) {
      console.log('Price Debug: Found price at index', i, ':', offerCSV[i]);
      return offerCSV[i];
    }
  }
  
  // If no recent price found, try the first price entry
  if (offerCSV.length >= 2 && offerCSV[1] && offerCSV[1] > 0) {
    console.log('Price Debug: Using first price entry:', offerCSV[1]);
    return offerCSV[1];
  }
  
  return null;
}

// Helper function to check if an offer is currently active based on lastSeen timestamp
function isOfferCurrentlyActive(lastSeen: number): boolean {
  if (!lastSeen) return false;
  
  // Convert Keepa timestamp to Date
  const lastSeenDate = new Date((lastSeen + 21564000) * 60 * 1000);
  const now = new Date();
  const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
  
  // Consider offer active if last seen within 24 hours
  return hoursSinceLastSeen <= 24;
}

// Helper function to get latest price from offerCSV - scans backward for most recent price > 0
function getLatestPriceFromOfferCSV(offerCSV: number[]): number | null {
  if (!offerCSV || offerCSV.length === 0) return null;
  
  // offerCSV contains [timestamp, price, shipping, timestamp, price, shipping, ...]
  // Scan backwards through the array in groups of 3 (timestamp, price, shipping)
  for (let i = offerCSV.length - 2; i >= 1; i -= 3) {
    if (offerCSV[i] && offerCSV[i] > 0) {
      console.log('Latest Price Debug: Found price at index', i, ':', offerCSV[i]);
      return offerCSV[i];
    }
  }
  
  return null;
}

// Helper function to get lowest FBA price from current offers
function getLowestFBAPrice(offers: any[]): number | null {
  if (!offers || offers.length === 0) {
    console.log('FBA Debug: No offers array or empty offers');
    return null;
  }
  
  console.log('FBA Debug: Processing', offers.length, 'offers for FBA');
  
  // Find all FBA offers and get their current prices
  const fbaOffers = offers.filter(offer => 
    offer.isFBA === true && offer.offerCSV && offer.offerCSV.length > 0
  ).map(offer => ({
    ...offer,
    currentPrice: getCurrentPriceFromOfferCSV(offer.offerCSV)
  })).filter(offer => offer.currentPrice && offer.currentPrice > 0);
  
  console.log('FBA Debug: Found', fbaOffers.length, 'FBA offers with valid prices');
  
  if (fbaOffers.length === 0) {
    return null;
  }
  
  // Sort by price and get the lowest
  fbaOffers.sort((a, b) => a.currentPrice - b.currentPrice);
  const lowestPrice = fbaOffers[0].currentPrice / 100; // Convert from cents
  console.log('FBA Debug: Lowest FBA price:', lowestPrice);
  return lowestPrice;
}

// Helper function to get lowest FBM price from current offers
function getLowestFBMPrice(offers: any[]): number | null {
  if (!offers || offers.length === 0) {
    console.log('FBM Debug: No offers array or empty offers');
    return null;
  }
  
  console.log('FBM Debug: Processing', offers.length, 'offers for FBM');
  console.log('FBM Debug: Raw offers data:', JSON.stringify(offers.map(o => ({
    isFBA: o.isFBA,
    condition: o.condition,
    hasOfferCSV: !!o.offerCSV,
    offerCSVLength: o.offerCSV?.length || 0,
    lastSeen: o.lastSeen,
    sellerId: o.sellerId,
    isActive: isOfferCurrentlyActive(o.lastSeen)
  })), null, 2));
  
  // Filter offers where: isFBA === false, condition === 1, offerCSV exists, lastSeen exists, and offer is currently active
  const filteredOffers = offers.filter(offer => 
    offer.isFBA === false && 
    offer.condition === 1 && 
    offer.offerCSV && 
    offer.offerCSV.length > 0 &&
    offer.lastSeen &&
    isOfferCurrentlyActive(offer.lastSeen)
  );
  
  console.log('FBM Debug: Found', filteredOffers.length, 'filtered active FBM offers');
  
  if (filteredOffers.length === 0) {
    console.log('FBM Debug: No valid active FBM offers found after filtering');
    return null;
  }
  
  // Extract current price for each offer using getCurrentPriceFromOfferCSV
  const fbmOffersWithPrices = filteredOffers.map(offer => {
    const currentPrice = getCurrentPriceFromOfferCSV(offer.offerCSV);
    const lastSeenDate = new Date((offer.lastSeen + 21564000) * 60 * 1000);
    console.log('FBM Debug: Offer', offer.sellerId, 'lastSeen:', lastSeenDate.toISOString(), 'currentPrice:', currentPrice, 'offerCSV sample:', offer.offerCSV.slice(-6));
    return {
      ...offer,
      currentPrice: currentPrice
    };
  }).filter(offer => offer.currentPrice && offer.currentPrice > 0);
  
  console.log('FBM Debug: Found', fbmOffersWithPrices.length, 'active FBM offers with valid current prices');
  console.log('FBM Debug: Price breakdown:', fbmOffersWithPrices.map(o => ({
    sellerId: o.sellerId,
    price: o.currentPrice / 100,
    lastSeen: new Date((o.lastSeen + 21564000) * 60 * 1000).toISOString()
  })));
  
  if (fbmOffersWithPrices.length === 0) {
    console.log('FBM Debug: No active FBM offers with valid current prices found');
    return null;
  }
  
  // Sort by price and get the lowest
  fbmOffersWithPrices.sort((a, b) => a.currentPrice - b.currentPrice);
  const lowestPrice = fbmOffersWithPrices[0].currentPrice / 100; // Convert from cents
  console.log('FBM Debug: Lowest active FBM price:', lowestPrice, 'from offer with lastSeen:', new Date((fbmOffersWithPrices[0].lastSeen + 21564000) * 60 * 1000).toISOString());
  return lowestPrice;
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
    
    // Extract image URL from imagesCSV
    let imageUrl = null;
    if (product.imagesCSV) {
      const images = product.imagesCSV.split(',');
      if (images.length > 0 && images[0].trim()) {
        imageUrl = `https://images-na.ssl-images-amazon.com/images/I/${images[0].trim()}.jpg`;
      }
    }

    // Extract pricing data - get current values from history arrays and convert from cents
    const buyBoxHistory = product.csv && product.csv[18] ? product.csv[18] : [];
    const buyBoxPrice = getLastNonNullValue(buyBoxHistory);
    const buyBoxPriceUSD = buyBoxPrice ? buyBoxPrice / 100 : null;
    
    // Use the new functions to get accurate current FBA and FBM prices
    const lowestFBAPriceUSD = getLowestFBAPrice(product.offers || []);
    const lowestFBMPriceUSD = getLowestFBMPrice(product.offers || []);

    console.log('Pricing Debug:', {
      buyBoxPriceUSD: buyBoxPriceUSD,
      lowestFBAPriceUSD: lowestFBAPriceUSD,
      lowestFBMPriceUSD: lowestFBMPriceUSD,
      totalOffers: product.offers?.length || 0
    });

    // Extract offer count from history
    const offerHistory = product.csv && product.csv[11] ? product.csv[11] : [];
    const offerCount = getLastNonNullValue(offerHistory) || product.offerCount || 0;
    const inStock = offerCount > 0 || buyBoxPriceUSD !== null;

    // Extract sales rank from CSV or salesRanks object
    let salesRank = null;
    if (product.csv && product.csv[3]) {
      salesRank = getLastNonNullValue(product.csv[3]);
    } else if (product.salesRanks) {
      const rankValues = Object.values(product.salesRanks);
      if (rankValues.length > 0 && rankValues[0].length > 0) {
        salesRank = rankValues[0][rankValues[0].length - 1];
      }
    }

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
      // Process timestamps and corresponding values
      const timestamps = product.csv[0] || [];
      const buyBoxPrices = product.csv[18] || [];
      const fbaPrices = product.csv[1] || [];
      const fbmPrices = product.csv[2] || [];
      const salesRanks = product.csv[3] || [];
      const offerCounts = product.csv[11] || [];

      // Process data in pairs (timestamp, value)
      for (let i = 0; i < timestamps.length; i += 2) {
        if (timestamps[i] && timestamps[i + 1] !== undefined) {
          const timestamp = keepaTimeToISO(timestamps[i]);
          
          const historyEntry = {
            timestamp,
            buyBoxPrice: buyBoxPrices[i + 1] && buyBoxPrices[i + 1] > 0 ? buyBoxPrices[i + 1] / 100 : null,
            amazonPrice: fbaPrices[i + 1] && fbaPrices[i + 1] > 0 ? fbaPrices[i + 1] / 100 : null,
            newPrice: fbmPrices[i + 1] && fbmPrices[i + 1] > 0 ? fbmPrices[i + 1] / 100 : null,
            salesRank: salesRanks[i + 1] || null,
            offerCount: offerCounts[i + 1] || 0
          };

          // Only add entries that have at least some useful data
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

    console.log('Processed Keepa data:', {
      title: result.data.title,
      buyBoxPrice: result.data.buyBoxPrice,
      lowestFBAPrice: result.data.lowestFBAPrice,
      lowestFBMPrice: result.data.lowestFBMPrice,
      priceHistoryPoints: result.data.priceHistory.length,
      tokensLeft: result.data.tokensLeft,
      offerCount: result.data.offerCount,
      inStock: result.data.inStock,
      monthlySales: result.data.estimatedMonthlySales,
      salesRank: result.data.salesRank
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
