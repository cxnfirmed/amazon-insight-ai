
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SPAPITokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asin, marketplaceId = 'ATVPDKIKX0DER' } = await req.json();
    
    if (!asin) {
      throw new Error('ASIN is required');
    }

    const clientId = Deno.env.get('AMAZON_SP_API_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_SP_API_CLIENT_SECRET');
    const refreshToken = Deno.env.get('AMAZON_SP_API_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Amazon SP-API credentials not configured');
    }

    console.log(`Fetching comprehensive SP-API data for ASIN: ${asin}`);

    // Get access token
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData: SPAPITokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get product details with enhanced parameters
    const catalogUrl = `https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=attributes,dimensions,identifiers,images,productTypes,relationships,salesRanks,summaries,variations`;
    
    const catalogResponse = await fetch(catalogUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let productDetails = null;
    if (catalogResponse.ok) {
      productDetails = await catalogResponse.json();
    }

    // Get competitive pricing with enhanced offer data
    const pricingUrl = `https://sellingpartnerapi-na.amazon.com/products/pricing/v0/items/${asin}/offers?MarketplaceId=${marketplaceId}&ItemCondition=New&CustomerType=Consumer`;
    
    const pricingResponse = await fetch(pricingUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let pricingData = null;
    if (pricingResponse.ok) {
      pricingData = await pricingResponse.json();
    }

    // Get seller eligibility and restrictions
    const eligibilityUrl = `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=summaries,attributes,issues,offers,fulfillmentAvailability,procurement`;
    
    const eligibilityResponse = await fetch(eligibilityUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let eligibilityData = null;
    if (eligibilityResponse.ok) {
      eligibilityData = await eligibilityResponse.json();
    }

    // Get inventory levels and fulfillment data
    const inventoryUrl = `https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&marketplaceIds=${marketplaceId}`;
    
    const inventoryResponse = await fetch(inventoryUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let inventoryData = null;
    if (inventoryResponse.ok) {
      inventoryData = await inventoryResponse.json();
    }

    // Get sales estimates and metrics
    const salesUrl = `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics?marketplaceIds=${marketplaceId}&interval=2023-01-01T00:00:00--2024-01-01T00:00:00&granularity=Month&asin=${asin}`;
    
    const salesResponse = await fetch(salesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let salesData = null;
    if (salesResponse.ok) {
      salesData = await salesResponse.json();
    }

    // Enhanced fees estimate with multiple scenarios
    const feesUrl = `https://sellingpartnerapi-na.amazon.com/products/fees/v0/items/${asin}/feesEstimate`;
    
    const basePrice = pricingData?.payload?.Summary?.LowestPrices?.[0]?.LandedPrice?.Amount || 29.99;
    
    const feesPayload = {
      FeesEstimateRequest: {
        MarketplaceId: marketplaceId,
        IsAmazonFulfilled: true,
        PriceToEstimateFees: {
          ListingPrice: { CurrencyCode: 'USD', Amount: basePrice },
          Shipping: { CurrencyCode: 'USD', Amount: 0 }
        },
        Identifier: asin
      }
    };

    const feesResponse = await fetch(feesUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feesPayload),
    });

    let feesData = null;
    if (feesResponse.ok) {
      feesData = await feesResponse.json();
    }

    // Enhanced data processing
    const processedPricingData = pricingData?.payload ? {
      buyBoxPrice: pricingData.payload.Summary?.BuyBoxPrices?.[0]?.LandedPrice?.Amount,
      lowestFBAPrice: pricingData.payload.Summary?.LowestPrices?.find(p => p.Fulfillment?.Type === 'Amazon')?.LandedPrice?.Amount,
      lowestFBMPrice: pricingData.payload.Summary?.LowestPrices?.find(p => p.Fulfillment?.Type === 'Merchant')?.LandedPrice?.Amount,
      offerCount: pricingData.payload.Summary?.TotalOfferCount || 0,
      buyBoxEligible: pricingData.payload.Summary?.BuyBoxEligible || false,
      offers: pricingData.payload.Offers?.map(offer => ({
        sellerId: offer.SellerId,
        sellerFeedbackRating: offer.SellerFeedbackRating?.FeedbackCount || 0,
        shippingTime: offer.ShippingTime?.MaximumHours || 0,
        fulfillmentChannel: offer.Fulfillment?.Type,
        price: offer.ListingPrice?.Amount,
        isPrime: offer.PrimeInformation?.IsPrime || false
      })) || []
    } : null;

    const processedInventoryData = inventoryData?.payload ? {
      totalQuantity: inventoryData.payload.inventorySummaries?.reduce((sum: number, item: any) => 
        sum + (item.totalQuantity || 0), 0) || 0,
      availableQuantity: inventoryData.payload.inventorySummaries?.reduce((sum: number, item: any) => 
        sum + (item.sellableQuantity || 0), 0) || 0,
      inboundQuantity: inventoryData.payload.inventorySummaries?.reduce((sum: number, item: any) => 
        sum + (item.inboundWorkingQuantity || 0), 0) || 0,
      fulfillmentCenters: inventoryData.payload.inventorySummaries?.length || 0
    } : null;

    const processedSalesData = salesData?.payload ? {
      unitCount: salesData.payload.reduce((sum: number, period: any) => 
        sum + (period.unitCount || 0), 0),
      orderItemCount: salesData.payload.reduce((sum: number, period: any) => 
        sum + (period.orderItemCount || 0), 0),
      estimatedMonthlySales: Math.floor((salesData.payload.reduce((sum: number, period: any) => 
        sum + (period.unitCount || 0), 0)) / 12)
    } : null;

    const processedEligibilityData = eligibilityData?.issues ? {
      canSell: eligibilityData.issues.length === 0,
      restrictions: eligibilityData.issues.map((issue: any) => ({
        code: issue.code,
        message: issue.message,
        severity: issue.severity
      })),
      requiresApproval: eligibilityData.issues.some((issue: any) => 
        issue.code?.includes('APPROVAL') || issue.code?.includes('GATED')),
      categoryGated: eligibilityData.issues.some((issue: any) => 
        issue.code?.includes('CATEGORY'))
    } : {
      canSell: true,
      restrictions: [],
      requiresApproval: false,
      categoryGated: false
    };

    // Process the enhanced data
    const result = {
      success: true,
      data: {
        asin,
        productDetails: {
          title: productDetails?.summaries?.[0]?.itemName || null,
          brand: productDetails?.attributes?.brand?.[0]?.value || null,
          manufacturer: productDetails?.attributes?.manufacturer?.[0]?.value || null,
          model: productDetails?.attributes?.model?.[0]?.value || null,
          categories: productDetails?.productTypes || [],
          dimensions: productDetails?.attributes?.item_dimensions || null,
          weight: productDetails?.attributes?.item_weight || null,
          color: productDetails?.attributes?.color?.[0]?.value || null,
          size: productDetails?.attributes?.size?.[0]?.value || null,
          salesRank: productDetails?.salesRanks?.[0]?.rank || null,
          images: productDetails?.images || [],
          features: productDetails?.attributes?.bullet_point || [],
          description: productDetails?.attributes?.item_description || null
        },
        pricing: processedPricingData,
        inventory: processedInventoryData,
        sales: processedSalesData,
        fees: feesData?.payload || null,
        eligibility: processedEligibilityData,
        
        // Enhanced analytics
        competitionAnalysis: {
          totalOffers: processedPricingData?.offerCount || 0,
          fbaOffers: processedPricingData?.offers?.filter(o => o.fulfillmentChannel === 'Amazon').length || 0,
          fbmOffers: processedPricingData?.offers?.filter(o => o.fulfillmentChannel === 'Merchant').length || 0,
          primeOffers: processedPricingData?.offers?.filter(o => o.isPrime).length || 0,
          averageSellerRating: processedPricingData?.offers?.reduce((sum, o) => sum + o.sellerFeedbackRating, 0) / 
                              Math.max(processedPricingData?.offers?.length || 1, 1) || 0
        },
        
        riskAssessment: {
          categoryGated: processedEligibilityData.categoryGated,
          requiresApproval: processedEligibilityData.requiresApproval,
          restrictionCount: processedEligibilityData.restrictions.length,
          competitionLevel: (processedPricingData?.offerCount || 0) < 5 ? 'Low' : 
                           (processedPricingData?.offerCount || 0) < 15 ? 'Medium' : 'High'
        }
      }
    };

    console.log('Enhanced SP-API data processed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('SP-API error:', error);
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
