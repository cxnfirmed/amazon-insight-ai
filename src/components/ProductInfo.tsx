
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Package, Truck } from 'lucide-react';

interface ProductInfoProps {
  productId: string;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ productId }) => {
  // Mock product data - in real app this would come from API
  const product = {
    name: 'Echo Dot (4th Gen) | Smart speaker with Alexa',
    image: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=300&h=300&fit=crop',
    price: 49.99,
    rating: 4.6,
    reviewCount: 47289,
    category: 'Electronics > Smart Home',
    brand: 'Amazon',
    dimensions: '3.9" x 3.9" x 3.5"',
    weight: '11.2 oz',
    inStock: true,
    fbaEligible: true
  };

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
          />
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {product.name}
                </h2>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {product.rating}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      ({product.reviewCount.toLocaleString()} reviews)
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                  {product.fbaEligible && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      FBA Eligible
                    </Badge>
                  )}
                  <Badge variant="outline">{product.brand}</Badge>
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><strong>Category:</strong> {product.category}</p>
                  <p><strong>Dimensions:</strong> {product.dimensions}</p>
                  <p><strong>Weight:</strong> {product.weight}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  ${product.price}
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
