
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Package, AlertTriangle, Plus } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { QuickStats } from '@/components/QuickStats';
import { RecentActivity } from '@/components/RecentActivity';

interface DashboardProps {
  onProductSelect: (productId: string) => void;
  searchQuery?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onProductSelect, searchQuery }) => {
  const recentProducts = [
    {
      id: 'B08N5WRWNW',
      name: 'Echo Dot (4th Gen)',
      image: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=100&h=100&fit=crop',
      currentPrice: 49.99,
      roi: 32.5,
      salesRank: 15,
      trend: 'up' as const
    },
    {
      id: 'B07HGJKJPX',
      name: 'Instant Pot Duo 7-in-1',
      image: 'https://images.unsplash.com/photo-1585515656971-f75d5d2e2c42?w=100&h=100&fit=crop',
      currentPrice: 79.99,
      roi: 28.3,
      salesRank: 8,
      trend: 'up' as const
    },
    {
      id: 'B09JQMJSXY',
      name: 'Apple AirPods Pro',
      image: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=100&h=100&fit=crop',
      currentPrice: 249.99,
      roi: -2.1,
      salesRank: 3,
      trend: 'down' as const
    }
  ];

  // Filter products based on search query
  const filteredProducts = searchQuery 
    ? recentProducts.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentProducts;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'Dashboard'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {searchQuery ? `Found ${filteredProducts.length} products` : 'Your Amazon selling performance overview'}
          </p>
        </div>
        
        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {!searchQuery && <QuickStats />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {searchQuery ? 'Search Results' : 'Recent Products'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProducts.length > 0 ? (
                <div className="space-y-4">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onClick={() => onProductSelect(product.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  No products found matching "{searchQuery}"
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};
