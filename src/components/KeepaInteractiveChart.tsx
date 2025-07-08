import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar } from 'recharts';
import { AmazonProduct } from '@/hooks/useAmazonProduct';
import { Badge } from '@/components/ui/badge';

interface KeepaInteractiveChartProps {
  product: AmazonProduct;
  title?: string;
}

interface ChartDataPoint {
  timestamp: string;
  timestampMs: number;
  amazonPrice?: number;
  fbaPrice?: number;
  fbmPrice?: number;
  buyBoxPrice?: number;
  salesRank?: number;
  reviewCount?: number;
  rating?: number;
  offerCount?: number;
  soldPastMonth?: number;
  formattedDate: string;
}

interface LineVisibility {
  amazonPrice: boolean;
  fbaPrice: boolean;
  fbmPrice: boolean;
  buyBoxPrice: boolean;
  salesRank: boolean;
  reviewCount: boolean;
  rating: boolean;
  offerCount: boolean;
  soldPastMonth: boolean;
}

const TIME_RANGES = [
  { value: '1d', label: 'Day', days: 1 },
  { value: '1w', label: 'Week', days: 7 },
  { value: '1m', label: '1 Month', days: 30 },
  { value: '3m', label: '3 Months', days: 90 },
  { value: '1y', label: 'Year', days: 365 },
  { value: 'all', label: 'All Time', days: null }
];

const COLOR_SCHEME = {
  amazonPrice: '#FF9500', // Orange
  fbaPrice: '#3B82F6', // Blue
  fbmPrice: '#EC4899', // Pink
  buyBoxPrice: '#6B7280', // Gray
  salesRank: '#10B981', // Green
  reviewCount: '#8B5CF6', // Purple
  rating: '#F59E0B', // Amber
  offerCount: '#EF4444', // Red
  soldPastMonth: '#06B6D4' // Cyan
};

export const KeepaInteractiveChart: React.FC<KeepaInteractiveChartProps> = ({ 
  product, 
  title = "Keepa Price & Sales History" 
}) => {
  const [timeRange, setTimeRange] = useState('3m');
  const [chartMode, setChartMode] = useState<'price' | 'sales' | 'reviews'>('price');
  const [lineVisibility, setLineVisibility] = useState<LineVisibility>({
    amazonPrice: true,
    fbaPrice: true,
    fbmPrice: true,
    buyBoxPrice: true,
    salesRank: false,
    reviewCount: false,
    rating: false,
    offerCount: false,
    soldPastMonth: false
  });

  // Parse Keepa CSV data into chart-friendly format
  const chartData: ChartDataPoint[] = useMemo(() => {
    console.log('Processing chart data for product:', product.asin);
    console.log('Product CSV data:', product.csv);
    console.log('Product debug data:', product.debug_data);
    
    // Try to get CSV data from multiple possible locations
    let csvData = null;
    
    // First try the direct csv field
    if (product.csv && Array.isArray(product.csv) && product.csv.length > 0) {
      csvData = product.csv;
      console.log('Found CSV data in product.csv, length:', csvData.length);
    }
    // Fallback to debug_data
    else if (product.debug_data?.data?.csv && Array.isArray(product.debug_data.data.csv)) {
      csvData = product.debug_data.data.csv;
      console.log('Found CSV data in debug_data.data.csv, length:', csvData.length);
    }
    // Another fallback
    else if (product.debug_data?.csv && Array.isArray(product.debug_data.csv)) {
      csvData = product.debug_data.csv;
      console.log('Found CSV data in debug_data.csv, length:', csvData.length);
    }
    
    if (!csvData || csvData.length === 0) {
      console.log('No CSV data found or empty array');
      return [];
    }

    const stats = product.debug_data?.data?.stats || {};
    
    console.log('Parsing CSV data, length:', csvData.length);
    console.log('First few CSV items:', csvData.slice(0, 10));
    
    const keepaEpoch = new Date('2011-01-01T00:00:00.000Z').getTime();
    const dataPoints: ChartDataPoint[] = [];
    
    // Process CSV data in pairs (timestamp, value)
    for (let i = 0; i < csvData.length; i += 2) {
      const timestampMinutes = csvData[i];
      const values = csvData[i + 1];
      
      if (typeof timestampMinutes !== 'number' || timestampMinutes < 0) {
        console.log('Invalid timestamp at index', i, ':', timestampMinutes);
        continue;
      }
      
      if (!Array.isArray(values)) {
        console.log('Invalid values array at index', i + 1, ':', values);
        continue;
      }
      
      const timestampMs = keepaEpoch + (timestampMinutes * 60 * 1000);
      const date = new Date(timestampMs);
      
      if (isNaN(date.getTime())) {
        console.log('Invalid date for timestamp:', timestampMinutes);
        continue;
      }
      
      // Extract values from the array based on Keepa indices
      const dataPoint: ChartDataPoint = {
        timestamp: date.toISOString(),
        timestampMs,
        formattedDate: date.toLocaleDateString(),
        amazonPrice: values[0] && values[0] !== -1 ? values[0] / 100 : undefined,
        fbaPrice: values[1] && values[1] !== -1 ? values[1] / 100 : undefined,
        fbmPrice: values[3] && values[3] !== -1 ? values[3] / 100 : undefined,
        buyBoxPrice: values[4] && values[4] !== -1 ? values[4] / 100 : undefined,
        salesRank: values[5] && values[5] !== -1 ? values[5] : undefined,
        offerCount: values[20] && values[20] !== -1 ? values[20] : undefined,
        rating: values[42] && values[42] !== -1 ? values[42] / 10 : undefined,
        reviewCount: values[44] && values[44] !== -1 ? values[44] : undefined,
        soldPastMonth: stats.sold30 || stats.buyBoxShipped30 || undefined
      };
      
      dataPoints.push(dataPoint);
    }
    
    console.log('Processed data points:', dataPoints.length);
    console.log('Sample data points:', dataPoints.slice(0, 5));
    return dataPoints.sort((a, b) => a.timestampMs - b.timestampMs);
  }, [product.csv, product.debug_data]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!chartData.length) return [];
    
    if (timeRange === 'all') return chartData;
    
    const range = TIME_RANGES.find(r => r.value === timeRange);
    if (!range || !range.days) return chartData;
    
    const cutoffTime = Date.now() - (range.days * 24 * 60 * 60 * 1000);
    return chartData.filter(point => point.timestampMs >= cutoffTime);
  }, [chartData, timeRange]);

  const toggleLineVisibility = (line: keyof LineVisibility) => {
    setLineVisibility(prev => ({
      ...prev,
      [line]: !prev[line]
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 dark:text-white">
            {new Date(label).toLocaleDateString()}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name.includes('Price') ? `$${entry.value?.toFixed(2)}` : entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!filteredData.length) {
    return (
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              No Historical Data
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                No historical price data available from Keepa API
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSV data length: {product.csv?.length || 0} | 
                Debug CSV: {product.debug_data?.data?.csv?.length || 0}
              </p>
            </div>
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
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Live Keepa Data
            </Badge>
          </CardTitle>
          
          {/* Time Range Controls */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {TIME_RANGES.map((range) => (
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
        
        {/* Chart Mode Controls */}
        <div className="flex gap-2 mt-2">
          <Button
            variant={chartMode === 'price' ? "default" : "outline"}
            size="sm"
            onClick={() => setChartMode('price')}
          >
            Price History
          </Button>
          <Button
            variant={chartMode === 'sales' ? "default" : "outline"}
            size="sm"
            onClick={() => setChartMode('sales')}
          >
            Sales Data
          </Button>
          <Button
            variant={chartMode === 'reviews' ? "default" : "outline"}
            size="sm"
            onClick={() => setChartMode('reviews')}
          >
            Reviews
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Line Visibility Controls */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {chartMode === 'price' && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="amazon-price"
                    checked={lineVisibility.amazonPrice}
                    onCheckedChange={() => toggleLineVisibility('amazonPrice')}
                  />
                  <Label htmlFor="amazon-price" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.amazonPrice }}></span>
                    Amazon
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fba-price"
                    checked={lineVisibility.fbaPrice}
                    onCheckedChange={() => toggleLineVisibility('fbaPrice')}
                  />
                  <Label htmlFor="fba-price" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.fbaPrice }}></span>
                    FBA
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fbm-price"
                    checked={lineVisibility.fbmPrice}
                    onCheckedChange={() => toggleLineVisibility('fbmPrice')}
                  />
                  <Label htmlFor="fbm-price" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.fbmPrice }}></span>
                    FBM
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="buybox-price"
                    checked={lineVisibility.buyBoxPrice}
                    onCheckedChange={() => toggleLineVisibility('buyBoxPrice')}
                  />
                  <Label htmlFor="buybox-price" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.buyBoxPrice }}></span>
                    Buy Box
                  </Label>
                </div>
              </>
            )}
            
            {chartMode === 'sales' && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sales-rank"
                    checked={lineVisibility.salesRank}
                    onCheckedChange={() => toggleLineVisibility('salesRank')}
                  />
                  <Label htmlFor="sales-rank" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.salesRank }}></span>
                    Sales Rank
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="offer-count"
                    checked={lineVisibility.offerCount}
                    onCheckedChange={() => toggleLineVisibility('offerCount')}
                  />
                  <Label htmlFor="offer-count" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.offerCount }}></span>
                    Offer Count
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sold-past-month"
                    checked={lineVisibility.soldPastMonth}
                    onCheckedChange={() => toggleLineVisibility('soldPastMonth')}
                  />
                  <Label htmlFor="sold-past-month" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.soldPastMonth }}></span>
                    Monthly Sold
                  </Label>
                </div>
              </>
            )}
            
            {chartMode === 'reviews' && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="review-count"
                    checked={lineVisibility.reviewCount}
                    onCheckedChange={() => toggleLineVisibility('reviewCount')}
                  />
                  <Label htmlFor="review-count" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.reviewCount }}></span>
                    Review Count
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="rating"
                    checked={lineVisibility.rating}
                    onCheckedChange={() => toggleLineVisibility('rating')}
                  />
                  <Label htmlFor="rating" className="text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: COLOR_SCHEME.rating }}></span>
                    Rating
                  </Label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="timestampMs"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (chartMode === 'price') return `$${value?.toFixed(0)}`;
                  if (chartMode === 'sales') return value?.toLocaleString();
                  return value?.toString();
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Price Lines */}
              {chartMode === 'price' && (
                <>
                  {lineVisibility.amazonPrice && (
                    <Line 
                      type="monotone" 
                      dataKey="amazonPrice" 
                      stroke={COLOR_SCHEME.amazonPrice}
                      strokeWidth={2}
                      name="Amazon Price"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {lineVisibility.fbaPrice && (
                    <Line 
                      type="monotone" 
                      dataKey="fbaPrice" 
                      stroke={COLOR_SCHEME.fbaPrice}
                      strokeWidth={2}
                      name="FBA Price"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {lineVisibility.fbmPrice && (
                    <Line 
                      type="monotone" 
                      dataKey="fbmPrice" 
                      stroke={COLOR_SCHEME.fbmPrice}
                      strokeWidth={2}
                      name="FBM Price"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {lineVisibility.buyBoxPrice && (
                    <Line 
                      type="monotone" 
                      dataKey="buyBoxPrice" 
                      stroke={COLOR_SCHEME.buyBoxPrice}
                      strokeWidth={2}
                      name="Buy Box Price"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </>
              )}
              
              {/* Sales Lines */}
              {chartMode === 'sales' && (
                <>
                  {lineVisibility.salesRank && (
                    <Line 
                      type="monotone" 
                      dataKey="salesRank" 
                      stroke={COLOR_SCHEME.salesRank}
                      strokeWidth={2}
                      name="Sales Rank"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {lineVisibility.offerCount && (
                    <Line 
                      type="monotone" 
                      dataKey="offerCount" 
                      stroke={COLOR_SCHEME.offerCount}
                      strokeWidth={2}
                      name="Offer Count"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {lineVisibility.soldPastMonth && (
                    <Bar 
                      dataKey="soldPastMonth" 
                      fill={COLOR_SCHEME.soldPastMonth}
                      name="Monthly Sold"
                      opacity={0.6}
                    />
                  )}
                </>
              )}
              
              {/* Review Lines */}
              {chartMode === 'reviews' && (
                <>
                  {lineVisibility.reviewCount && (
                    <Line 
                      type="monotone" 
                      dataKey="reviewCount" 
                      stroke={COLOR_SCHEME.reviewCount}
                      strokeWidth={2}
                      name="Review Count"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {lineVisibility.rating && (
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke={COLOR_SCHEME.rating}
                      strokeWidth={2}
                      name="Rating"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart Info */}
        <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredData.length} data points from Keepa API | 
          Last updated: {product.last_updated ? new Date(product.last_updated).toLocaleString() : 'Unknown'}
        </div>
      </CardContent>
    </Card>
  );
};
