import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle, XCircle } from 'lucide-react';
import { AmazonProduct } from '@/hooks/useAmazonProduct';

interface ProductInfoProps {
  product: AmazonProduct;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const getStockBadge = () => {
    if (product.in_stock) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          In Stock
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />
        Out of Stock
      </Badge>
    );
  };

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <img 
            src={product.image_url || '/placeholder.svg'} 
            alt={product.title}
            className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
          />
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {product.title}
                </h2>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {getStockBadge()}
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {product.offer_count || 0} Offers
                  </Badge>
                  {product.brand && <Badge variant="outline">Brand: {product.brand}</Badge>}
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {product.category && <p><strong>Category:</strong> {product.category}</p>}
                  {product.sales_rank && <p><strong>Sales Rank:</strong> #{product.sales_rank.toLocaleString()}</p>}
                  {product.estimated_monthly_sales && (
                    <p><strong>Est. Monthly Sales:</strong> {product.estimated_monthly_sales.toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  ${product.buy_box_price?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Current Buy Box Price
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  From Keepa API
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
