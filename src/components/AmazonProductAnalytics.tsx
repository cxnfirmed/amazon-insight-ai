import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Star, 
  Package, 
  Truck, 
  TrendingUp, 
  BarChart3,
  Shield,
  CheckCircle,
  XCircle,
  Bug,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AmazonProduct, useAmazonProduct } from '@/hooks/useAmazonProduct';
import { EnhancedPriceHistoryChart } from '@/components/EnhancedPriceHistoryChart';
import { KeepaFeeCalculator } from '@/components/KeepaFeeCalculator';
import { StarRating } from '@/components/StarRating';

interface AmazonProductAnalyticsProps {
  product: AmazonProduct;
  onBack: () => void;
}

export const AmazonProductAnalytics: React.FC<AmazonProductAnalyticsProps> = ({ 
  product, 
  onBack 
}) => {
  const { debugMode, setDebugMode } = useAmazonProduct();

  const getDataSourceBadge = () => {
    if (product.data_source === 'Keepa') {
      return <Badge className="bg-green-100 text-green-800">Real Keepa Data</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Data Error</Badge>;
  };

  const getStockStatusBadge = () => {
    if (!product.in_stock) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Out of Stock
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        In Stock
      </Badge>
    );
  };

  const formatValue = (value: any, type: 'price' | 'number' | 'text' = 'text') => {
    if (value === null || value === undefined) return 'No data found';
    
    switch (type) {
      case 'price':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : 'No data found';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : 'No data found';
      default:
        return value.toString();
    }
  };

  const formatPriceWithFallback = (value: any, fallbackText: string) => {
    if (value === null || value === undefined) {
      return fallbackText;
    }
    return typeof value === 'number' ? `$${value.toFixed(2)}` : fallbackText;
  };

  const formatMonthlySales = () => {
    if (product.estimated_monthly_sales === null || product.estimated_monthly_sales === undefined) {
      return 'N/A';
    }
    
    // Format as "X+" for all values
    const salesValue = product.estimated_monthly_sales;
    
    // For values 1000 and above, format as "XK+"
    if (salesValue >= 1000) {
      const thousands = Math.floor(salesValue / 1000);
      return `${thousands}K+`;
    }
    
    // For values under 1000, show as "X+"
    return `${salesValue}+`;
  };

  const getAmazonPrice = () => {
    console.log('AMZ Debug: Checking for Amazon price in product data');
    console.log('AMZ Debug: Amazon price value:', product.amazon_price);
    
    // Check if Amazon price exists and is a valid number
    if (product.amazon_price !== null && product.amazon_price !== undefined && typeof product.amazon_price === 'number') {
      console.log('AMZ Debug: Found Amazon price from API:', product.amazon_price);
      return `$${product.amazon_price.toFixed(2)}`;
    }
    
    console.log('AMZ Debug: No Amazon price found - Amazon is not selling this product');
    return 'Not Sold by Amazon';
  };

  if (product.data_source === 'Error') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="outline">
            ← Back to Search
          </Button>
          <Badge variant="outline">ASIN: {product.asin}</Badge>
        </div>

        <Card className="bg-red-50 dark:bg-red-950/20 backdrop-blur-sm border-red-200">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
              Keepa API Failed
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">
              Unable to fetch product data from Keepa for ASIN: {product.asin}
            </p>
            <p className="text-sm text-red-500 dark:text-red-400">
              This could be due to API limits, invalid ASIN, or network issues.
            </p>
            {debugMode && product.debug_data && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-left text-xs">
                <strong>Debug Data:</strong>
                <pre>{JSON.stringify(product.debug_data, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with debug toggle */}
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="outline">
            ← Back to Search
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              <span className="text-sm">Debug Mode</span>
              <Switch checked={debugMode} onCheckedChange={setDebugMode} />
            </div>
            {getDataSourceBadge()}
            <Badge variant="outline">ASIN: {product.asin}</Badge>
          </div>
        </div>

        {/* Product Info Card */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex gap-6">
              <img 
                src={product.image_url || '/placeholder.svg'} 
                alt={product.title}
                className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {product.title}
                </h2>
                
                {product.review_rating && (
                  <div className="mb-3">
                    <StarRating 
                      rating={product.review_rating} 
                      reviewCount={product.review_count || undefined}
                    />
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {getStockStatusBadge()}
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {product.offer_count || 0} Offers
                  </Badge>
                  {product.brand && <Badge variant="outline">Brand: {product.brand}</Badge>}
                  {product.category && <Badge variant="outline">{product.category}</Badge>}
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><strong>Manufacturer:</strong> {formatValue(product.manufacturer)}</p>
                  <p><strong>Category:</strong> {formatValue(product.category)}</p>
                  <p><strong>Sales Rank:</strong> {formatValue(product.sales_rank, 'number')}</p>
                  <p><strong>Data Source:</strong> Real Keepa API</p>
                  {product.last_updated && (
                    <p><strong>Last Updated:</strong> {new Date(product.last_updated).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatValue(product.buy_box_price, 'price')}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Buy Box Price
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  From Keepa API
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Overview - Fixed to include Risk Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Monthly Sales (Est.)
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Based on Keepa's estimated total unit sales over the past 30 days (not Buy Box only).</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatMonthlySales()}
              </div>
              <div className="text-xs text-slate-500">
                {product.estimated_monthly_sales ? 'From Keepa stats' : 'Monthly sales unavailable'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                Sales Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatValue(product.sales_rank, 'number')}
              </div>
              <div className="text-xs text-slate-500">Keepa ranking</div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                Live Offers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatValue(product.offer_count, 'number')}
              </div>
              <div className="text-xs text-slate-500">From Keepa</div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                In Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {product.in_stock ? 'Yes' : 'No'}
              </div>
              <div className="text-xs text-slate-500">Live status</div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Medium
              </div>
              <div className="text-xs text-slate-500">AI Analysis</div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Keepa Price History Chart */}
            <EnhancedPriceHistoryChart 
              product={product}
              title="Keepa Price & Sales History"
            />
            
            {/* Keepa Fee Calculator */}
            <KeepaFeeCalculator product={product} />
          </div>

          <div className="space-y-6">
            {/* Keepa Pricing Analysis */}
            <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Keepa Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Buy Box Price:</span>
                  <span className="font-semibold">{formatValue(product.buy_box_price, 'price')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Lowest FBA:</span>
                  <span className="font-semibold text-green-600">
                    {formatPriceWithFallback(product.lowest_fba_price, 'No FBA offers')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Lowest FBM:</span>
                  <span className="font-semibold text-purple-600">
                    {formatValue(product.lowest_fbm_price, 'price')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Amazon Direct:</span>
                  <span className="font-semibold text-orange-600">
                    {getAmazonPrice()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="default">
                  Add to Watchlist
                </Button>
                <Button className="w-full" variant="outline">
                  Set Price Alert
                </Button>
                <Button className="w-full" variant="outline">
                  Export Keepa Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Debug Panel */}
        {debugMode && product.debug_data && (
          <Card className="bg-gray-50 dark:bg-gray-900 border-gray-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Debug Data - Raw Keepa API Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> This shows the raw Keepa API response. Amazon price is only shown when Amazon (seller ID: ATVPDKIKX0DER) is actually selling the product.
                </p>
              </div>
              <pre className="text-xs overflow-auto max-h-96 bg-white dark:bg-black p-4 rounded">
                {JSON.stringify(product.debug_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};
