import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AmazonProduct } from '@/hooks/useAmazonProduct';

interface PriceHistoryData {
  timestamp: string;
  buyBoxPrice?: number;
  amazonPrice?: number;
  newPrice?: number;
  salesRank?: number;
  offerCount?: number;
}

interface EnhancedPriceHistoryChartProps {
  data?: PriceHistoryData[];
  product?: AmazonProduct;
  title?: string;
}

export const EnhancedPriceHistoryChart: React.FC<EnhancedPriceHistoryChartProps> = ({ 
  data,
  product,
  title = "Keepa Price & Sales History" 
}) => {
  const [timeRange, setTimeRange] = useState('90d');
  const [chartType, setChartType] = useState('price');

  // Get price history data from Keepa
  const getKeepaHistoryData = (): PriceHistoryData[] => {
    // Use provided data first
    if (data && data.length > 0) {
      console.log('Using provided price history data:', data.length, 'points');
      return data;
    }
    
    // Use product's Keepa price history
    if (product?.price_history && product.price_history.length > 0) {
      console.log('Using product price history from Keepa:', product.price_history.length, 'points');
      return product.price_history;
    }
    
    console.log('No Keepa price history data available');
    return [];
  };

  const getFilteredData = () => {
    const allData = getKeepaHistoryData();
    if (!allData || allData.length === 0) return [];
    
    const now = new Date();
    let daysBack = 90;
    
    switch (timeRange) {
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '365d': daysBack = 365; break;
      case 'all': return allData;
    }
    
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const filtered = allData.filter(item => new Date(item.timestamp) >= cutoffDate);
    
    console.log(`Filtered ${allData.length} data points to ${filtered.length} for ${timeRange} range`);
    return filtered;
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
    { value: 'offers', label: 'Offer Count' }
  ];

  const getDataSourceBadge = () => {
    if (filteredData.length === 0) return null;
    
    return (
      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
        Real Keepa Data
      </span>
    );
  };

  if (!filteredData || filteredData.length === 0) {
    return (
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded">
              No Data Found
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-2">No historical price data available</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {product?.data_source === 'Error' 
                  ? 'Keepa API calls failed for this product'
                  : 'This product may be new or have limited historical data'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Check which data types are available
  const hasValidData = (dataKey: keyof PriceHistoryData) => {
    return filteredData.some(d => {
      const value = d[dataKey];
      if (typeof value === 'number') {
        return value > 0;
      }
      return value !== null && value !== undefined;
    });
  };

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{title}</CardTitle>
            {getDataSourceBadge()}
          </div>
          
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
                  tickFormatter={(value) => `$${value?.toFixed(0) || '0'}`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any, name) => [
                    value !== null && value !== undefined ? `$${Number(value).toFixed(2)}` : 'N/A', 
                    name
                  ]}
                />
                
                {hasValidData('buyBoxPrice') && (
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
                
                {hasValidData('amazonPrice') && (
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
                
                {hasValidData('newPrice') && (
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
                  tickFormatter={(value) => `#${value?.toLocaleString() || '0'}`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [`#${Number(value)?.toLocaleString() || 'N/A'}`, 'Sales Rank']}
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
                  tickFormatter={(value) => `${value || 0} offers`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [`${value || 0}`, 'Offer Count']}
                />
                <Area 
                  type="monotone" 
                  dataKey="offerCount" 
                  stroke="#EF4444" 
                  fill="#EF4444" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          {chartType === 'price' && (
            <>
              {hasValidData('buyBoxPrice') && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">Buy Box Price</span>
                </div>
              )}
              {hasValidData('amazonPrice') && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">Amazon Price</span>
                </div>
              )}
              {hasValidData('newPrice') && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">Lowest New Price</span>
                </div>
              )}
            </>
          )}
          {chartType === 'rank' && hasValidData('salesRank') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-slate-600 dark:text-slate-400">Sales Rank (Lower is Better)</span>
            </div>
          )}
          {chartType === 'offers' && hasValidData('offerCount') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-600 dark:text-slate-400">Live Offer Count</span>
            </div>
          )}
        </div>
        
        <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredData.length} data points from Keepa API | 
          Last updated: {product?.last_updated ? new Date(product.last_updated).toLocaleString() : 'Unknown'}
        </div>
      </CardContent>
    </Card>
  );
};
