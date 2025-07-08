
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
        // Extract sales rank properly
        let salesRank = null;
        if (product.salesRanks && Array.isArray(product.salesRanks)) {
          // Look for the main category (usually categoryId 0 or the first one)
          const mainCategoryRank = product.salesRanks.find(rank => rank && typeof rank.current === 'number' && rank.current > 0);
          if (mainCategoryRank) {
            salesRank = mainCategoryRank.current;
          }
        }
        
        return {
          asin: product.asin,
          title: product.title || 'Unknown Product',
          monthlySales: product.monthlySold || 0,
          salesRank: salesRank,
          imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null,
          price: product.stats?.current?.[0] !== undefined && product.stats.current[0] !== -1 ? product.stats.current[0] / 100 : null
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
    console.log('Product salesRanks structure:', product.salesRanks);
    console.log('Product stats structure:', product.stats ? Object.keys(product.stats) : 'No stats');
    console.log('Product offers structure:', product.liveOffersOrder ? product.liveOffersOrder.length : 'No live offers');
    
    // Extract current prices from the stats object
    const currentStats = product.stats?.current || {};
    console.log('Current stats raw:', currentStats);
    
    // IMPROVED SALES RANK EXTRACTION
    let salesRank = null;
    
    // Method 1: Extract from salesRanks array (most reliable)
    if (product.salesRanks && Array.isArray(product.salesRanks) && product.salesRanks.length > 0) {
      console.log('Checking salesRanks array:', product.salesRanks);
      
      // Look for the main category rank (usually the first valid one)
      for (const rankEntry of product.salesRanks) {
        if (rankEntry && typeof rankEntry.current === 'number' && rankEntry.current > 0) {
          salesRank = rankEntry.current;
          console.log('Found sales rank from salesRanks:', salesRank, 'Category:', rankEntry.categoryId);
          break;
        }
      }
    }
    
    // Method 2: Fallback to stats.current[0] if no salesRanks found
    if (!salesRank && currentStats[0] !== undefined && currentStats[0] !== null && currentStats[0] !== -1) {
      salesRank = currentStats[0];
      console.log('Using sales rank from stats.current[0]:', salesRank);
    }
    
    console.log('Final sales rank:', salesRank);
    
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
    if (!inStock && currentStats[0] !== undefined && currentStats[0] !== null && currentStats[0] !== -1) {
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
    
    // Log the final extracted data for debugging
    console.log('Extracted data summary:', {
      salesRank,
      offerCount,
      inStock,
      buyBoxPrice: currentStats[18],
      lowestFBAPrice: currentStats[0],
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
        lowestFBAPrice: currentStats[0] !== undefined && currentStats[0] !== -1 ? currentStats[0] / 100 : null,
        lowestFBMPrice: currentStats[7] !== undefined && currentStats[7] !== -1 ? currentStats[7] / 100 : null,
        amazonPrice: currentStats[1] !== undefined && currentStats[1] !== -1 ? currentStats[1] / 100 : null,
        
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
