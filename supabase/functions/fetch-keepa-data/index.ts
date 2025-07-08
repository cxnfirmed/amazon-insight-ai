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
    console.log('Product liveOffersOrder:', product.liveOffersOrder ? product.liveOffersOrder.length : 'No live offers order');
    console.log('Product offers object:', product.offers ? Object.keys(product.offers).length : 'No offers object');
    
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

    // UPDATED FBA PRICE CALCULATION - Using stats.current[10] (NEW_FBA) as primary source
    console.log('=== UPDATED FBA PRICE CALCULATION ===');
    let lowestFBAPrice = null;
    
    // Method 1: Check stats.current[10] (NEW_FBA) first
    const newFBAPrice = currentStats[10];
    console.log('NEW_FBA price from stats.current[10]:', newFBAPrice);
    
    if (newFBAPrice !== undefined && newFBAPrice !== null && newFBAPrice !== -1) {
      lowestFBAPrice = newFBAPrice / 100;
      console.log('✅ Using NEW_FBA price from stats.current[10]:', lowestFBAPrice);
    } else {
      console.log('NEW_FBA price not available, falling back to live offers scan...');
      
      // Method 2: Fallback to scanning live offers (existing logic)
      if (product.liveOffersOrder && Array.isArray(product.liveOffersOrder) && product.offers) {
        console.log('Found liveOffersOrder array with', product.liveOffersOrder.length, 'offer IDs');
        console.log('Found offers object with', Object.keys(product.offers).length, 'offers');
        
        const validFBAPrices = [];
        
        // Loop through product.liveOffersOrder
        for (let i = 0; i < product.liveOffersOrder.length; i++) {
          const offerId = product.liveOffersOrder[i];
          const offer = product.offers[offerId];
          
          if (!offer) {
            console.log(`Offer ${offerId} not found in offers object`);
            continue;
          }
          
          console.log(`=== OFFER ${i} (ID: ${offerId}) ANALYSIS ===`);
          console.log('offer.isFBA:', offer.isFBA);
          console.log('offer.offerCSV exists:', !!offer.offerCSV);
          console.log('offer.offerCSV length:', offer.offerCSV?.length);
          console.log('offer.stockQty:', offer.stockQty);
          console.log('offer.availableQty:', offer.availableQty);
          
          // Filter offers where offer.isFBA === true OR offer.isFBA === 1
          const isFBAOffer = offer.isFBA === true || offer.isFBA === 1;
          
          if (isFBAOffer) {
            console.log(`✅ Offer ${i} is FBA`);
            
            // Check stock availability - consider offer valid if:
            // 1. No stock info available (assume available)
            // 2. stockQty > 0
            // 3. availableQty > 0
            const hasStock = !offer.stockQty || offer.stockQty > 0 || 
                            !offer.availableQty || offer.availableQty > 0;
            
            if (hasStock) {
              console.log(`✅ Offer ${i} has stock (stockQty: ${offer.stockQty}, availableQty: ${offer.availableQty})`);
              
              // Filter offers where offer.offerCSV?.length >= 3
              if (offer.offerCSV && Array.isArray(offer.offerCSV) && offer.offerCSV.length >= 3) {
                console.log(`✅ Offer ${i} has sufficient offerCSV data (${offer.offerCSV.length} items)`);
                
                // Get the 3rd-to-last value: offer.offerCSV[offerCSV.length - 3]
                const priceIndex = offer.offerCSV.length - 3;
                const rawPrice = offer.offerCSV[priceIndex];
                
                console.log(`Offer ${i} raw price from offerCSV[${priceIndex}]:`, rawPrice);
                
                // Filter where price is a number between 1 and 1,000,000
                if (typeof rawPrice === 'number' && rawPrice >= 1 && rawPrice <= 1000000) {
                  validFBAPrices.push(rawPrice);
                  console.log(`✅ Offer ${i} has valid price: ${rawPrice} (will be ${rawPrice / 100} USD)`);
                } else {
                  console.log(`❌ Offer ${i} price ${rawPrice} is not a valid number between 1 and 1,000,000`);
                }
              } else {
                console.log(`❌ Offer ${i} offerCSV length insufficient:`, offer.offerCSV?.length);
              }
            } else {
              console.log(`❌ Offer ${i} has no stock (stockQty: ${offer.stockQty}, availableQty: ${offer.availableQty})`);
            }
          } else {
            console.log(`❌ Offer ${i} is not FBA (isFBA: ${offer.isFBA})`);
          }
          console.log('=== END OFFER ANALYSIS ===');
        }
        
        if (validFBAPrices.length > 0) {
          // Use Math.min(...validFBAPrices) / 100 for the final result
          const lowestRawPrice = Math.min(...validFBAPrices);
          lowestFBAPrice = lowestRawPrice / 100;
          console.log('✅ Calculated lowest FBA price from live offers:', lowestFBAPrice);
          console.log('All valid FBA prices found:', validFBAPrices.map(p => p / 100));
        } else {
          console.log('❌ No valid FBA offers found after processing all offers');
          lowestFBAPrice = null;
        }
      } else {
        console.log('❌ Missing required data structures for FBA price calculation');
        console.log('Has liveOffersOrder:', !!product.liveOffersOrder);
        console.log('Has offers object:', !!product.offers);
      }
    }
    
    console.log('Final FBA price decision:', lowestFBAPrice);
    console.log('=== END UPDATED FBA PRICE CALCULATION ===');
    
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
    
    // FIXED STOCK STATUS DETERMINATION
    console.log('=== STOCK STATUS DETERMINATION ===');
    let inStock = false;
    
    // Primary method: Check if there are any live offers
    if (product.liveOffersOrder && Array.isArray(product.liveOffersOrder) && product.liveOffersOrder.length > 0) {
      inStock = true;
      console.log('✅ Product is in stock - found', product.liveOffersOrder.length, 'live offers');
    } else {
      inStock = false;
      console.log('❌ Product is out of stock - no live offers found');
    }
    
    console.log('Final stock status:', inStock);
    console.log('=== END STOCK STATUS DETERMINATION ===');
    
    // AMAZON PRICE DETECTION - Search through offers for Amazon's seller ID
    console.log('=== AMAZON PRICE DETECTION DEBUG ===');
    console.log('Product offers object keys:', product.offers ? Object.keys(product.offers) : 'No offers object');
    
    let amazonPrice = null;
    
    if (product.offers) {
      // Search through all offers to find Amazon's seller ID: ATVPDKIKX0DER
      for (const [offerId, offer] of Object.entries(product.offers)) {
        console.log(`Checking offer ${offerId}:`, {
          sellerId: offer.sellerId,
          hasOfferCSV: !!offer.offerCSV,
          offerCSVLength: offer.offerCSV?.length,
          fullOfferCSV: offer.offerCSV
        });
        
        if (offer.sellerId === 'ATVPDKIKX0DER') {
          console.log('✅ Found Amazon offer (seller ID: ATVPDKIKX0DER)');
          console.log('Amazon offer full offerCSV array:', offer.offerCSV);
          
          // Extract the most recent price from offerCSV - use the last value which should be most current
          if (offer.offerCSV && Array.isArray(offer.offerCSV) && offer.offerCSV.length >= 1) {
            // Try to get the last price value from the array (most recent)
            const lastIndex = offer.offerCSV.length - 1;
            let rawPrice = offer.offerCSV[lastIndex];
            
            console.log(`Amazon offer raw price from offerCSV[${lastIndex}] (last index):`, rawPrice);
            
            // If the last value is not a valid price, try the second-to-last
            if ((!rawPrice || typeof rawPrice !== 'number' || rawPrice <= 0) && offer.offerCSV.length >= 2) {
              rawPrice = offer.offerCSV[lastIndex - 1];
              console.log(`Trying second-to-last value offerCSV[${lastIndex - 1}]:`, rawPrice);
            }
            
            // If still not valid, try index 1 as fallback
            if ((!rawPrice || typeof rawPrice !== 'number' || rawPrice <= 0) && offer.offerCSV.length >= 2) {
              rawPrice = offer.offerCSV[1];
              console.log(`Fallback to offerCSV[1]:`, rawPrice);
            }
            
            if (typeof rawPrice === 'number' && rawPrice > 0) {
              amazonPrice = rawPrice / 100; // Convert from cents to dollars
              console.log('✅ Amazon Direct price found:', amazonPrice);
              break; // Found Amazon's price, exit loop
            } else {
              console.log('❌ Amazon offer price is not valid:', rawPrice);
            }
          } else {
            console.log('❌ Amazon offer does not have valid offerCSV data');
          }
        }
      }
      
      if (!amazonPrice) {
        console.log('❌ Amazon (ATVPDKIKX0DER) not found in offers or has invalid price');
      }
    } else {
      console.log('❌ No offers object available');
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
        brand: product.brand || null,
        category: product.categoryTree?.[0]?.name || 'Unknown Category',
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
