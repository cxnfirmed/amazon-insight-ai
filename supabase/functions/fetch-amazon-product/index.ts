
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mock product database with different products
const getMockProductData = (identifier: string) => {
  const mockProducts: { [key: string]: any } = {
    'B08N5WRWNW': {
      asin: 'B08N5WRWNW',
      upc: '841667174051',
      title: 'Echo Dot (4th Gen) | Smart speaker with Alexa | Charcoal',
      brand: 'Amazon',
      category: 'Electronics > Smart Home > Smart Speakers',
      image_url: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=300&h=300&fit=crop',
      dimensions: '3.9" x 3.9" x 3.5"',
      weight: '11.2 oz',
      current_price: 49.99,
      buy_box_price: 49.99,
      lowest_fba_price: 52.99,
      lowest_fbm_price: 47.99,
      sales_rank: 1247,
      amazon_in_stock: true,
      review_count: 47289,
      rating: 4.6,
      roi_percentage: 23.5,
      profit_margin: 12.50,
      estimated_monthly_sales: 850,
      competition_level: 'Medium',
      amazon_risk_score: 3,
      ip_risk_score: 2,
      time_to_sell_days: 14
    },
    'B07HGJKJPX': {
      asin: 'B07HGJKJPX',
      upc: '012345678901',
      title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker, Slow Cooker, Rice Cooker',
      brand: 'Instant Pot',
      category: 'Home & Kitchen > Small Appliances > Pressure Cookers',
      image_url: 'https://images.unsplash.com/photo-1585515656971-f75d5d2e2c42?w=300&h=300&fit=crop',
      dimensions: '13.0" x 12.5" x 12.5"',
      weight: '11.8 lbs',
      current_price: 79.99,
      buy_box_price: 79.99,
      lowest_fba_price: 82.99,
      lowest_fbm_price: 76.99,
      sales_rank: 425,
      amazon_in_stock: true,
      review_count: 125463,
      rating: 4.7,
      roi_percentage: 28.3,
      profit_margin: 18.75,
      estimated_monthly_sales: 1250,
      competition_level: 'High',
      amazon_risk_score: 2,
      ip_risk_score: 1,
      time_to_sell_days: 8
    },
    'B09JQMJSXY': {
      asin: 'B09JQMJSXY',
      upc: '190199441095',
      title: 'Apple AirPods Pro (2nd Generation) Wireless Earbuds with MagSafe Case',
      brand: 'Apple',
      category: 'Electronics > Headphones > Earbuds',
      image_url: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=300&h=300&fit=crop',
      dimensions: '1.22" x 0.86" x 0.94"',
      weight: '0.19 oz',
      current_price: 249.99,
      buy_box_price: 249.99,
      lowest_fba_price: 259.99,
      lowest_fbm_price: 245.99,
      sales_rank: 28,
      amazon_in_stock: true,
      review_count: 89472,
      rating: 4.4,
      roi_percentage: -2.1,
      profit_margin: -5.25,
      estimated_monthly_sales: 3500,
      competition_level: 'Very High',
      amazon_risk_score: 5,
      ip_risk_score: 4,
      time_to_sell_days: 3
    },
    'B08C1W5N87': {
      asin: 'B08C1W5N87',
      upc: '840080503479',
      title: 'Fire TV Stick 4K streaming device with Alexa Voice Remote',
      brand: 'Amazon',
      category: 'Electronics > TV & Video > Streaming Media Players',
      image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=300&fit=crop',
      dimensions: '4.3" x 0.55" x 0.55"',
      weight: '1.8 oz',
      current_price: 49.99,
      buy_box_price: 49.99,
      lowest_fba_price: 54.99,
      lowest_fbm_price: 47.99,
      sales_rank: 156,
      amazon_in_stock: true,
      review_count: 378942,
      rating: 4.5,
      roi_percentage: 15.8,
      profit_margin: 7.50,
      estimated_monthly_sales: 2100,
      competition_level: 'Medium',
      amazon_risk_score: 3,
      ip_risk_score: 2,
      time_to_sell_days: 12
    }
  };

  // Return specific product if found, otherwise generate a generic one
  if (mockProducts[identifier]) {
    return mockProducts[identifier];
  }

  // Generate a generic product for unknown ASINs/UPCs
  return {
    asin: identifier.length === 10 ? identifier : 'B0GENERIC1',
    upc: identifier.length === 12 ? identifier : '123456789012',
    title: `Generic Product - ${identifier}`,
    brand: 'Unknown Brand',
    category: 'General > Unknown Category',
    image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop',
    dimensions: '8.0" x 6.0" x 4.0"',
    weight: '1.5 lbs',
    current_price: 29.99,
    buy_box_price: 29.99,
    lowest_fba_price: 32.99,
    lowest_fbm_price: 27.99,
    sales_rank: 15000,
    amazon_in_stock: true,
    review_count: 245,
    rating: 4.2,
    roi_percentage: 12.5,
    profit_margin: 3.75,
    estimated_monthly_sales: 45,
    competition_level: 'Low',
    amazon_risk_score: 2,
    ip_risk_score: 1,
    time_to_sell_days: 25
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { asin, upc } = await req.json()
    
    if (!asin && !upc) {
      return new Response(
        JSON.stringify({ error: 'ASIN or UPC is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const identifier = asin || upc;
    const mockProductData = getMockProductData(identifier);

    // Insert or update product data
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .upsert({
        asin: mockProductData.asin,
        upc: mockProductData.upc,
        title: mockProductData.title,
        brand: mockProductData.brand,
        category: mockProductData.category,
        image_url: mockProductData.image_url,
        dimensions: mockProductData.dimensions,
        weight: mockProductData.weight,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'asin'
      })
      .select()
      .single()

    if (productError) {
      console.error('Product insert error:', productError)
      return new Response(
        JSON.stringify({ error: 'Failed to save product data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert price history
    const { error: priceError } = await supabaseClient
      .from('price_history')
      .insert({
        asin: mockProductData.asin,
        buy_box_price: mockProductData.buy_box_price,
        lowest_fba_price: mockProductData.lowest_fba_price,
        lowest_fbm_price: mockProductData.lowest_fbm_price,
        sales_rank: mockProductData.sales_rank,
        amazon_in_stock: mockProductData.amazon_in_stock,
        review_count: mockProductData.review_count,
        rating: mockProductData.rating
      })

    if (priceError) {
      console.error('Price history insert error:', priceError)
    }

    // Insert or update analytics
    const { error: analyticsError } = await supabaseClient
      .from('product_analytics')
      .upsert({
        asin: mockProductData.asin,
        roi_percentage: mockProductData.roi_percentage,
        profit_margin: mockProductData.profit_margin,
        estimated_monthly_sales: mockProductData.estimated_monthly_sales,
        competition_level: mockProductData.competition_level,
        amazon_risk_score: mockProductData.amazon_risk_score,
        ip_risk_score: mockProductData.ip_risk_score,
        time_to_sell_days: mockProductData.time_to_sell_days,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'asin'
      })

    if (analyticsError) {
      console.error('Analytics insert error:', analyticsError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        product: mockProductData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
