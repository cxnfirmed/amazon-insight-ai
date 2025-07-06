
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Star, 
  Package, 
  Truck, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Bug
} from 'lucide-react';
import { AmazonProduct, useAmazonProduct } from '@/hooks/useAmazonProduct';
import { EnhancedPriceHistoryChart } from '@/components/EnhancedPriceHistoryChart';
import { ProfitabilityCalculator } from '@/components/ProfitabilityCalculator';

interface AmazonProductAnalyticsProps {
  product: AmazonProduct;
  onBack: () => void;
}

export const AmazonProductAnalytics: React.FC<AmazonProductAnalyticsProps> = ({ 
  product, 
  onBack 
}) => {
  const { debugMode, setDebugMode } = useAmazonProduct();

  const getRiskColor = (score: number | null | undefined) => {
    if (!score) return 'text-gray-600';
    if (score <= 2) return 'text-green-600';
    if (score <= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompetitionColor = (level: string | null | undefined) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDataSourceBadge = () => {
    switch (product.data_source) {
      case 'SP-API':
        return <Badge className="bg-blue-100 text-blue-800">Live SP-API Data</Badge>;
      case 'Keepa':
        return <Badge className="bg-green-100 text-green-800">Real Keepa Data</Badge>;
      case 'Error':
        return <Badge className="bg-red-100 text-red-800">Data Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown Source</Badge>;
    }
  };

  const formatValue = (value: any, type: 'price' | 'number' | 'text' = 'text') => {
    if (value === null || value === undefined) return 'Data not available';
    
    switch (type) {
      case 'price':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : 'Data not available';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : 'Data not available';
      default:
        return value.toString();
    }
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
              Unable to Fetch Product Data
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">
              Both SP-API and Keepa failed to return data for ASIN: {product.asin}
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
                target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop';
              }}
            />
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {product.title}
              </h2>
              
              <div className="flex items-center gap-4 mb-3">
                {product.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {product.rating}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      ({formatValue(product.review_count, 'number')} reviews)
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {product.amazon_in_stock ? 'In Stock' : 'Out of Stock'}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {product.inventory_level || 'Stock level unknown'}
                </Badge>
                {product.brand && <Badge variant="outline">{product.brand}</Badge>}
                {product.category && <Badge variant="outline">{product.category}</Badge>}
              </div>
              
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <p><strong>Brand:</strong> {formatValue(product.brand)}</p>
                <p><strong>Category:</strong> {formatValue(product.category)}</p>
                <p><strong>Sales Rank:</strong> {formatValue(product.sales_rank, 'number')}</p>
                <p><strong>Data Source:</strong> {product.data_source}</p>
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
              {product.buybox_seller && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sold by {product.buybox_seller}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview - Only show real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Monthly Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatValue(product.estimated_monthly_sales, 'number')}
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
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Offer Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatValue(product.offer_count, 'number')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500" />
              Prime Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatValue(product.prime_eligible_offers, 'number')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(product.amazon_risk_score)}`}>
              {product.amazon_risk_score || 'N/A'}/5
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Real Price History Chart */}
          <EnhancedPriceHistoryChart 
            product={product}
            title="Real Price & Sales History"
          />
          
          {/* Profitability Calculator */}
          <ProfitabilityCalculator 
            initialData={{
              sellPrice: product.buy_box_price,
              weight: parseFloat(product.weight?.split(' ')[0] || '0.5'),
              dimensions: {
                length: 6,
                width: 4,
                height: 2
              }
            }}
          />
        </div>

        <div className="space-y-6">
          {/* Real Pricing & Competition */}
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Real Pricing Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Buy Box Price:</span>
                <span className="font-semibold">{formatValue(product.buy_box_price, 'price')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Lowest FBA:</span>
                <span className="font-semibold text-green-600">
                  {formatValue(product.lowest_fba_price, 'price')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Lowest FBM:</span>
                <span className="font-semibold text-blue-600">
                  {formatValue(product.lowest_fbm_price, 'price')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Total Offers:</span>
                <span className="font-semibold">{formatValue(product.offer_count, 'number')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">30d Avg:</span>
                <span className="font-semibold">{formatValue(product.avg_price_30, 'price')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Real Risk Assessment */}
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Competition Level:</span>
                <Badge className={getCompetitionColor(product.competition_level)}>
                  {product.competition_level || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Amazon Risk:</span>
                <span className={`font-semibold ${getRiskColor(product.amazon_risk_score)}`}>
                  {product.amazon_risk_score || 'N/A'}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">IP Risk:</span>
                <span className={`font-semibold ${getRiskColor(product.ip_risk_score)}`}>
                  {product.ip_risk_score || 'N/A'}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Can Sell:</span>
                <span className={`font-semibold ${product.seller_eligibility?.can_sell ? 'text-green-600' : 'text-red-600'}`}>
                  {product.seller_eligibility?.can_sell ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              {product.seller_eligibility?.restrictions?.length > 0 && (
                <div className="text-xs text-red-600">
                  <strong>Restrictions:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {product.seller_eligibility.restrictions.slice(0, 3).map((restriction, idx) => (
                      <li key={idx}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                Export Analysis
              </Button>
              <Button className="w-full" variant="outline">
                Share Report
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
              Debug Data - Raw API Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96 bg-white dark:bg-black p-4 rounded">
              {JSON.stringify(product.debug_data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
