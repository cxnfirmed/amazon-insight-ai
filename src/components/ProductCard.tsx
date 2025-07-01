
import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  image: string;
  currentPrice: number;
  roi: number;
  salesRank: number;
  trend: 'up' | 'down';
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  return (
    <div 
      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <img 
        src={product.image} 
        alt={product.name}
        className="w-16 h-16 rounded-lg object-cover"
      />
      
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          ASIN: {product.id}
        </p>
      </div>
      
      <div className="text-right">
        <p className="font-semibold text-slate-900 dark:text-white">
          ${product.currentPrice}
        </p>
        <div className="flex items-center gap-1">
          {product.trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={cn(
            "text-sm font-medium",
            product.roi >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {product.roi >= 0 ? '+' : ''}{product.roi}%
          </span>
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-sm text-slate-600 dark:text-slate-400">Sales Rank</p>
        <p className="font-semibold text-slate-900 dark:text-white">
          #{product.salesRank}
        </p>
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Analyze
      </Button>
    </div>
  );
};
