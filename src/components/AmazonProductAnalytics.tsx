
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Shield
} from 'lucide-react';
import { AmazonProduct } from '@/hooks/useAmazonProduct';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';

interface AmazonProductAnalyticsProps {
  product: AmazonProduct;
  onBack: () => void;
}

export const AmazonProductAnalytics: React.FC<AmazonProductAnalyticsProps> = ({ 
  product, 
  onBack 
}) => {
  const getRiskColor = (score: number) => {
    if (score <= 2) return 'text-green-600';
    if (score <= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompetitionColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back to Search
        </Button>
        <Badge variant="outline">ASIN: {product.asin}</Badge>
      </div>

      {/* Product Info Card */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <img 
              src={product.image_url || '/placeholder.svg'} 
              alt={product.title}
              className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
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
                      ({product.review_count?.toLocaleString()} reviews)
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
                  FBA Eligible
                </Badge>
                {product.brand && <Badge variant="outline">{product.brand}</Badge>}
              </div>
              
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                {product.category && <p><strong>Category:</strong> {product.category}</p>}
                {product.dimensions && <p><strong>Dimensions:</strong> {product.dimensions}</p>}
                {product.weight && <p><strong>Weight:</strong> {product.weight}</p>}
                {product.sales_rank && <p><strong>Sales Rank:</strong> #{product.sales_rank?.toLocaleString()}</p>}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ${product.buy_box_price?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Buy Box Price
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {product.roi_percentage ? `${product.roi_percentage}%` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${product.profit_margin?.toFixed(2) || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Monthly Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {product.estimated_monthly_sales?.toLocaleString() || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Time to Sell
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {product.time_to_sell_days ? `${product.time_to_sell_days} days` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing & Competition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Pricing Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Buy Box Price:</span>
              <span className="font-semibold">${product.buy_box_price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Lowest FBA:</span>
              <span className="font-semibold">${product.lowest_fba_price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Lowest FBM:</span>
              <span className="font-semibold">${product.lowest_fbm_price?.toFixed(2) || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Competition Level:</span>
              <Badge className={getCompetitionColor(product.competition_level || '')}>
                {product.competition_level || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Amazon Risk:</span>
              <span className={`font-semibold ${getRiskColor(product.amazon_risk_score || 0)}`}>
                {product.amazon_risk_score ? `${product.amazon_risk_score}/5` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">IP Risk:</span>
              <span className={`font-semibold ${getRiskColor(product.ip_risk_score || 0)}`}>
                {product.ip_risk_score ? `${product.ip_risk_score}/5` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price History Chart */}
      <PriceHistoryChart product={product} />
    </div>
  );
};
