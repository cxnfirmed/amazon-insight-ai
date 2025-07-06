
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
    const { upc } = await req.json();
    
    if (!upc) {
      throw new Error('UPC is required');
    }

    console.log(`Converting UPC to ASIN: ${upc}`);

    // Method 1: Try Amazon search with UPC
    const searchUrl = `https://www.amazon.com/s?k=${upc}&ref=nb_sb_noss`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`Amazon search failed: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract ASIN from search results
    const asinRegex = /\/dp\/([A-Z0-9]{10})/g;
    const matches = [...html.matchAll(asinRegex)];
    
    if (matches.length > 0) {
      const asin = matches[0][1];
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          upc,
          asin,
          method: 'amazon_search'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Method 2: Try UPC database lookup (fallback)
    const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
    
    if (upcResponse.ok) {
      const upcData = await upcResponse.json();
      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        
        // Search Amazon with the product title
        const titleSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(item.title)}&ref=nb_sb_noss`;
        
        const titleResponse = await fetch(titleSearchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (titleResponse.ok) {
          const titleHtml = await titleResponse.text();
          const titleMatches = [...titleHtml.matchAll(asinRegex)];
          
          if (titleMatches.length > 0) {
            return new Response(JSON.stringify({
              success: true,
              data: {
                upc,
                asin: titleMatches[0][1],
                method: 'upc_database_title_search',
                productInfo: item
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }
    }

    throw new Error('Could not convert UPC to ASIN');

  } catch (error) {
    console.error('UPC conversion error:', error);
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
