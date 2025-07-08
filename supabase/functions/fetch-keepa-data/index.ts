import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { asin } = await req.json()
    
    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching Keepa data for:', asin)

    // Keepa API configuration
    const keepaApiKey = Deno.env.get('KEEPA_API_KEY')
    if (!keepaApiKey) {
      throw new Error('Keepa API key not configured')
    }

    // Detect if input is UPC (12 digits) or ASIN (10 alphanumeric)
    const isUpc = /^\d{12}$/.test(asin.trim())
    const isAsin = /^[A-Z0-9]{10}$/i.test(asin.trim())

    if (!isUpc && !isAsin) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid input format. Please enter a valid ASIN (10 characters) or UPC (12 digits).' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let keepaUrl: string
    let requestParams: any

    if (isUpc) {
      console.log('Input detected as UPC, using product finder endpoint')
      keepaUrl = `https://api.keepa.com/product/finder/?key=${keepaApiKey}`
      requestParams = {
        domain: 1, // Amazon.com
        type: 'product',
        findertypes: [0], // Product finder
        selection: [
          {
            key: 'upc',
            value: asin.trim()
          }
        ],
        perpage: 50,
        page: 0,
        format: 1
      }
    } else {
      console.log('Input detected as ASIN, using standard product endpoint')
      keepaUrl = `https://api.keepa.com/product/?key=${keepaApiKey}&domain=1&asin=${asin.trim()}&stats=1&history=1&offers=20`
    }

    let keepaResponse: any

    if (isUpc) {
      // POST request for UPC search
      const response = await fetch(keepaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams)
      })

      if (!response.ok) {
        throw new Error(`Keepa API request failed: ${response.status} ${response.statusText}`)
      }

      keepaResponse = await response.json()
      console.log('Keepa UPC search response:', JSON.stringify(keepaResponse, null, 2))

      // Handle UPC search results
      if (!keepaResponse.asinList || keepaResponse.asinList.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `No Amazon product found for UPC ${asin}. This UPC may not exist on Amazon or may be discontinued.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If multiple products found, return them for user selection
      if (keepaResponse.asinList.length > 1) {
        console.log(`Found ${keepaResponse.asinList.length} products for UPC ${asin}`)
        
        const products = keepaResponse.asinList.slice(0, 10).map((asinData: any) => ({
          asin: asinData.asin,
          title: asinData.title || 'Title not available',
          monthlySales: asinData.monthlySold || 0,
          salesRank: asinData.salesRanks?.[0]?.rank || null,
          imageUrl: asinData.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${asinData.imagesCSV.split(',')[0]}` : null,
          price: asinData.csv?.[0] !== -1 ? asinData.csv[0] / 100 : null
        }))

        return new Response(
          JSON.stringify({
            success: true,
            multipleProducts: true,
            upc: asin,
            products: products,
            totalFound: keepaResponse.asinList.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Single product found - get detailed data
      const foundAsin = keepaResponse.asinList[0].asin
      console.log(`Single product found for UPC ${asin}: ${foundAsin}`)
      
      // Now fetch detailed data for this ASIN
      const detailUrl = `https://api.keepa.com/product/?key=${keepaApiKey}&domain=1&asin=${foundAsin}&stats=1&history=1&offers=20`
      const detailResponse = await fetch(detailUrl)
      
      if (!detailResponse.ok) {
        throw new Error(`Keepa detail API request failed: ${detailResponse.status} ${detailResponse.statusText}`)
      }
      
      keepaResponse = await detailResponse.json()
      
      // Add UPC conversion info
      keepaResponse.upcConversion = {
        originalUpc: asin,
        convertedAsin: foundAsin
      }
    } else {
      // GET request for ASIN search
      const response = await fetch(keepaUrl)
      
      if (!response.ok) {
        throw new Error(`Keepa API request failed: ${response.status} ${response.statusText}`)
      }
      
      keepaResponse = await response.json()
    }

    console.log('Keepa API response received')

    if (keepaResponse.products && keepaResponse.products.length > 0) {
      const product = keepaResponse.products[0]
      console.log('Processing Keepa product data for:', product.asin)

      // Helper function to convert Keepa price (cents) to dollars
      const convertPrice = (keepaPrice: number | null | undefined): number | null => {
        if (keepaPrice === null || keepaPrice === undefined || keepaPrice === -1) {
          return null
        }
        return keepaPrice / 100
      }

      // Extract current prices from CSV data
      const currentPrices = product.csv || []
      const buyBoxPrice = convertPrice(currentPrices[0])
      const amazonPrice = convertPrice(currentPrices[1])
      const newPrice = convertPrice(currentPrices[2])
      const usedPrice = convertPrice(currentPrices[3])

      // Extract offer data
      const offers = product.offers || []
      let lowestFBAPrice: number | null = null
      let lowestFBMPrice: number | null = null

      offers.forEach((offer: any) => {
        const price = convertPrice(offer.price)
        if (price !== null) {
          if (offer.isFBA) {
            if (lowestFBAPrice === null || price < lowestFBAPrice) {
              lowestFBAPrice = price
            }
          } else {
            if (lowestFBMPrice === null || price < lowestFBMPrice) {
              lowestFBMPrice = price
            }
          }
        }
      })

      // Process price history
      const priceHistory: Array<{
        timestamp: string;
        buyBoxPrice?: number | null;
        amazonPrice?: number | null;
        newPrice?: number | null;
        salesRank?: number | null;
        offerCount?: number;
      }> = []

      if (product.history) {
        const historyLength = product.history[0]?.length || 0
        const timeInterval = 5 // Keepa uses 5-minute intervals
        
        for (let i = 0; i < Math.min(historyLength, 100); i++) {
          const timestamp = new Date(Date.now() - (historyLength - i - 1) * timeInterval * 60000).toISOString()
          
          priceHistory.push({
            timestamp,
            buyBoxPrice: product.history[0] ? convertPrice(product.history[0][i]) : null,
            amazonPrice: product.history[1] ? convertPrice(product.history[1][i]) : null,
            newPrice: product.history[2] ? convertPrice(product.history[2][i]) : null,
            salesRank: product.history[3] ? (product.history[3][i] === -1 ? null : product.history[3][i]) : null,
            offerCount: product.history[4] ? (product.history[4][i] === -1 ? null : product.history[4][i]) : null
          })
        }
      }

      // Extract review data
      const reviewRating = product.stats?.reviewRating || null
      const reviewCount = product.stats?.reviewCount || null

      console.log('Review data:', { reviewRating, reviewCount })

      const responseData = {
        success: true,
        data: {
          asin: product.asin,
          title: product.title || 'Product title not available',
          manufacturer: product.manufacturer || null,
          brand: product.brand || null,
          category: product.categoryTree?.[0]?.name || 'Unknown',
          imageUrl: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}` : null,
          
          // Current pricing
          buyBoxPrice,
          amazonPrice,
          lowestFBAPrice,
          lowestFBMPrice,
          
          // Sales and inventory data
          offerCount: product.offerCountCurrent || 0,
          estimatedMonthlySales: product.monthlySold || null,
          inStock: buyBoxPrice !== null || amazonPrice !== null,
          
          // Sales rank
          salesRank: product.salesRanks?.[0]?.rank || null,
          
          // Review data
          reviewRating: reviewRating,
          reviewCount: reviewCount,
          
          // Historical data
          priceHistory,
          
          // UPC conversion info (if applicable)
          upcConversion: keepaResponse.upcConversion || null,
          
          // Metadata
          lastUpdate: new Date().toISOString(),
          
          // Fee estimation (basic calculation)
          fees: {
            pickAndPackFee: buyBoxPrice ? Math.min(buyBoxPrice * 0.15, 8.40) : null,
            referralFee: buyBoxPrice ? buyBoxPrice * 0.15 : null,
            storageFee: 0.75, // Estimated monthly storage fee
            variableClosingFee: 1.80 // Standard variable closing fee
          }
        }
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      console.log('No products found in Keepa response')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Product with ${isUpc ? 'UPC' : 'ASIN'} ${asin} not found in Keepa database` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Keepa API Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to fetch data from Keepa API' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
