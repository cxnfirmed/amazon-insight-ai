
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input detection functions
function isUPC(input: string): boolean {
  return /^\d{12}$/.test(input.trim());
}

function isASIN(input: string): boolean {
  return /^[A-Z0-9]{10}$/.test(input.trim().toUpperCase());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safely parse the request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }

    const { asin } = requestBody;
    
    if (!asin) {
      throw new Error('ASIN or UPC is required');
    }

    const keepaApiKey = Deno.env.get('KEEPA_API_KEY');
    if (!keepaApiKey) {
      throw new Error('KEEPA_API_KEY not configured');
    }

    const trimmedInput = asin.trim();
    console.log(`Processing input: ${trimmedInput}`);

    // Detect input type using the detection functions
    const inputIsUPC = isUPC(trimmedInput);
    const inputIsASIN = isASIN(trimmedInput);

    console.log(`Input detection - UPC: ${inputIsUPC}, ASIN: ${inputIsASIN}`);

    if (!inputIsUPC && !inputIsASIN) {
      throw new Error('Invalid input format. Please enter a valid ASIN (10 characters) or UPC (12 digits).');
    }

    let apiUrl: string;
    let searchType: string;

    if (inputIsUPC) {
      // UPC search using code parameter
      searchType = 'UPC';
      apiUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&code=${trimmedInput}&history=1&stats=1&offers=20`;
      console.log('UPC search detected, using code parameter');
    } else {
      // ASIN search using asin parameter
      searchType = 'ASIN';
      apiUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&asin=${trimmedInput.toUpperCase()}&history=1&stats=1&offers=20`;
      console.log('ASIN search detected, using asin parameter');
    }

    console.log(`Calling Keepa API (${searchType}) with URL:`, apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`${searchType} API error:`, response.status, response.statusText);
      throw new Error(`Keepa API error: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log(`${searchType} API raw response length:`, responseText.length);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error(`Failed to parse ${searchType} response as JSON:`, jsonError);
      throw new Error(`Invalid JSON response from Keepa ${searchType} API: ${jsonError.message}`);
    }
    
    console.log('Parsed API response structure:', {
      hasProducts: !!data.products,
      productsLength: data.products?.length,
      tokensUsed: data.tokensUsed,
      tokensLeft: data.tokensLeft
    });
    
    if (!data.products || data.products.length === 0) {
      const identifier = inputIsUPC ? `UPC ${trimmedInput}` : `ASIN ${trimmedInput}`;
      throw new Error(`${identifier} not found in Keepa database`);
    }

    // Handle multiple products for UPC search
    if (inputIsUPC && data.products.length > 1) {
      console.log('Multiple products found for UPC:', trimmedInput);
      
      const productChoices = data.products.slice(0, 10).map(product => {
        // Extract sales rank properly from statistics current field
        let salesRank = null;
        if (product.stats?.current?.[0] !== undefined && product.stats.current[0] !== -1) {
          salesRank = product.stats.current[0];
        }
        
        return {
          asin: product.asin,
          title: product.title || 'Unknown Product',
          monthlySales: product.monthlySold || 0,
          salesRank: salesRank,
          imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null,
          price: product.stats?.current?.[18] !== undefined && product.stats.current[18] !== -1 ? product.stats.current[18] / 100 : null
        };
      });
      
      return new Response(JSON.stringify({
        success: true,
        multipleProducts: true,
        upc: trimmedInput,
        products: productChoices,
        totalFound: data.products.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process single product result
    const product = data.products[0];
    console.log('Processing product:', product.asin);
    console.log('Product stats structure:', product.stats ? Object.keys(product.stats) : 'No stats');
    console.log('Product stats current:', product.stats?.current);
    console.log('Product offers structure:', product.liveOffersOrder ? product.liveOffersOrder.length : 'No live offers');
    console.log('Product offers array:', product.offers ? product.offers.length : 'No offers array');
    
    // DETAILED DEBUGGING FOR SALES RANK
    console.log('=== SALES RANK DEBUGGING ===');
    console.log('Full product object keys:', Object.keys(product));
    console.log('Product stats object:', product.stats);
    console.log('Product stats.current full array:', product.stats?.current);
    console.log('Product stats.current[0] (Amazon sales rank):', product.stats?.current?.[0]);
    console.log('Product stats.current[3] (Current sales rank):', product.stats?.current?.[3]);
    console.log('Product csv array length:', product.csv?.length);
    console.log('Product csv first 10 items:', product.csv?.slice(0, 10));
    console.log('Product csv last 10 items:', product.csv?.slice(-10));
    console.log('Product salesRanks array:', product.salesRanks);
    console.log('Product lastUpdate:', product.lastUpdate);
    console.log('Product lastRankUpdate:', product.lastRankUpdate);
    console.log('=== END SALES RANK DEBUGGING ===');
    
    // Extract current prices from the stats object
    const currentStats = product.stats?.current || {};
    console.log('Current stats raw:', currentStats);
    
    // SALES RANK EXTRACTION - Use index 3 for current sales rank based on observed data
    let salesRank = null;
    
    // Based on the debug data, index 3 appears to contain the current sales rank
    // Index 0 might be Amazon's internal rank or a different metric
    if (currentStats[3] !== undefined && currentStats[3] !== null && currentStats[3] !== -1) {
      salesRank = currentStats[3];
      console.log('Found current sales rank from stats.current[3]:', salesRank);
    }
    // Fallback to index 0 if index 3 is not available
    else if (currentStats[0] !== undefined && currentStats[0] !== null && currentStats[0] !== -1) {
      salesRank = currentStats[0];
      console.log('Fallback: Found sales rank from stats.current[0]:', salesRank);
    }
    
    console.log('Final sales rank decision:', salesRank);

    // IMPROVED FBA PRICE CALCULATION - Get lowest priced live FBA offer
    console.log('=== FBA PRICE CALCULATION ===');
    let lowestFBAPrice = null;
    
    // First check live offers for current FBA prices
    if (product.liveOffersOrder && Array.isArray(product.liveOffersOrder)) {
      console.log('Found liveOffersOrder array with', product.liveOffersOrder.length, 'live offers');
      
      const validFBAPrices = [];
      
      for (let i = 0; i < product.liveOffersOrder.length; i++) {
        const liveOffer = product.liveOffersOrder[i];
        console.log(`Checking live offer ${i}:`, {
          isFBA: liveOffer.isFBA,
          condition: liveOffer.condition,
          price: liveOffer.price,
          isShippable: liveOffer.isShippable,
          sellerId: liveOffer.sellerId
        });
        
        // Check if this is a live FBA offer with new condition
        // Relaxed validation - only check core FBA criteria
        if (liveOffer.isFBA === true && 
            liveOffer.condition === 1 && 
            liveOffer.price && 
            liveOffer.price > 0) {
          const priceInDollars = liveOffer.price / 100;
          validFBAPrices.push(priceInDollars);
          console.log(`Found valid live FBA offer ${i}: $${priceInDollars}`);
        }
      }
      
      if (validFBAPrices.length > 0) {
        lowestFBAPrice = Math.min(...validFBAPrices);
        console.log('Calculated lowest FBA price from live offers:', lowestFBAPrice);
        console.log('All valid FBA prices found:', validFBAPrices);
      } else {
        console.log('No valid live FBA offers found');
      }
    }
    
    console.log('Final FBA price decision:', lowestFBAPrice);
    console.log('=== END FBA PRICE CALCULATION ===');
    
    // IMPROVED OFFER COUNT EXTRACTION
    let offerCount = 0;
    
    // Method 1: Check live offers first (most accurate)
    if (product.liveOffersOrder && Array.isArray(product.liveOffersOrder)) {
      offerCount = product.liveOffersOrder.length;
      console.log('Offer count from liveOffersOrder:', offerCount);
    }
    // Method 2: Check stats.current[2] (New offers count)
    else if (currentStats[2] !== undefined && currentStats[2] !== null && currentStats[2] !== -1) {
      offerCount = currentStats[2];
      console.log('Offer count from stats.current[2]:', offerCount);
    }
    // Method 3: Fallback to offerCountNew
    else if (product.offerCountNew !== undefined && product.offerCountNew !== null && product.offerCountNew !== -1) {
      offerCount = product.offerCountNew;
      console.log('Offer count from offerCountNew:', offerCount);
    }
    
    console.log('Final offer count:', offerCount);
    
    // IMPROVED STOCK STATUS DETERMINATION
    let inStock = false;
    
    // Method 1: Check live offers for actual stock availability
    if (product.liveOffersOrder && Array.isArray(product.liveOffersOrder) && product.liveOffersOrder.length > 0) {
      console.log('Checking live offers for stock status...');
      
      // Check if any offer is shippable and has stock
      for (const offer of product.liveOffersOrder) {
        if (offer && offer.isShippable !== false) {
          // If we have stock information and it's > 0, or if we don't have stock info but offer is shippable
          if (!offer.stock || offer.stock > 0) {
            inStock = true;
            console.log('Found in-stock offer:', offer);
            break;
          }
        }
      }
    }
    
    // Method 2: Check if we have a valid buy box price (indicates availability)
    if (!inStock && currentStats[18] !== undefined && currentStats[18] !== null && currentStats[18] !== -1) {
      inStock = true;
      console.log('Buy box price exists, assuming in stock');
    }
    
    // Method 3: Check if we have any FBA offers
    if (!inStock && lowestFBAPrice !== null) {
      inStock = true;
      console.log('FBA price exists, assuming in stock');
    }
    
    // Method 4: Explicit stock indicator from stats (if available)
    if (currentStats[12] !== undefined) {
      const explicitStock = currentStats[12] === 1;
      console.log('Explicit stock indicator:', explicitStock);
      inStock = explicitStock;
    }
    
    console.log('Final stock status:', inStock);
    
    // AMAZON PRICE DETECTION - Fix the logic to properly identify Amazon as seller
    console.log('=== AMAZON PRICE DETECTION DEBUG ===');
    console.log('Buy box seller ID:', product.buyBoxSellerId);
    console.log('Buy box is Amazon:', product.buyBoxIsAmazon);
    console.log('Live offers order:', product.liveOffersOrder?.slice(0, 3)); // Show first 3 offers
    
    let amazonPrice = null;
    
    // Method 1: Check if Amazon is the buy box winner
    if (product.buyBoxSellerId === 'ATVPDKIKX0DER' || product.buyBoxIsAmazon === true) {
      amazonPrice = currentStats[18] !== undefined && currentStats[18] !== -1 ? currentStats[18] / 100 : null;
      console.log('Amazon is buy box winner, price:', amazonPrice);
    }
    
    // Method 2: Check live offers for Amazon seller ID
    if (!amazonPrice && product.liveOffersOrder && Array.isArray(product.liveOffersOrder)) {
      for (const offer of product.liveOffersOrder) {
        if (offer && offer.sellerId === 'ATVPDKIKX0DER') {
          amazonPrice = offer.price ? offer.price / 100 : null;
          console.log('Found Amazon offer in live offers, price:', amazonPrice);
          break;
        }
      }
    }
    
    // Method 3: Check if Amazon price is available in stats (this would be Amazon direct, not FBA)
    // Only use this if we haven't found Amazon in buy box or live offers
    if (!amazonPrice) {
      // Check if there's a specific Amazon price field that's different from FBA prices
      // This is tricky without clear documentation, so we'll be conservative
      console.log('No Amazon seller found in buy box or live offers');
    }
    
    console.log('Final Amazon price decision:', amazonPrice);
    console.log('=== END AMAZON PRICE DETECTION DEBUG ===');
    
    // Log the final extracted data for debugging
    console.log('Extracted data summary:', {
      salesRank,
      offerCount,
      inStock,
      buyBoxPrice: currentStats[18],
      lowestFBAPrice,
      amazonPrice,
      liveOffersCount: product.liveOffersOrder?.length || 0
    });
    
    // Helper function to safely process price history
    const processPriceHistory = (csvData) => {
      if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        return [];
      }
      
      try {
        // Keepa timestamps are in minutes since 2011-01-01
        const keepaEpoch = new Date('2011-01-01T00:00:00.000Z').getTime();
        
        // Process only the first few data points to avoid overwhelming the response
        const historyPoints = [];
        const maxPoints = 5;
        
        for (let i = 0; i < Math.min(csvData.length, maxPoints); i++) {
          const timestampMinutes = csvData[i];
          
          // Skip invalid timestamps
          if (typeof timestampMinutes !== 'number' || timestampMinutes < 0) {
            continue;
          }
          
          const timestamp = new Date(keepaEpoch + (timestampMinutes * 60 * 1000));
          
          // Validate the resulting date
          if (isNaN(timestamp.getTime())) {
            continue;
          }
          
          historyPoints.push({
            timestamp: timestamp.toISOString(),
            buyBoxPrice: null,
            amazonPrice: null,
            newPrice: null,
            salesRank: null,
            offerCount: null,
          });
        }
        
        return historyPoints;
      } catch (error) {
        console.error('Error processing price history:', error);
        return [];
      }
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        asin: product.asin,
        title: product.title || 'Product title not available',
        manufacturer: product.manufacturer || null,
        category: product.categoryTree?.[product.categoryTree.length - 1]?.name || 'Unknown',
        imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null,
        
        buyBoxPrice: currentStats[18] !== undefined && currentStats[18] !== -1 ? currentStats[18] / 100 : null,
        lowestFBAPrice: lowestFBAPrice,
        lowestFBMPrice: currentStats[7] !== undefined && currentStats[7] !== -1 ? currentStats[7] / 100 : null,
        amazonPrice: amazonPrice,
        
        fees: {
          pickAndPackFee: product.fbaFees?.pickAndPackFee ? product.fbaFees.pickAndPackFee / 100 : null,
          referralFee: product.referralFeePercent ? (currentStats[18] || 0) * (product.referralFeePercent / 10000) : null,
          storageFee: product.fbaFees?.storageFee ? product.fbaFees.storageFee / 100 : null,
          variableClosingFee: product.variableClosingFee ? product.variableClosingFee / 100 : null,
        },
        
        offerCount,
        estimatedMonthlySales: product.monthlySold || null,
        inStock,
        salesRank: salesRank,
        
        priceHistory: processPriceHistory(product.csv),
        
        tokensUsed: data.tokensUsed || 0,
        tokensLeft: data.tokensLeft || 0,
        processingTime: data.processingTime || 0,
        lastUpdate: new Date().toISOString(),
        upcConversion: inputIsUPC ? {
          originalUpc: trimmedInput,
          convertedAsin: product.asin
        } : null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing request:', error);
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
