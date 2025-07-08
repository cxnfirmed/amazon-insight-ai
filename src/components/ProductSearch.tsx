
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Package, TrendingUp, DollarSign } from 'lucide-react';

interface ProductSearchProps {
  onSearch: (query: string) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      await onSearch(searchQuery.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
          Product Analysis
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Search for any Amazon product by ASIN or UPC to get detailed analytics, 
          profitability insights, and market data.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="w-5 h-5" />
              Product Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter ASIN (e.g., B07XJ8C8F5) or UPC (e.g., 123456789012)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 text-lg py-3"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
              <p><strong>ASIN:</strong> 10-character alphanumeric code (e.g., B07XJ8C8F5)</p>
              <p><strong>UPC:</strong> 12-digit barcode number (e.g., 123456789012)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">Product Details</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Get comprehensive product information including pricing, rankings, and availability
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Market Analysis</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Analyze price history, sales rank trends, and competitive landscape
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">Profitability</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Calculate FBA fees, profit margins, and ROI for informed decisions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
