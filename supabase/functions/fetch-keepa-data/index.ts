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
    avg30?: number;
    avg90?: number;
    avg180?: number;
    current?: number;
    salesRankDrops30?: number;
    salesRankDrops90?: number;
    salesRankDrops180?: number;
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

// Helper function to get current price from offerCSV - get the most recent valid price within last 12 hours (more restrictive)
function getCurrentPriceFromOfferCSV(offerCSV: number[]): number | null {
  if (!offerCSV || offerCSV.length === 0) return null;
  
  console.log('Price Debug: Processing offerCSV with length:', offerCSV.length);
  
  // offerCSV contains [timestamp, price, shipping, timestamp, price, shipping, ...]
  // Use a more restrictive 12-hour window instead of 48 hours
  const now = Date.now();
  const twelveHoursAgo = now - (12 * 60 * 60 * 1000);
  
  let mostRecentValidPrice = null;
  let mostRecentTimestamp = 0;
  
  // Process in groups of 3 (timestamp, price, shipping)
  for (let i = 0; i < offerCSV.length - 2; i += 3) {
    const keepaTimestamp = offerCSV[i];
    const price = offerCSV[i + 1];
    
    if (!keepaTimestamp || !price || price <= 0) continue;
    
    // Convert Keepa timestamp to milliseconds
    const timestampMs = (keepaTimestamp + 21564000) * 60 * 1000;
    
    // Only consider prices from the last 12 hours (more restrictive)
    if (timestampMs >= twelveHoursAgo && timestampMs > mostRecentTimestamp) {
      mostRecentTimestamp = timestampMs;
      mostRecentValidPrice = price;
      console.log('Price Debug: Found recent valid price (12h window):', price, 'at timestamp:', new Date(timestampMs).toISOString());
    }
  }
  
  // If no prices in last 12 hours, get the most recent price regardless of age
  if (!mostRecentValidPrice) {
    console.log('Price Debug: No prices in last 12 hours, getting most recent available');
    for (let i = offerCSV.length - 2; i >= 1; i -= 3) {
      if (offerCSV[i] && offerCSV[i] > 0) {
        const correspondingTimestamp = offerCSV[i - 1];
        if (correspondingTimestamp) {
          const timestampMs = (correspondingTimestamp + 21564000) * 60 * 1000;
          console.log('Price Debug: Using most recent available price:', offerCSV[i], 'from:', new Date(timestampMs).toISOString());
          return offerCSV[i];
        }
      }
    }
    return null;
  }
  
  console.log('Price Debug: Using most recent valid price (12h):', mostRecentValidPrice);
  return mostRecentValidPrice;
}

// Helper function to check if an offer is currently active based on lastSeen timestamp - ENHANCED with stricter timing
function isOfferCurrentlyActive(lastSeen: number): boolean {
  if (!lastSeen) return false;
  
  // Convert Keepa timestamp to Date
  const lastSeenDate = new Date((lastSeen + 21564000) * 60 * 1000);
  const now = new Date();
  const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
  
  // Consider offer active if last seen within 6 hours (much more restrictive)
  return hoursSinceLastSeen <= 6;
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

// Helper function to get lowest FBA price from current offers - ENHANCED with strict timing
function getLowestFBAPrice(offers: any[]): number | null {
  if (!offers || offers.length === 0) {
    console.log('FBA Debug: No offers array or empty offers');
    return null;
  }
  
  console.log('FBA Debug: Processing', offers.length, 'offers for FBA');
  
  // Filter for FBA offers with much stricter conditions (6-hour window)
  const fbaOffers = offers.filter(offer => {
    const isValidFBA = offer.isFBA === true && 
                      offer.condition === 1 && 
                      offer.offerCSV && 
                      offer.offerCSV.length > 0 &&
                      offer.lastSeen &&
                      isOfferCurrentlyActive(offer.lastSeen);
    
    if (isValidFBA) {
      console.log('FBA Debug: Valid FBA offer found - Seller:', offer.sellerId, 
                  'LastSeen:', new Date((offer.lastSeen + 21564000) * 60 * 1000).toISOString(),
                  'OfferCSV length:', offer.offerCSV.length);
    } else if (offer.isFBA === true && offer.condition === 1) {
      console.log('FBA Debug: FBA offer rejected - Seller:', offer.sellerId, 
                  'LastSeen:', offer.lastSeen ? new Date((offer.lastSeen + 21564000) * 60 * 1000).toISOString() : 'null',
                  'Hours ago:', offer.lastSeen ? ((new Date().getTime() - (offer.lastSeen + 21564000) * 60 * 1000) / (1000 * 60 * 60)).toFixed(1) : 'N/A');
    }
    
    return isValidFBA;
  });
  
  console.log('FBA Debug: Found', fbaOffers.length, 'valid active FBA offers (6-hour window)');
  
  if (fbaOffers.length === 0) {
    console.log('FBA Debug: No valid active FBA offers found within 6 hours');
    return null;
  }
  
  // Extract current prices using the enhanced getCurrentPriceFromOfferCSV function
  const fbaOffersWithPrices = fbaOffers.map(offer => {
    const currentPrice = getCurrentPriceFromOfferCSV(offer.offerCSV);
    console.log('FBA Debug: Offer', offer.sellerId, 'current price:', currentPrice ? (currentPrice / 100).toFixed(2) : 'null');
    return {
      ...offer,
      currentPrice: currentPrice
    };
  }).filter(offer => offer.currentPrice && offer.currentPrice > 0);
  
  console.log('FBA Debug: Found', fbaOffersWithPrices.length, 'FBA offers with valid current prices (6-hour window)');
  
  if (fbaOffersWithPrices.length === 0) {
    console.log('FBA Debug: No FBA offers with valid current prices found within 6 hours');
    return null;
  }
  
  // Sort by current price and get the lowest
  fbaOffersWithPrices.sort((a, b) => a.currentPrice - b.currentPrice);
  const lowestPrice = fbaOffersWithPrices[0].currentPrice / 100; // Convert from cents
  
  console.log('FBA Debug: Final lowest FBA price (6-hour window):', lowestPrice.toFixed(2), 'from seller:', fbaOffersWithPrices[0].sellerId);
  console.log('FBA Debug: All active FBA prices found (6-hour window):', fbaOffersWithPrices.map(o => ({
    seller: o.sellerId,
    price: (o.currentPrice / 100).toFixed(2),
    lastSeen: new Date((o.lastSeen + 21564000) * 60 * 1000).toISOString(),
    hoursAgo: ((new Date().getTime() - (o.lastSeen + 21564000) * 60 * 1000) / (1000 * 60 * 60)).toFixed(1)
  })));
  
  return Number(lowestPrice.toFixed(2));
}

// Helper function to get lowest FBM price from current offers - ENHANCED VERSION with much stricter filtering
function getLowestFBMPrice(offers: any[]): number | null {
  if (!offers || offers.length === 0) {
    console.log('FBM Debug: No offers array or empty offers');
    return null;
  }
  
  console.log('FBM Debug: Processing', offers.length, 'offers for FBM');
  
  // Filter for FBM offers with much stricter conditions (6-hour window)
  const fbmOffers = offers.filter(offer => {
    const isValidFBM = offer.isFBA === false && 
                      offer.condition === 1 && 
                      offer.offerCSV && 
                      offer.offerCSV.length > 0 &&
                      offer.lastSeen &&
                      isOfferCurrentlyActive(offer.lastSeen);
    
    if (isValidFBM) {
      console.log('FBM Debug: Valid FBM offer found - Seller:', offer.sellerId, 
                  'LastSeen:', new Date((offer.lastSeen + 21564000) * 60 * 1000).toISOString(),
                  'OfferCSV length:', offer.offerCSV.length);
    } else if (offer.isFBA === false && offer.condition === 1) {
      console.log('FBM Debug: FBM offer rejected - Seller:', offer.sellerId, 
                  'LastSeen:', offer.lastSeen ? new Date((offer.lastSeen + 21564000) * 60 * 1000).toISOString() : 'null',
                  'Hours ago:', offer.lastSeen ? ((new Date().getTime() - (offer.lastSeen + 21564000) * 60 * 1000) / (1000 * 60 * 60)).toFixed(1) : 'N/A');
    }
    
    return isValidFBM;
  });
  
  console.log('FBM Debug: Found', fbmOffers.length, 'valid active FBM offers (6-hour window)');
  
  if (fbmOffers.length === 0) {
    console.log('FBM Debug: No valid active FBM offers found within 6 hours');
    return null;
  }
  
  // Extract current prices using the enhanced getCurrentPriceFromOfferCSV function
  const fbmOffersWithPrices = fbmOffers.map(offer => {
    const currentPrice = getCurrentPriceFromOfferCSV(offer.offerCSV);
    console.log('FBM Debug: Offer', offer.sellerId, 'current price:', currentPrice ? (currentPrice / 100).toFixed(2) : 'null');
    return {
      ...offer,
      currentPrice: currentPrice
    };
  }).filter(offer => offer.currentPrice && offer.currentPrice > 0);
  
  console.log('FBM Debug: Found', fbmOffersWithPrices.length, 'FBM offers with valid current prices (6-hour window)');
  
  if (fbmOffersWithPrices.length === 0) {
    console.log('FBM Debug: No FBM offers with valid current prices found within 6 hours');
    return null;
  }
  
  // Sort by current price and get the lowest
  fbmOffersWithPrices.sort((a, b) => a.currentPrice - b.currentPrice);
  const lowestPrice = fbmOffersWithPrices[0].currentPrice / 100; // Convert from cents
  
  console.log('FBM Debug: Final lowest FBM price (6-hour window):', lowestPrice.toFixed(2), 'from seller:', fbmOffersWithPrices[0].sellerId);
  console.log('FBM Debug: All active FBM prices found (6-hour window):', fbmOffersWithPrices.map(o => ({
    seller: o.sellerId,
    price: (o.currentPrice / 100).toFixed(2),
    lastSeen: new Date((o.lastSeen + 21564000) * 60 * 1000).toISOString(),
    hoursAgo: ((new Date().getTime() - (o.lastSeen + 21564000) * 60 * 1000) / (1000 * 60 * 60)).toFixed(1)
  })));
  
  return Number(lowestPrice.toFixed(2));
}

// Enhanced function to extract monthly sales from multiple Keepa data sources
function extractMonthlySales(product: KeepaProduct): number | null {
  console.log('Sales Debug: Extracting monthly sales from Keepa data');
  console.log('Sales Debug: Available stats:', product.stats);
  
  // Priority 1: Direct sales30 from stats (most reliable)
  if (product.stats?.sales30 && product.stats.sales30 > 0) {
    console.log('Sales Debug: Using stats.sales30:', product.stats.sales30);
    return product.stats.sales30;
  }
  
  // Priority 2: Calculate from sales90 (divide by 3 for monthly average)
  if (product.stats?.sales90 && product.stats.sales90 > 0) {
    const monthlySales = Math.round(product.stats.sales90 / 3);
    console.log('Sales Debug: Using stats.sales90 / 3:', monthlySales, '(original:', product.stats.sales90, ')');
    return monthlySales;
  }
  
  // Priority 3: Use buyBoxShipped30 as estimate
  if (product.stats?.buyBoxShipped30 && product.stats.buyBoxShipped30 > 0) {
    console.log('Sales Debug: Using stats.buyBoxShipped30:', product.stats.buyBoxShipped30);
    return product.stats.buyBoxShipped30;
  }
  
  // Priority 4: Try to extract from CSV data (sales rank drops can indicate sales)
  if (product.stats?.salesRankDrops30 && product.stats.salesRankDrops30 > 0) {
    // Sales rank drops can be a rough indicator of sales activity
    const estimatedSales = Math.min(product.stats.salesRankDrops30 * 10, 10000); // Cap at 10k
    console.log('Sales Debug: Using salesRankDrops30 * 10 as estimate:', estimatedSales, '(rank drops:', product.stats.salesRankDrops30, ')');
    return estimatedSales;
  }
  
  // Priority 5: Check if there's any sales-related data in CSV format
  if (product.csv && product.csv.length > 0) {
    // CSV index 16 sometimes contains sales data
    if (product.csv[16] && product.csv[16].length > 0) {
      const salesData = getLastNonNullValue(product.csv[16]);
      if (salesData && salesData > 0) {
        console.log('Sales Debug: Using CSV[16] sales data:', salesData);
        return salesData;
      }
    }
  }
  
  console.log('Sales Debug: No monthly sales data found in any source');
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

    // Call Keepa API with comprehensive parameters - enhanced to get more stats
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

    // Use the enhanced monthly sales extraction function
    const estimatedMonthlySales = extractMonthlySales(product);

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
