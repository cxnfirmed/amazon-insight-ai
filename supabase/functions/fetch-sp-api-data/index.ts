
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

    console.log(`Fetching real SP-API data for ASIN: ${asin}`);

    // Get real access token
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
      const errorText = await tokenResponse.text();
      console.error('SP-API token error:', errorText);
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData: SPAPITokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 1. Get real product catalog details
    console.log('Fetching catalog data...');
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
      console.log('Catalog data fetched successfully');
    } else {
      console.error('Catalog fetch failed:', catalogResponse.status, await catalogResponse.text());
    }

    // 2. Get real competitive pricing and offers
    console.log('Fetching pricing data...');
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
      console.log('Pricing data fetched successfully');
    } else {
      console.error('Pricing fetch failed:', pricingResponse.status, await pricingResponse.text());
    }

    // 3. Get real FBA fees estimate
    console.log('Fetching fees estimate...');
    const feesUrl = `https://sellingpartnerapi-na.amazon.com/products/fees/v0/items/${asin}/feesEstimate`;
    
    const basePrice = pricingData?.payload?.Summary?.BuyBoxPrices?.[0]?.LandedPrice?.Amount || 25.00;
    
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
      console.log('Fees data fetched successfully');
    } else {
      console.error('Fees fetch failed:', feesResponse.status, await feesResponse.text());
    }

    // 4. Get real seller eligibility
    console.log('Fetching eligibility data...');
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
      console.log('Eligibility data fetched successfully');
    } else {
      console.error('Eligibility fetch failed:', eligibilityResponse.status, await eligibilityResponse.text());
    }

    // Process real pricing data
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

    // Process real eligibility data
    const processedEligibilityData = eligibilityData ? {
      canSell: !eligibilityData.issues || eligibilityData.issues.length === 0,
      restrictions: eligibilityData.issues?.map((issue: any) => ({
        code: issue.code,
        message: issue.message,
        severity: issue.severity
      })) || [],
      requiresApproval: eligibilityData.issues?.some((issue: any) => 
        issue.code?.includes('APPROVAL') || issue.code?.includes('GATED')) || false,
      categoryGated: eligibilityData.issues?.some((issue: any) => 
        issue.code?.includes('CATEGORY')) || false
    } : {
      canSell: true,
      restrictions: [],
      requiresApproval: false,
      categoryGated: false
    };

    // Build real result
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
        fees: feesData?.payload || null,
        eligibility: processedEligibilityData,
        
        // Real competition analysis
        competitionAnalysis: {
          totalOffers: processedPricingData?.offerCount || 0,
          fbaOffers: processedPricingData?.offers?.filter(o => o.fulfillmentChannel === 'Amazon').length || 0,
          fbmOffers: processedPricingData?.offers?.filter(o => o.fulfillmentChannel === 'Merchant').length || 0,
          primeOffers: processedPricingData?.offers?.filter(o => o.isPrime).length || 0,
          averageSellerRating: processedPricingData?.offers?.length > 0 ? 
            processedPricingData.offers.reduce((sum, o) => sum + o.sellerFeedbackRating, 0) / processedPricingData.offers.length : 0
        },
        
        // Real risk assessment
        riskAssessment: {
          categoryGated: processedEligibilityData.categoryGated,
          requiresApproval: processedEligibilityData.requiresApproval,
          restrictionCount: processedEligibilityData.restrictions.length,
          competitionLevel: (processedPricingData?.offerCount || 0) < 5 ? 'Low' : 
                           (processedPricingData?.offerCount || 0) < 15 ? 'Medium' : 'High'
        },
        
        // API metadata
        timestamp: new Date().toISOString(),
        dataQuality: {
          catalogData: !!productDetails,
          pricingData: !!pricingData,
          feesData: !!feesData,
          eligibilityData: !!eligibilityData
        }
      }
    };

    console.log('Real SP-API data processed successfully:', {
      title: result.data.productDetails?.title,
      hasData: {
        catalog: !!productDetails,
        pricing: !!pricingData,
        fees: !!feesData,
        eligibility: !!eligibilityData
      }
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('SP-API error:', error);
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
