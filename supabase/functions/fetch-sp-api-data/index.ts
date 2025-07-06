
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

    console.log(`Fetching SP-API data for ASIN: ${asin}`);

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

    // Get product details
    const catalogUrl = `https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=attributes,dimensions,identifiers,images,productTypes,relationships,salesRanks,summaries`;
    
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

    // Get competitive pricing
    const pricingUrl = `https://sellingpartnerapi-na.amazon.com/products/pricing/v0/items/${asin}/offers?MarketplaceId=${marketplaceId}&ItemCondition=New`;
    
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

    // Get fees estimate
    const feesUrl = `https://sellingpartnerapi-na.amazon.com/products/fees/v0/items/${asin}/feesEstimate`;
    
    const feesPayload = {
      FeesEstimateRequest: {
        MarketplaceId: marketplaceId,
        IsAmazonFulfilled: true,
        PriceToEstimateFees: {
          ListingPrice: { CurrencyCode: 'USD', Amount: 29.99 },
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

    // Process the data
    const result = {
      success: true,
      data: {
        asin,
        productDetails: productDetails || null,
        pricing: pricingData || null,
        fees: feesData || null,
        eligibility: {
          canSell: true, // This would need proper eligibility check
          restrictions: []
        }
      }
    };

    console.log('SP-API data processed successfully');

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
