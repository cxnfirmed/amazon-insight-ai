
import React, { useState } from 'react';
import { Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAmazonProduct } from '@/hooks/useAmazonProduct';
import { AmazonProductAnalytics } from '@/components/AmazonProductAnalytics';

interface ProductSearchProps {
  onBack?: () => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { product, fetchProduct, loading } = useAmazonProduct();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    console.log('Product Analysis search initiated for:', searchQuery);
    setHasSearched(true);
    
    // Check if it's an ASIN (10 alphanumeric characters) or UPC (12 digits)
    const isASIN = searchQuery.match(/^[A-Z0-9]{10}$/);
    const isUPC = searchQuery.match(/^\d{12}$/);
    
    if (isASIN || isUPC) {
      console.log('Valid ASIN/UPC detected, fetching product data...');
      // Force fresh fetch when user searches
      await fetchProduct(searchQuery, true);
    }
  };

  // If we have product data after search, show the analytics
  if (product && hasSearched) {
    return (
      <AmazonProductAnalytics 
        product={product}
        onBack={() => {
          setHasSearched(false);
          setSearchQuery('');
        }}
      />
    );
  }

  // Show loading state while fetching product data
  if (loading && hasSearched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Fetching real Amazon product data...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Searching for: {searchQuery}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if we tried to fetch a product but failed
  if (hasSearched && searchQuery && !product && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Product Analysis
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Search for any Amazon product by ASIN, UPC, or ISBN
              </p>
            </div>

            <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Enter ASIN, UPC, or ISBN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 text-lg bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg"
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-950/20 backdrop-blur-sm border-red-200">
              <CardContent className="p-6 text-center">
                <Package className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                  Product Not Found
                </h2>
                <p className="text-red-600 dark:text-red-300 mb-4">
                  Unable to fetch product data for: {searchQuery}
                </p>
                <p className="text-sm text-red-500 dark:text-red-400">
                  This could be due to API limits, invalid ASIN/UPC, or the product not being available.
                </p>
                <Button 
                  onClick={() => {
                    setHasSearched(false);
                    setSearchQuery('');
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Try Another Search
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main search page layout (similar to SellerAmp)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Product Analysis
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Welcome to Sourcing Analysis Simplified. Please use the form to find the product that you are looking for. We will provide estimates of all fees, profit, ROI and other useful facts and figures.
            </p>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              For best results use specific terms. UPC code, ASIN or ISBN code.
            </p>
          </div>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Search Products</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
                  <Input
                    type="text"
                    placeholder="Enter ASIN, UPC, ISBN, or product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-16 text-xl bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg"
                  />
                </div>
                
                <div className="text-center">
                  <Button 
                    type="submit" 
                    size="lg"
                    className="h-14 px-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loading || !searchQuery.trim()}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">ASIN Lookup</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      10-character Amazon product identifier
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">UPC Search</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      12-digit Universal Product Code
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Product Name</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Search by product title or keywords
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
