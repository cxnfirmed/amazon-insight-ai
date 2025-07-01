
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Package, Truck } from 'lucide-react';
import { AmazonProduct } from '@/hooks/useAmazonProduct';

interface ProductInfoProps {
  product: AmazonProduct;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
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
                {product.rating && product.review_count && (
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {product.rating}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        ({product.review_count.toLocaleString()} reviews)
                      </span>
                    </div>
                  </div>
                )}
                
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
                  {product.sales_rank && <p><strong>Sales Rank:</strong> #{product.sales_rank.toLocaleString()}</p>}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  ${product.buy_box_price?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Current Buy Box Price
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
