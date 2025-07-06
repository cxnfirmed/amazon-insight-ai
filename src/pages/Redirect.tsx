
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Redirect = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the authorization code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('spapi_oauth_code');
        const state = urlParams.get('state');

        if (!code) {
          throw new Error('No authorization code received from Amazon');
        }

        console.log('Received authorization code, exchanging for tokens...');

        // Exchange the code for refresh token via our edge function
        const { data, error } = await supabase.functions.invoke('exchange-token', {
          body: { code, state }
        });

        if (error) {
          throw new Error(`Token exchange failed: ${error.message}`);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Token exchange failed');
        }

        console.log('Amazon account linked successfully');
        
        toast({
          title: "Amazon Account Connected!",
          description: "Your Amazon Seller account has been successfully linked.",
        });

        // Redirect to main page after successful connection
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message);
        
        toast({
          title: "Connection Failed",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            Connecting Your Amazon Account
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Please wait while we securely link your Amazon Seller account...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            Connection Failed
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
          Amazon Account Linked Successfully!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Your Amazon Seller account has been connected. You can now access real-time product data.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Redirecting you back to the dashboard...
        </p>
      </div>
    </div>
  );
};

export default Redirect;
