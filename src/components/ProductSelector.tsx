
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, DollarSign } from 'lucide-react';

interface ProductOption {
  asin: string;
  title: string;
  monthlySales: number;
  salesRank: number | null;
  imageUrl: string | null;
  price: number | null;
}

interface ProductSelectorProps {
  upc: string;
  products: ProductOption[];
  totalFound: number;
  onSelectProduct: (asin: string) => void;
  onBack: () => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  upc,
  products,
  totalFound,
  onSelectProduct,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Multiple Products Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          UPC <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{upc}</span> is associated with {totalFound} product{totalFound > 1 ? 's' : ''}. 
          Please select which product you want to analyze:
        </p>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.asin} className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="w-20 h-20 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {product.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {product.asin}
                    </span>
                    
                    {product.price && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${product.price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {product.monthlySales} monthly sales
                    </Badge>
                    
                    {product.salesRank && (
                      <Badge variant="outline">
                        Rank: #{product.salesRank.toLocaleString()}
                      </Badge>
                    )}
                  </div>

                  <Button 
                    onClick={() => onSelectProduct(product.asin)}
                    className="w-full sm:w-auto"
                  >
                    Analyze This Product
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={onBack}>
          Back to Search
        </Button>
      </div>
    </div>
  );
};
