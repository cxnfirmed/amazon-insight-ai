
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PriceHistoryChartProps {
  productId: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ productId }) => {
  const [timeRange, setTimeRange] = useState('90d');
  const [chartType, setChartType] = useState('price');

  // Mock data - in real app this would come from API
  const generateMockData = () => {
    const data = [];
    const days = timeRange === '90d' ? 90 : 365;
    const basePrice = 49.99;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        buyBoxPrice: basePrice + (Math.random() - 0.5) * 10,
        lowestFBA: basePrice - 5 + (Math.random() - 0.5) * 8,
        lowestFBM: basePrice - 8 + (Math.random() - 0.5) * 12,
        salesRank: 15 + Math.floor(Math.random() * 20),
        amazonInStock: Math.random() > 0.3 ? 1 : 0
      });
    }
    return data;
  };

  const data = generateMockData();

  const timeRanges = [
    { value: '90d', label: '90 Days' },
    { value: '365d', label: '1 Year' }
  ];

  const chartTypes = [
    { value: 'price', label: 'Price History' },
    { value: 'rank', label: 'Sales Rank' }
  ];

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
