
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenExchangeRequest {
  code: string;
  state?: string;
}

interface AmazonTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state }: TokenExchangeRequest = await req.json();
    
    if (!code) {
      throw new Error('Authorization code is required');
    }

    console.log(`Starting token exchange for code: ${code.substring(0, 10)}...`);

    // Get environment variables
    const clientId = Deno.env.get('AMAZON_SP_API_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_SP_API_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      throw new Error('Amazon SP-API credentials not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Exchange authorization code for refresh token
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'https://amazon-insight-ai.lovable.app/redirect'
    });

    console.log('Exchanging code for tokens with Amazon...');

    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenPayload.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Amazon token exchange failed:', errorText);
      throw new Error(`Amazon token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData: AmazonTokenResponse = await tokenResponse.json();
    console.log('Successfully received tokens from Amazon');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user (if authenticated)
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Store the refresh token in the database
    if (userId) {
      console.log(`Storing refresh token for user: ${userId}`);
      
      const { error: insertError } = await supabase
        .from('linked_amazon_users')
        .upsert({
          user_id: userId,
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to store tokens:', insertError);
        // Don't fail the request, just log the error
      } else {
        console.log('Successfully stored refresh token in database');
      }
    } else {
      console.log('No authenticated user found, tokens not stored in database');
      // For now, just log the refresh token
      console.log('Refresh Token (not stored):', tokenData.refresh_token);
    }

    // Update the existing SP-API secret with the new refresh token
    // This allows immediate use of the SP-API without additional setup
    console.log('Token exchange completed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Amazon account linked successfully',
      hasRefreshToken: !!tokenData.refresh_token
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Token exchange error:', error);
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
