import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const KEEPA_API_KEY = Deno.env.get('KEEPA_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!KEEPA_API_KEY) {
      throw new Error('KEEPA_API_KEY not configured')
    }

    const { asin } = await req.json()
    
    if (!asin) {
      throw new Error('ASIN is required')
    }

    console.log(`Fetching Keepa data for ASIN: ${asin}`)

    // Fetch product data from Keepa API
    const keepaUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asin}&stats=1&offers=20&buybox=1`
    console.log('Keepa API URL (without key):', keepaUrl.replace(KEEPA_API_KEY, '[HIDDEN]'))
    
    const keepaResponse = await fetch(keepaUrl)
    
    if (!keepaResponse.ok) {
      throw new Error(`Keepa API error: ${keepaResponse.status} ${keepaResponse.statusText}`)
    }

    const keepaData = await keepaResponse.json()
    console.log('Raw Keepa response received, processing...')

    if (!keepaData.products || keepaData.products.length === 0) {
      throw new Error('No product found in Keepa response')
    }

    const product = keepaData.products[0]
    console.log('Processing product:', product.title)

    // Extract basic product info
    const title = product.title || 'Product title not available'
    const manufacturer = product.manufacturer || null
    const category = product.categoryTree?.[0]?.name || 'Unknown'
    const imageUrl = product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}.jpg` : null

    // Extract current prices
    const current = product.csv?.[0] || []  // Current Buy Box price
    const currentAmazon = product.csv?.[1] || []  // Current Amazon price
    const currentNew = product.csv?.[2] || []  // Current New (3rd party) price
    
    const buyBoxPrice = current.length > 0 && current[current.length - 1] !== -1 ? current[current.length - 1] / 100 : null
    const amazonPrice = currentAmazon.length > 0 && currentAmazon[currentAmazon.length - 1] !== -1 ? currentAmazon[currentAmazon.length - 1] / 100 : null

    // Extract current offers data
    let lowestFBAPrice = null
    let lowestFBMPrice = null
    let offerCount = 0

    if (product.offers && product.offers.length > 0) {
      const fbaOffers = product.offers.filter(offer => offer.isFBA)
      const fbmOffers = product.offers.filter(offer => !offer.isFBA)
      
      // Filter out Amazon from FBA offers for "Lowest FBA" calculation
      const thirdPartyFBAOffers = fbaOffers.filter(offer => offer.sellerId !== 'ATVPDKIKX0DER')
      
      // Set lowest FBA price - only from third-party sellers
      if (thirdPartyFBAOffers.length > 0) {
        const sortedFBA = thirdPartyFBAOffers.sort((a, b) => a.price - b.price)
        lowestFBAPrice = sortedFBA[0].price / 100
      }
      // If only Amazon is selling FBA, lowestFBAPrice remains null (will show as "None")
      
      // Set lowest FBM price
      if (fbmOffers.length > 0) {
        const sortedFBM = fbmOffers.sort((a, b) => a.price - b.price)
        lowestFBMPrice = sortedFBM[0].price / 100
      }
      
      offerCount = product.offers.length
      
      console.log('Offer analysis:', {
        totalOffers: product.offers.length,
        fbaOffers: fbaOffers.length,
        thirdPartyFBAOffers: thirdPartyFBAOffers.length,
        fbmOffers: fbmOffers.length,
        amazonInFBA: fbaOffers.some(offer => offer.sellerId === 'ATVPDKIKX0DER'),
        lowestFBAPrice,
        lowestFBMPrice
      })
    }

    // Extract sales rank and stock status
    const salesRank = product.stats?.current?.[3] || null
    const inStock = product.stats?.current?.[0] === 1

    // Extract estimated monthly sales
    const estimatedMonthlySales = product.monthlySold || null

    // Enhanced fee extraction with multiple approaches
    let fees = null
    
    // Method 1: Direct fee data from product
    if (product.fbaFees) {
      console.log('Found direct FBA fees in product data')
      fees = {
        pickAndPackFee: product.fbaFees.pickPackFee ? product.fbaFees.pickPackFee / 100 : null,
        referralFee: product.fbaFees.referralFee ? product.fbaFees.referralFee / 100 : null,
        storageFee: product.fbaFees.storageFee ? product.fbaFees.storageFee / 100 : null,
        variableClosingFee: product.fbaFees.variableClosingFee ? product.fbaFees.variableClosingFee / 100 : null
      }
    }
    
    // Method 2: Check stats object for fee data
    if (!fees && product.stats && product.stats.current) {
      console.log('Checking stats for fee data')
      const stats = product.stats.current
      if (stats.length >= 15) {
        fees = {
          pickAndPackFee: stats[10] !== -1 ? stats[10] / 100 : null,
          referralFee: stats[11] !== -1 ? stats[11] / 100 : null,
          storageFee: stats[12] !== -1 ? stats[12] / 100 : null,
          variableClosingFee: stats[13] !== -1 ? stats[13] / 100 : null
        }
      }
    }

    // Method 3: Enhanced fallback fee estimation using accurate Amazon fee structure
    if (!fees || (fees.pickAndPackFee === null && fees.referralFee === null)) {
      console.log('Using enhanced fallback fee calculation')
      const salePrice = buyBoxPrice || amazonPrice || 10 // Use a reasonable default
      
      // Referral fee calculation (8% for Health & Household, 15% for most other categories)
      let referralFeeRate = 0.15 // Default 15%
      if (category && (category.toLowerCase().includes('health') || category.toLowerCase().includes('household'))) {
        referralFeeRate = 0.08 // Health & Household is 8%
      }
      
      // FBA fulfillment fee estimation based on size/weight tiers
      let fbaFulfillmentFee = 3.22 // Standard size, ≤ 1 lb
      if (salePrice > 20) {
        fbaFulfillmentFee = 4.75 // Likely larger/heavier
      }
      if (salePrice > 50) {
        fbaFulfillmentFee = 6.25 // Likely oversize tier 1
      }
      
      // Storage fee (estimated monthly)
      const storageFeeRate = 0.87 // per cubic foot per month (standard size)
      const estimatedStorageFee = 0.25 // Conservative estimate for small items
      
      // Variable closing fee (only for media items)
      const variableClosingFee = (category && category.toLowerCase().includes('media')) ? 1.80 : 0

      fees = {
        pickAndPackFee: fbaFulfillmentFee,
        referralFee: salePrice * referralFeeRate,
        storageFee: estimatedStorageFee,
        variableClosingFee: variableClosingFee
      }
      
      console.log('Applied fallback fees:', {
        salePrice,
        referralFeeRate,
        fbaFulfillmentFee,
        calculatedReferralFee: fees.referralFee,
        category
      })
    }

    // Extract price history for charts
    const priceHistory = []
    if (product.csv && product.csv.length > 0) {
      const timestamps = product.csv[0] // Buy box timestamps
      const buyBoxPrices = product.csv[0] // Buy box prices  
      const amazonPrices = product.csv[1] // Amazon prices
      const newPrices = product.csv[2] // New (3rd party) prices
      const salesRanks = product.csv[3] // Sales rank history
      
      // Keepa uses minutes since January 1, 2011 00:00 UTC as timestamp
      const keepaEpoch = new Date('2011-01-01T00:00:00.000Z').getTime()
      
      if (timestamps && timestamps.length > 1) {
        for (let i = 1; i < timestamps.length; i += 2) {
          const timestamp = timestamps[i]
          const price = timestamps[i + 1]
          
          if (timestamp !== undefined && timestamp !== -1) {
            const dateMs = keepaEpoch + (timestamp * 60000) // Convert to milliseconds
            
            priceHistory.push({
              timestamp: new Date(dateMs).toISOString(),
              buyBoxPrice: price !== -1 ? price / 100 : null,
              amazonPrice: amazonPrices && amazonPrices[i + 1] !== -1 ? amazonPrices[i + 1] / 100 : null,
              newPrice: newPrices && newPrices[i + 1] !== -1 ? newPrices[i + 1] / 100 : null,
              salesRank: salesRanks && salesRanks[i + 1] !== -1 ? salesRanks[i + 1] : null,
              offerCount: offerCount
            })
          }
        }
      }
    }

    console.log(`Processed ${priceHistory.length} price history points`)

    const processedData = {
      asin,
      title,
      manufacturer,
      category,
      imageUrl,
      buyBoxPrice,
      amazonPrice,
      lowestFBAPrice,
      lowestFBMPrice,
      offerCount,
      estimatedMonthlySales,
      inStock,
      salesRank,
      lastUpdate: new Date().toISOString(),
      fees,
      priceHistory
    }

    console.log('Final processed data summary:', {
      title: processedData.title,
      buyBoxPrice: processedData.buyBoxPrice,
      amazonPrice: processedData.amazonPrice,
      lowestFBAPrice: processedData.lowestFBAPrice,
      lowestFBMPrice: processedData.lowestFBMPrice,
      offerCount: processedData.offerCount,
      estimatedMonthlySales: processedData.estimatedMonthlySales,
      fees: processedData.fees,
      priceHistoryPoints: processedData.priceHistory.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: processedData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Keepa API Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
