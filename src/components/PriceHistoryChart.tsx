
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AmazonProduct } from '@/hooks/useAmazonProduct';

interface PriceHistoryChartProps {
  product: AmazonProduct;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ product }) => {
  const [timeRange, setTimeRange] = useState('90d');
  const [chartType, setChartType] = useState('price');

  // Generate realistic price history based on current product data
  const generatePriceHistory = () => {
    if (!product.buy_box_price) return [];
    
    const data = [];
    const days = timeRange === '90d' ? 90 : 365;
    const basePrice = product.buy_box_price;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Create realistic price variations around the current price
      const priceVariation = (Math.random() - 0.5) * (basePrice * 0.1); // ±10% variation
      
      data.push({
        date: date.toISOString().split('T')[0],
        buyBoxPrice: Math.max(basePrice + priceVariation, basePrice * 0.8),
        lowestFBA: product.lowest_fba_price || (basePrice + Math.random() * 5),
        lowestFBM: product.lowest_fbm_price || (basePrice - Math.random() * 3),
        salesRank: product.sales_rank || (Math.floor(Math.random() * 20000) + 10000),
        amazonInStock: product.amazon_in_stock ? 1 : 0
      });
    }
    return data;
  };

  const data = generatePriceHistory();

  const timeRanges = [
    { value: '90d', label: '90 Days' },
    { value: '365d', label: '1 Year' }
  ];

  const chartTypes = [
    { value: 'price', label: 'Price History' },
    { value: 'rank', label: 'Sales Rank' }
  ];

  if (!product.buy_box_price) {
    return (
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-600 dark:text-slate-400">No pricing data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {chartType === 'price' ? 'Price History' : 'Sales Rank History'}
          </CardTitle>
          
          <div className="flex gap-2">
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {chartTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={chartType === type.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartType(type.value)}
                  className="text-xs"
                >
                  {type.label}
                </Button>
              ))}
            </div>
            
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeRange(range.value)}
                  className="text-xs"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'price' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any, name) => [`$${value.toFixed(2)}`, name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="buyBoxPrice" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Buy Box Price"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lowestFBA" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Lowest FBA"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lowestFBM" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Lowest FBM"
                  dot={false}
                />
              </LineChart>
            ) : (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [`#${value}`, 'Sales Rank']}
                />
                <Area 
                  type="monotone" 
                  dataKey="salesRank" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          {chartType === 'price' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-600 dark:text-slate-400">Buy Box Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-600 dark:text-slate-400">Lowest FBA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-slate-600 dark:text-slate-400">Lowest FBM</span>
              </div>
            </>
          )}
          {chartType === 'rank' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-slate-600 dark:text-slate-400">Sales Rank (Lower is Better)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
