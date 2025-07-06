
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PriceHistoryData {
  timestamp: string;
  buyBoxPrice?: number;
  amazonPrice?: number;
  newPrice?: number;
  salesRank?: number;
  amazonInStock?: number;
}

interface EnhancedPriceHistoryChartProps {
  data: PriceHistoryData[];
  title?: string;
}

export const EnhancedPriceHistoryChart: React.FC<EnhancedPriceHistoryChartProps> = ({ 
  data, 
  title = "Price & Sales History" 
}) => {
  const [timeRange, setTimeRange] = useState('90d');
  const [chartType, setChartType] = useState('price');

  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let daysBack = 90;
    
    switch (timeRange) {
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '365d': daysBack = 365; break;
      case 'all': return data;
    }
    
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return data.filter(item => new Date(item.timestamp) >= cutoffDate);
  };

  const filteredData = getFilteredData();

  const timeRanges = [
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '365d', label: '1 Year' },
    { value: 'all', label: 'All Time' }
  ];

  const chartTypes = [
    { value: 'price', label: 'Price History' },
    { value: 'rank', label: 'Sales Rank' },
    { value: 'stock', label: 'Stock Status' }
  ];

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-600 dark:text-slate-400">No historical data available</p>
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
            {title}
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
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any, name) => [`$${value?.toFixed(2) || 'N/A'}`, name]}
                />
                {filteredData.some(d => d.buyBoxPrice) && (
                  <Line 
                    type="monotone" 
                    dataKey="buyBoxPrice" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Buy Box Price"
                    dot={false}
                    connectNulls={false}
                  />
                )}
                {filteredData.some(d => d.amazonPrice) && (
                  <Line 
                    type="monotone" 
                    dataKey="amazonPrice" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Amazon Price"
                    dot={false}
                    connectNulls={false}
                  />
                )}
                {filteredData.some(d => d.newPrice) && (
                  <Line 
                    type="monotone" 
                    dataKey="newPrice" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="Lowest New Price"
                    dot={false}
                    connectNulls={false}
                  />
                )}
              </LineChart>
            ) : chartType === 'rank' ? (
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                  tickFormatter={(value) => `#${value.toLocaleString()}`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [`#${value?.toLocaleString() || 'N/A'}`, 'Sales Rank']}
                />
                <Area 
                  type="monotone" 
                  dataKey="salesRank" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            ) : (
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 1]}
                  tickFormatter={(value) => value ? 'In Stock' : 'Out of Stock'}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [value ? 'In Stock' : 'Out of Stock', 'Amazon Stock Status']}
                />
                <Area 
                  type="step" 
                  dataKey="amazonInStock" 
                  stroke="#10B981" 
                  fill="#10B981" 
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
                <span className="text-slate-600 dark:text-slate-400">Amazon Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-slate-600 dark:text-slate-400">Lowest New Price</span>
              </div>
            </>
          )}
          {chartType === 'rank' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-slate-600 dark:text-slate-400">Sales Rank (Lower is Better)</span>
            </div>
          )}
          {chartType === 'stock' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-600 dark:text-slate-400">Amazon Stock Status</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
