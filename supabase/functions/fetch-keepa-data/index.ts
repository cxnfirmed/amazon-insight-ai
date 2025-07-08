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
    const { asin, isUpc } = await req.json();
    
    if (!asin) {
      throw new Error('ASIN or UPC is required');
    }

    const keepaApiKey = Deno.env.get('KEEPA_API_KEY');
    if (!keepaApiKey) {
      throw new Error('KEEPA_API_KEY not configured');
    }

    console.log(`Processing request for: ${asin}, isUpc: ${isUpc}`);

    // If it's a UPC search, use productFinder to get all matching products
    if (isUpc) {
      console.log(`UPC search detected: ${asin}`);
      
      // Use productFinder to find all products with this UPC
      const finderUrl = `https://api.keepa.com/productFinder/?key=${keepaApiKey}&domain=1&type=product&selection={"upc":"${asin}"}`;
      console.log('Calling productFinder with URL:', finderUrl);
      
      const finderResponse = await fetch(finderUrl);
      const finderData = await finderResponse.json();
      
      console.log('ProductFinder response:', JSON.stringify(finderData, null, 2));
      
      if (!finderResponse.ok || !finderData.asinList || finderData.asinList.length === 0) {
        throw new Error(`UPC ${asin} not found in Keepa database. This UPC may not exist or may not be available on Amazon.`);
      }

      // If multiple products found, return them all for user selection
      if (finderData.asinList.length > 1) {
        console.log(`Multiple products found for UPC ${asin}:`, finderData.asinList);
        
        // Get basic product info for each ASIN to help user choose
        const productChoices = [];
        
        for (const foundAsin of finderData.asinList.slice(0, 10)) { // Limit to 10 results
          try {
            const productUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&asin=${foundAsin}&stats=1&history=1`;
            const productResponse = await fetch(productUrl);
            const productData = await productResponse.json();
            
            if (productData.products && productData.products.length > 0) {
              const product = productData.products[0];
              productChoices.push({
                asin: foundAsin,
                title: product.title || 'Unknown Product',
                monthlySales: product.monthlySold || 0,
                salesRank: product.salesRanks?.[0]?.[1] || null,
                imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null,
                price: product.stats?.current?.[0]?.[1] || null
              });
            }
          } catch (error) {
            console.log(`Error fetching details for ASIN ${foundAsin}:`, error);
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          multipleProducts: true,
          upc: asin,
          products: productChoices,
          totalFound: finderData.asinList.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Single product found, continue with normal flow
      const selectedAsin = finderData.asinList[0];
      console.log(`Single product found for UPC ${asin}: ${selectedAsin}`);
      
      // Continue with normal product fetch for the single ASIN
      const productUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&asin=${selectedAsin}&stats=1&history=1`;
      const productResponse = await fetch(productUrl);
      const productData = await productResponse.json();
      
      if (!productResponse.ok || !productData.products || productData.products.length === 0) {
        throw new Error(`Product data not found for ASIN ${selectedAsin}`);
      }

      const product = productData.products[0];
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          asin: selectedAsin,
          title: product.title || 'Product title not available',
          manufacturer: product.manufacturer || null,
          category: product.categoryTree?.[product.categoryTree.length - 1]?.name || 'Unknown',
          imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg.jpg` : null,
          
          buyBoxPrice: product.stats?.current?.[18]?.[1] ? product.stats.current[18][1] / 100 : null,
          lowestFBAPrice: product.stats?.current?.[0]?.[1] ? product.stats.current[0][1] / 100 : null,
          lowestFBMPrice: product.stats?.current?.[7]?.[1] ? product.stats.current[7][1] / 100 : null,
          amazonPrice: product.stats?.current?.[1]?.[1] ? product.stats.current[1][1] / 100 : null,
          
          fees: {
            pickAndPackFee: product.fbaFees?.pickAndPackFee ? product.fbaFees.pickAndPackFee / 100 : null,
            referralFee: product.referralFeePercent ? (product.stats?.current?.[18]?.[1] || 0) * (product.referralFeePercent / 10000) : null,
            storageFee: product.fbaFees?.storageFee ? product.fbaFees.storageFee / 100 : null,
            variableClosingFee: product.variableClosingFee ? product.variableClosingFee / 100 : null,
          },
          
          offerCount: product.stats?.current?.[2]?.[1] || 0,
          estimatedMonthlySales: product.monthlySold || null,
          inStock: product.stats?.current?.[12]?.[1] === 1,
          salesRank: product.salesRanks?.[0]?.[1] || null,
          
          priceHistory: product.csv ? [{
            timestamp: new Date(product.csv[0] * 60000 + new Date('2011-01-01').getTime()).toISOString(),
            buyBoxPrice: product.csv[18] !== -1 ? product.csv[18] / 100 : null,
            amazonPrice: product.csv[1] !== -1 ? product.csv[1] / 100 : null,
            newPrice: product.csv[0] !== -1 ? product.csv[0] / 100 : null,
            salesRank: product.csv[3] !== -1 ? product.csv[3] : null,
            offerCount: product.csv[2] !== -1 ? product.csv[2] : null,
          }] : [],
          
          tokensUsed: productData.tokensUsed || 0,
          tokensLeft: productData.tokensLeft || 0,
          processingTime: productData.processingTime || 0,
          lastUpdate: new Date().toISOString(),
          
          upcConversion: {
            originalUpc: asin,
            convertedAsin: selectedAsin,
            tokensUsed: finderData.tokensUsed || 0,
            totalProductsFound: 1,
            selectedProduct: {
              asin: selectedAsin,
              title: product.title || 'Unknown Product',
              monthlySales: product.monthlySold || 0
            }
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Regular ASIN search
    console.log(`Regular ASIN search: ${asin}`);
    const productUrl = `https://api.keepa.com/product?key=${keepaApiKey}&domain=1&asin=${asin}&stats=1&history=1`;
    
    const response = await fetch(productUrl);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Keepa API error: ${response.status} ${response.statusText}`);
    }
    
    if (!data.products || data.products.length === 0) {
      throw new Error(`ASIN ${asin} not found in Keepa database`);
    }

    const product = data.products[0];
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        asin: asin,
        title: product.title || 'Product title not available',
        manufacturer: product.manufacturer || null,
        category: product.categoryTree?.[product.categoryTree.length - 1]?.name || 'Unknown',
        imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg.jpg` : null,
        
        buyBoxPrice: product.stats?.current?.[18]?.[1] ? product.stats.current[18][1] / 100 : null,
        lowestFBAPrice: product.stats?.current?.[0]?.[1] ? product.stats.current[0][1] / 100 : null,
        lowestFBMPrice: product.stats?.current?.[7]?.[1] ? product.stats.current[7][1] / 100 : null,
        amazonPrice: product.stats?.current?.[1]?.[1] ? product.stats.current[1][1] / 100 : null,
        
        fees: {
          pickAndPackFee: product.fbaFees?.pickAndPackFee ? product.fbaFees.pickAndPackFee / 100 : null,
          referralFee: product.referralFeePercent ? (product.stats?.current?.[18]?.[1] || 0) * (product.referralFeePercent / 10000) : null,
          storageFee: product.fbaFees?.storageFee ? product.fbaFees.storageFee / 100 : null,
          variableClosingFee: product.variableClosingFee ? product.variableClosingFee / 100 : null,
        },
        
        offerCount: product.stats?.current?.[2]?.[1] || 0,
        estimatedMonthlySales: product.monthlySold || null,
        inStock: product.stats?.current?.[12]?.[1] === 1,
        salesRank: product.salesRanks?.[0]?.[1] || null,
        
        priceHistory: product.csv ? [{
          timestamp: new Date(product.csv[0] * 60000 + new Date('2011-01-01').getTime()).toISOString(),
          buyBoxPrice: product.csv[18] !== -1 ? product.csv[18] / 100 : null,
          amazonPrice: product.csv[1] !== -1 ? product.csv[1] / 100 : null,
          newPrice: product.csv[0] !== -1 ? product.csv[0] / 100 : null,
          salesRank: product.csv[3] !== -1 ? product.csv[3] : null,
          offerCount: product.csv[2] !== -1 ? product.csv[2] : null,
        }] : [],
        
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
