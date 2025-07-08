import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { asin, isUpc } = requestBody;
    
    if (!asin) {
      throw new Error('ASIN or UPC is required');
    }

    const keepaApiKey = Deno.env.get('KEEPA_API_KEY');
    if (!keepaApiKey) {
      throw new Error('KEEPA_API_KEY not configured');
    }

    console.log(`Processing request for: ${asin}, isUpc: ${isUpc}`);
    console.log(`Using API key: ${keepaApiKey.substring(0, 10)}...`);

    // If it's a UPC search, use product endpoint with code parameter
    if (isUpc) {
      console.log(`UPC search detected: ${asin}`);
      
      // Use the product endpoint with code parameter for UPC lookup
      const upcUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&code=${asin}&history=1&stats=1&offers=20`;
      
      console.log('Calling Keepa API for UPC with URL:', upcUrl);
      
      const upcResponse = await fetch(upcUrl);
      
      if (!upcResponse.ok) {
        console.error('UPC API error:', upcResponse.status, upcResponse.statusText);
        throw new Error(`UPC ${asin} not found in Keepa database. This UPC may not exist or may not be available on Amazon.`);
      }
      
      const upcResponseText = await upcResponse.text();
      console.log('UPC API raw response:', upcResponseText);
      
      let upcData;
      try {
        upcData = JSON.parse(upcResponseText);
      } catch (jsonError) {
        console.error('Failed to parse UPC response as JSON:', jsonError);
        throw new Error(`UPC ${asin} search failed - invalid response format`);
      }
      
      console.log('UPC API parsed response:', JSON.stringify(upcData, null, 2));
      
      if (!upcData.products || upcData.products.length === 0) {
        throw new Error(`UPC ${asin} not found in Keepa database. This UPC may not exist or may not be available on Amazon.`);
      }

      // If only one product found, return it directly
      if (upcData.products.length === 1) {
        const product = upcData.products[0];
        
        // Extract current prices from the stats object
        const currentStats = product.stats?.current || {};
        console.log('Product current stats:', currentStats);
        
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
            
            offerCount: currentStats[2] || 0,
            estimatedMonthlySales: product.monthlySold || null,
            inStock: currentStats[12] === 1,
            salesRank: product.salesRanks?.[0]?.current || null,
            
            priceHistory: [],
            
            tokensUsed: upcData.tokensUsed || 0,
            tokensLeft: upcData.tokensLeft || 0,
            processingTime: upcData.processingTime || 0,
            lastUpdate: new Date().toISOString(),
            upcConversion: {
              originalUpc: asin,
              convertedAsin: product.asin
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Multiple products found - return selection list
      const productChoices = upcData.products.slice(0, 10).map(product => ({
        asin: product.asin,
        title: product.title || 'Unknown Product',
        monthlySales: product.monthlySold || 0,
        salesRank: product.salesRanks?.[0]?.current || null,
        imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null,
        price: product.stats?.current?.[0] !== undefined && product.stats.current[0] !== -1 ? product.stats.current[0] / 100 : null
      }));
      
      return new Response(JSON.stringify({
        success: true,
        multipleProducts: true,
        upc: asin,
        products: productChoices,
        totalFound: upcData.products.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Regular ASIN search with enhanced parameters
    console.log(`Regular ASIN search: ${asin}`);
    const productUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&asin=${asin}&stats=1&history=1&offers=20`;
    
    console.log('Calling Keepa API with URL:', productUrl);
    
    const response = await fetch(productUrl);
    
    if (!response.ok) {
      console.error('Product API error:', response.status, response.statusText);
      throw new Error(`Keepa API error: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log('Product API raw response length:', responseText.length);
    console.log('Product API response preview:', responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse product response as JSON:', jsonError);
      console.error('Response text preview:', responseText.substring(0, 200));
      throw new Error(`Invalid JSON response from Keepa product API: ${jsonError.message}`);
    }
    
    console.log('Parsed API response structure:', {
      hasProducts: !!data.products,
      productsLength: data.products?.length,
      tokensUsed: data.tokensUsed,
      tokensLeft: data.tokensLeft
    });
    
    if (!data.products || data.products.length === 0) {
      throw new Error(`ASIN ${asin} not found in Keepa database`);
    }

    const product = data.products[0];
    console.log('Raw product data keys:', Object.keys(product));
    console.log('Product stats structure:', product.stats ? Object.keys(product.stats) : 'No stats');
    
    // Extract current prices from the stats object - fix the access pattern
    const currentStats = product.stats?.current || {};
    console.log('Current stats raw:', currentStats);
    
    // Keepa stores current prices as direct values, not nested arrays
    const buyBoxPrice = currentStats[18] !== undefined && currentStats[18] !== -1 ? currentStats[18] / 100 : null;
    const lowestFBAPrice = currentStats[0] !== undefined && currentStats[0] !== -1 ? currentStats[0] / 100 : null;
    const lowestFBMPrice = currentStats[7] !== undefined && currentStats[7] !== -1 ? currentStats[7] / 100 : null;
    const amazonPrice = currentStats[1] !== undefined && currentStats[1] !== -1 ? currentStats[1] / 100 : null;
    const offerCount = currentStats[2] || 0;
    const inStock = currentStats[12] === 1;
    
    console.log('Extracted pricing data:', {
      buyBoxPrice,
      lowestFBAPrice,
      lowestFBMPrice,
      amazonPrice,
      offerCount,
      inStock
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
        asin: asin,
        title: product.title || 'Product title not available',
        manufacturer: product.manufacturer || null,
        category: product.categoryTree?.[product.categoryTree.length - 1]?.name || 'Unknown',
        imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null,
        
        buyBoxPrice,
        lowestFBAPrice,
        lowestFBMPrice,
        amazonPrice,
        
        fees: {
          pickAndPackFee: product.fbaFees?.pickAndPackFee ? product.fbaFees.pickAndPackFee / 100 : null,
          referralFee: product.referralFeePercent ? (buyBoxPrice || 0) * (product.referralFeePercent / 10000) : null,
          storageFee: product.fbaFees?.storageFee ? product.fbaFees.storageFee / 100 : null,
          variableClosingFee: product.variableClosingFee ? product.variableClosingFee / 100 : null,
        },
        
        offerCount,
        estimatedMonthlySales: product.monthlySold || null,
        inStock,
        salesRank: product.salesRanks?.[0]?.current || null,
        
        priceHistory: processPriceHistory(product.csv),
        
        tokensUsed: data.tokensUsed || 0,
        tokensLeft: data.tokensLeft || 0,
        processingTime: data.processingTime || 0,
        lastUpdate: new Date().toISOString(),
        upcConversion: null
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
