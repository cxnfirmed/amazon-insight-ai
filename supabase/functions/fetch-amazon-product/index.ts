
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Mock Amazon API response for now - in production you'd call actual Amazon API
    const mockProductData = {
      asin: asin || 'B08C1W5N87',
      upc: upc || '841667174051',
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
    }

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
