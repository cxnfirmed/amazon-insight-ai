import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar } from 'recharts';
import { AmazonProduct } from '@/hooks/useAmazonProduct';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
}

interface ParsedSeries {
  [timestamp: number]: number;
}

interface DataQualityStats {
  totalRawPoints: number;
  validPoints: number;
  filteredPoints: number;
  buyBoxValidationStats: {
    rawBuyBoxPoints: number;
    sellerCorrelationRejected: number;
    basicValidationRejected: number;
    finalValidPoints: number;
    rejectedExamples: Array<{
      timestamp: number;
      buyBoxPrice: number;
      amazonPrice?: number;
      fbaPrice?: number;
      fbmPrice?: number;
      reason: string;
    }>;
  };
  seriesStats: {
    [key: string]: {
      rawCount: number;
      validCount: number;
      filteredCount: number;
      filterReasons: string[];
    };
  };
}

const TIME_RANGES = [
  { value: '1d', label: 'Day', days: 1 },
  { value: '1w', label: 'Week', days: 7 },
  { value: '1m', label: '1 Month', days: 30 },
  { value: '3m', label: '3 Months', days: 90 },
  { value: '1y', label: 'Year', days: 365 },
  { value: 'all', label: 'All Time', days: null }
];

const GRANULARITY_OPTIONS = [
  { value: 'raw', label: 'All Data' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const COLOR_SCHEME = {
  amazonPrice: '#FF9500',
  fbaPrice: '#3B82F6',
  fbmPrice: '#EC4899',
  buyBoxPrice: '#6B7280',
  salesRank: '#10B981',
  reviewCount: '#8B5CF6',
  rating: '#F59E0B',
  offerCount: '#EF4444'
};

// Keepa epoch: January 1, 2011 00:00:00 UTC
const KEEPA_EPOCH = new Date('2011-01-01T00:00:00.000Z').getTime();

// Enhanced price validation functions
const isValidPrice = (price: number): boolean => {
  return typeof price === 'number' && price > 0.01 && price < 10000;
};

// NEW: Seller correlation validation function
const validateBuyBoxWithSellerCorrelation = (
  buyBoxPrice: number,
  amazonPrice?: number,
  fbaPrice?: number,
  fbmPrice?: number,
  timestamp?: number,
  tolerance: number = 0.20
): { isValid: boolean; matchedSeller?: string; reason?: string } => {
  
  console.log(`=== VALIDATING BUY BOX PRICE ===`);
  console.log(`Timestamp: ${timestamp ? new Date(keepaTimeToMs(timestamp)).toISOString() : 'unknown'}`);
  console.log(`Buy Box Price: $${buyBoxPrice.toFixed(2)}`);
  console.log(`Available Sellers:`);
  console.log(`  Amazon: ${amazonPrice ? `$${amazonPrice.toFixed(2)}` : 'N/A'}`);
  console.log(`  FBA: ${fbaPrice ? `$${fbaPrice.toFixed(2)}` : 'N/A'}`);
  console.log(`  FBM: ${fbmPrice ? `$${fbmPrice.toFixed(2)}` : 'N/A'}`);
  
  const sellers = [
    { name: 'Amazon', price: amazonPrice },
    { name: 'FBA', price: fbaPrice },
    { name: 'FBM', price: fbmPrice }
  ].filter(seller => seller.price !== undefined && seller.price > 0);
  
  if (sellers.length === 0) {
    console.log(`❌ REJECTED: No valid seller prices available`);
    return { 
      isValid: false, 
      reason: 'No seller prices available for correlation' 
    };
  }
  
  // Check if Buy Box price matches any seller price within tolerance
  for (const seller of sellers) {
    const priceDiff = Math.abs(buyBoxPrice - seller.price!);
    const withinTolerance = priceDiff <= tolerance;
    
    console.log(`  ${seller.name}: Diff $${priceDiff.toFixed(2)} (tolerance: $${tolerance.toFixed(2)}) - ${withinTolerance ? '✅ MATCH' : '❌'}`);
    
    if (withinTolerance) {
      console.log(`✅ ACCEPTED: Buy Box price matches ${seller.name} seller`);
      return { 
        isValid: true, 
        matchedSeller: seller.name 
      };
    }
  }
  
  console.log(`❌ REJECTED: Buy Box price $${buyBoxPrice.toFixed(2)} doesn't match any seller within $${tolerance.toFixed(2)} tolerance`);
  return { 
    isValid: false, 
    reason: `No seller match within $${tolerance.toFixed(2)} tolerance (closest: ${sellers.map(s => `${s.name}: $${s.price!.toFixed(2)}`).join(', ')})` 
  };
};

const isValidFbaFbmPrice = (price: number): boolean => {
  return typeof price === 'number' && price > 0.01 && price < 50000;
};

// Convert Keepa timestamp to JavaScript timestamp
const keepaTimeToMs = (keepaMinutes: number): number => {
  return KEEPA_EPOCH + (keepaMinutes * 60 * 1000);
};

// Enhanced CSV parsing with better -1 handling and debugging
const parseCsvSeries = (csvArray: number[], seriesType: string): { series: ParsedSeries; stats: { rawCount: number; validCount: number; filteredCount: number; filterReasons: string[] } } => {
  const series: ParsedSeries = {};
  const stats = { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] as string[] };
  
  if (!Array.isArray(csvArray) || csvArray.length < 2) {
    console.log(`${seriesType}: No data or invalid array`);
    return { series, stats };
  }
  
  stats.rawCount = Math.floor(csvArray.length / 2);
  console.log(`${seriesType}: Processing ${stats.rawCount} raw data points`);
  
  // Show raw data sample for Buy Box specifically
  if (seriesType === 'buyBox') {
    console.log(`=== RAW BUY BOX CSV DATA SAMPLE ===`);
    const sampleSize = Math.min(20, csvArray.length);
    for (let i = 0; i < sampleSize - 1; i += 2) {
      const timestamp = csvArray[i];
      const rawValue = csvArray[i + 1];
      const processedValue = rawValue === -1 ? -1 : rawValue / 100;
      const date = new Date(keepaTimeToMs(timestamp)).toISOString();
      console.log(`  [${i/2}] ${date}: Raw=${rawValue}, Processed=$${processedValue === -1 ? 'N/A' : processedValue.toFixed(2)}`);
    }
  }
  
  // Parse alternating [timestamp, value, timestamp, value, ...] format
  for (let i = 0; i < csvArray.length - 1; i += 2) {
    const timestampMinutes = csvArray[i];
    const rawValue = csvArray[i + 1];
    
    if (typeof timestampMinutes !== 'number' || typeof rawValue !== 'number') {
      stats.filteredCount++;
      stats.filterReasons.push('Invalid timestamp or value type');
      continue;
    }
    
    // Skip Keepa's -1 placeholder values
    if (rawValue === -1) {
      stats.filteredCount++;
      stats.filterReasons.push('Keepa placeholder (-1)');
      continue;
    }
    
    // Convert price values (divide by 100) except for non-price fields
    let processedValue = rawValue;
    if (['amazon', 'fba', 'fbm', 'buyBox'].includes(seriesType)) {
      processedValue = rawValue / 100;
    } else if (seriesType === 'rating') {
      processedValue = rawValue / 10;
    }
    
    // Apply validation based on series type
    let isValid = false;
    if (['amazon', 'fba', 'fbm', 'buyBox'].includes(seriesType)) {
      isValid = processedValue > 0.01 && processedValue < 50000;
    } else {
      isValid = processedValue >= 0; // Allow zero for counts, ranks, etc.
    }
    
    if (isValid) {
      series[timestampMinutes] = processedValue;
      stats.validCount++;
    } else {
      stats.filteredCount++;
      stats.filterReasons.push(`Invalid ${seriesType} value: ${processedValue}`);
    }
  }
  
  console.log(`${seriesType} parsing results:`, {
    raw: stats.rawCount,
    valid: stats.validCount,
    filtered: stats.filteredCount,
    sampleReasons: stats.filterReasons.slice(0, 5)
  });
  
  return { series, stats };
};

// Enhanced merge function with seller correlation validation
const mergeSeriesByTimestamp = (seriesData: { [key: string]: ParsedSeries }, offerCountSeries: ParsedSeries): { data: ChartDataPoint[]; stats: DataQualityStats } => {
  // Collect all unique timestamps
  const allTimestamps = new Set<number>();
  
  Object.values(seriesData).forEach(series => {
    Object.keys(series).forEach(timestamp => {
      allTimestamps.add(Number(timestamp));
    });
  });
  
  // Add offer count timestamps
  Object.keys(offerCountSeries).forEach(timestamp => {
    allTimestamps.add(Number(timestamp));
  });
  
  // Sort timestamps
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
  
  const stats: DataQualityStats = {
    totalRawPoints: sortedTimestamps.length,
    validPoints: 0,
    filteredPoints: 0,
    buyBoxValidationStats: {
      rawBuyBoxPoints: 0,
      sellerCorrelationRejected: 0,
      basicValidationRejected: 0,
      finalValidPoints: 0,
      rejectedExamples: []
    },
    seriesStats: {}
  };
  
  // Initialize series stats
  ['amazon', 'fba', 'fbm', 'buyBox', 'salesRank', 'offerCount'].forEach(key => {
    stats.seriesStats[key] = { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] };
  });
  
  console.log(`=== MERGING DATA WITH SELLER CORRELATION ===`);
  console.log(`Processing ${sortedTimestamps.length} timestamps`);
  console.log('Available series:', Object.keys(seriesData));
  console.log('Offer count data points:', Object.keys(offerCountSeries).length);
  
  // Create merged data points with enhanced Buy Box validation
  const dataPoints: ChartDataPoint[] = sortedTimestamps.map(keepaTimestamp => {
    const timestampMs = keepaTimeToMs(keepaTimestamp);
    const date = new Date(timestampMs);
    
    // Extract values for this timestamp from each series
    const amazonPrice = seriesData.amazon?.[keepaTimestamp];
    const fbaPrice = seriesData.fba?.[keepaTimestamp];
    const fbmPrice = seriesData.fbm?.[keepaTimestamp];
    const rawBuyBoxPrice = seriesData.buyBox?.[keepaTimestamp];
    const salesRank = seriesData.salesRank?.[keepaTimestamp];
    const offerCount = offerCountSeries[keepaTimestamp];
    const rating = seriesData.rating?.[keepaTimestamp];
    const reviewCount = seriesData.reviewCount?.[keepaTimestamp];
    
    // Enhanced Buy Box validation with seller correlation
    let validatedBuyBoxPrice: number | undefined = undefined;
    if (rawBuyBoxPrice !== undefined) {
      stats.buyBoxValidationStats.rawBuyBoxPoints++;
      
      // Step 1: Seller correlation validation
      const correlationResult = validateBuyBoxWithSellerCorrelation(
        rawBuyBoxPrice,
        amazonPrice,
        fbaPrice,
        fbmPrice,
        keepaTimestamp
      );
      
      if (!correlationResult.isValid) {
        stats.buyBoxValidationStats.sellerCorrelationRejected++;
        
        // Store first 10 rejected examples for debugging
        if (stats.buyBoxValidationStats.rejectedExamples.length < 10) {
          stats.buyBoxValidationStats.rejectedExamples.push({
            timestamp: keepaTimestamp,
            buyBoxPrice: rawBuyBoxPrice,
            amazonPrice,
            fbaPrice,
            fbmPrice,
            reason: correlationResult.reason || 'No seller correlation'
          });
        }
        
        stats.seriesStats.buyBox.filteredCount++;
        stats.seriesStats.buyBox.filterReasons.push(`Seller correlation failed: ${correlationResult.reason}`);
      } else {
        // Step 2: Basic price validation (existing logic)
        if (isValidPrice(rawBuyBoxPrice)) {
          validatedBuyBoxPrice = rawBuyBoxPrice;
          stats.buyBoxValidationStats.finalValidPoints++;
          stats.seriesStats.buyBox.validCount++;
          stats.validPoints++;
          
          console.log(`✅ Buy Box ACCEPTED: $${rawBuyBoxPrice.toFixed(2)} at ${date.toISOString()} (matched ${correlationResult.matchedSeller})`);
        } else {
          stats.buyBoxValidationStats.basicValidationRejected++;
          stats.seriesStats.buyBox.filteredCount++;
          stats.seriesStats.buyBox.filterReasons.push(`Basic validation failed: $${rawBuyBoxPrice}`);
          stats.filteredPoints++;
        }
      }
    }
    
    // Validate other price fields (existing logic)
    const validatedData = {
      timestamp: date.toISOString(),
      timestampMs,
      formattedDate: date.toLocaleDateString(),
      amazonPrice: amazonPrice && isValidPrice(amazonPrice) ? amazonPrice : undefined,
      fbaPrice: fbaPrice && isValidFbaFbmPrice(fbaPrice) ? fbaPrice : undefined,
      fbmPrice: fbmPrice && isValidFbaFbmPrice(fbmPrice) ? fbmPrice : undefined,
      buyBoxPrice: validatedBuyBoxPrice,
      salesRank: salesRank || undefined,
      offerCount: offerCount || undefined,
      rating: rating || undefined,
      reviewCount: reviewCount || undefined
    };
    
    // Update stats for other fields
    ['amazonPrice', 'fbaPrice', 'fbmPrice'].forEach(field => {
      const key = field.replace('Price', '');
      const value = validatedData[field as keyof typeof validatedData];
      if (stats.seriesStats[key]) {
        if (value !== undefined) {
          stats.seriesStats[key].validCount++;
        }
      }
    });
    
    return validatedData;
  });
  
  console.log('=== BUY BOX VALIDATION RESULTS ===');
  console.log(`Raw Buy Box Points: ${stats.buyBoxValidationStats.rawBuyBoxPoints}`);
  console.log(`Seller Correlation Rejected: ${stats.buyBoxValidationStats.sellerCorrelationRejected}`);
  console.log(`Basic Validation Rejected: ${stats.buyBoxValidationStats.basicValidationRejected}`);
  console.log(`Final Valid Points: ${stats.buyBoxValidationStats.finalValidPoints}`);
  console.log(`Success Rate: ${stats.buyBoxValidationStats.rawBuyBoxPoints ? Math.round((stats.buyBoxValidationStats.finalValidPoints / stats.buyBoxValidationStats.rawBuyBoxPoints) * 100) : 0}%`);
  
  if (stats.buyBoxValidationStats.rejectedExamples.length > 0) {
    console.log('=== FIRST 10 REJECTED BUY BOX EXAMPLES ===');
    stats.buyBoxValidationStats.rejectedExamples.forEach((example, index) => {
      const date = new Date(keepaTimeToMs(example.timestamp)).toISOString();
      console.log(`${index + 1}. ${date}: Buy Box $${example.buyBoxPrice.toFixed(2)}`);
      console.log(`   Available: Amazon=${example.amazonPrice ? `$${example.amazonPrice.toFixed(2)}` : 'N/A'}, FBA=${example.fbaPrice ? `$${example.fbaPrice.toFixed(2)}` : 'N/A'}, FBM=${example.fbmPrice ? `$${example.fbmPrice.toFixed(2)}` : 'N/A'}`);
      console.log(`   Reason: ${example.reason}`);
    });
  }
  
  return { data: dataPoints, stats };
};

// Data aggregation functions (keep existing code)
const aggregateData = (data: ChartDataPoint[], granularity: string): ChartDataPoint[] => {
  if (granularity === 'raw' || data.length === 0) return data;
  
  const sortedData = [...data].sort((a, b) => a.timestampMs - b.timestampMs);
  const aggregated: ChartDataPoint[] = [];
  
  let groupSize: number;
  switch (granularity) {
    case 'daily': groupSize = 24 * 60 * 60 * 1000; break;
    case 'weekly': groupSize = 7 * 24 * 60 * 60 * 1000; break;
    case 'monthly': groupSize = 30 * 24 * 60 * 60 * 1000; break;
    default: return sortedData;
  }
  
  let currentGroup: ChartDataPoint[] = [];
  let currentGroupStart = Math.floor(sortedData[0].timestampMs / groupSize) * groupSize;
  
  for (const point of sortedData) {
    const pointGroup = Math.floor(point.timestampMs / groupSize) * groupSize;
    
    if (pointGroup === currentGroupStart) {
      currentGroup.push(point);
    } else {
      if (currentGroup.length > 0) {
        aggregated.push(aggregateGroup(currentGroup, currentGroupStart));
      }
      currentGroup = [point];
      currentGroupStart = pointGroup;
    }
  }
  
  if (currentGroup.length > 0) {
    aggregated.push(aggregateGroup(currentGroup, currentGroupStart));
  }
  
  return aggregated;
};

const aggregateGroup = (group: ChartDataPoint[], groupStart: number): ChartDataPoint => {
  const validPrices = (field: keyof ChartDataPoint) =>
    group.map(p => p[field] as number).filter(v => v && !isNaN(v));
  
  const avg = (values: number[]) => values.length > 0 ? values.reduce((a, b) => a + b) / values.length : undefined;
  const last = (values: number[]) => values.length > 0 ? values[values.length - 1] : undefined;
  
  return {
    timestamp: new Date(groupStart).toISOString(),
    timestampMs: groupStart,
    formattedDate: new Date(groupStart).toLocaleDateString(),
    amazonPrice: avg(validPrices('amazonPrice')),
    fbaPrice: avg(validPrices('fbaPrice')),
    fbmPrice: avg(validPrices('fbmPrice')),
    buyBoxPrice: avg(validPrices('buyBoxPrice')),
    salesRank: last(validPrices('salesRank')), // Use last known rank
    reviewCount: last(validPrices('reviewCount')),
    rating: avg(validPrices('rating')),
    offerCount: avg(validPrices('offerCount'))
  };
};

export const KeepaInteractiveChart: React.FC<KeepaInteractiveChartProps> = ({ 
  product, 
  title = "Keepa Price & Sales History" 
}) => {
  const [timeRange, setTimeRange] = useState('all');
  const [granularity, setGranularity] = useState('raw');
  const [chartMode, setChartMode] = useState<'price' | 'sales' | 'reviews'>('price');
  const [fillGaps, setFillGaps] = useState(false);
  const [showDataStats, setShowDataStats] = useState(true);
  const [lineVisibility, setLineVisibility] = useState<LineVisibility>({
    amazonPrice: true,
    fbaPrice: true,
    fbmPrice: true,
    buyBoxPrice: true,
    salesRank: false,
    reviewCount: false,
    rating: false,
    offerCount: false
  });

  // Parse Keepa CSV data with enhanced seller correlation validation
  const { chartData, dataStats } = useMemo(() => {
    console.log('=== PROCESSING CHART DATA WITH SELLER CORRELATION ===');
    console.log('Product ASIN:', product.asin);
    console.log('Product CSV structure:', Object.keys(product.csv || {}));
    
    if (!product.csv || typeof product.csv !== 'object') {
      console.log('ERROR: No CSV data found or invalid format');
      return { chartData: [], dataStats: null };
    }

    // Parse each CSV series separately with enhanced validation
    const seriesData: { [key: string]: ParsedSeries } = {};
    let offerCountSeries: ParsedSeries = {};
    
    // Map Keepa CSV indices to our data fields
    const csvMapping = {
      amazon: 0,        // Amazon price
      buyBox: 3,        // Buy Box price  
      salesRank: 4,     // Sales rank
      offerCount: 5,    // Offer count
      fba: 16,          // FBA price (NEW_FBA)
      fbm: 18,          // FBM price (NEW_FBM)
      rating: 44,       // Rating
      reviewCount: 45   // Review count
    };
    
    // Parse each available series with detailed logging
    Object.entries(csvMapping).forEach(([fieldName, csvIndex]) => {
      const csvArray = product.csv[csvIndex];
      if (csvArray && Array.isArray(csvArray) && csvArray.length > 0) {
        console.log(`=== PARSING ${fieldName.toUpperCase()} (CSV[${csvIndex}]) ===`);
        console.log(`Raw array length: ${csvArray.length}`);
        const { series, stats } = parseCsvSeries(csvArray, fieldName);
        if (fieldName === 'offerCount') {
          offerCountSeries = series;
        } else {
          seriesData[fieldName] = series;
        }
        console.log(`${fieldName} final result:`, Object.keys(series).length, 'data points');
      } else {
        console.log(`WARNING: No data for ${fieldName} at CSV index ${csvIndex}`);
      }
    });
    
    if (Object.keys(seriesData).length === 0) {
      console.log('ERROR: No valid series data found after parsing');
      return { chartData: [], dataStats: null };
    }
    
    // Merge all series by timestamp with enhanced Buy Box validation
    console.log('=== MERGING SERIES DATA WITH SELLER CORRELATION ===');
    const { data: mergedData, stats } = mergeSeriesByTimestamp(seriesData, offerCountSeries);
    
    if (mergedData.length === 0) {
      console.log('ERROR: No merged data points created');
      return { chartData: [], dataStats: stats };
    }
    
    // Sort data chronologically
    let filteredData = mergedData.sort((a, b) => a.timestampMs - b.timestampMs);
    
    console.log('=== FINAL RESULTS WITH SELLER CORRELATION ===');
    console.log('Total processed data points:', filteredData.length);
    console.log('Valid Buy Box data points:', filteredData.filter(d => d.buyBoxPrice !== undefined).length);
    console.log('FBA data points:', filteredData.filter(d => d.fbaPrice !== undefined).length);
    console.log('Date range:', {
      first: filteredData[0]?.timestamp,
      last: filteredData[filteredData.length - 1]?.timestamp
    });
    
    return { chartData: filteredData, dataStats: stats };
  }, [product.csv, product.asin]);

  // Apply granularity aggregation
  const aggregatedData = useMemo(() => {
    return aggregateData(chartData, granularity);
  }, [chartData, granularity]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!aggregatedData.length) {
      return [];
    }
    
    if (timeRange === 'all') {
      return aggregatedData;
    }
    
    const range = TIME_RANGES.find(r => r.value === timeRange);
    if (!range || !range.days) {
      return aggregatedData;
    }
    
    const cutoffTime = Date.now() - (range.days * 24 * 60 * 60 * 1000);
    const filtered = aggregatedData.filter(point => point.timestampMs >= cutoffTime);
    
    return filtered;
  }, [aggregatedData, timeRange]);

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

  // Generate enhanced data quality badge
  const getDataQualityBadge = () => {
    if (!dataStats) return null;
    
    const buyBoxSuccessRate = dataStats.buyBoxValidationStats.rawBuyBoxPoints > 0 
      ? dataStats.buyBoxValidationStats.finalValidPoints / dataStats.buyBoxValidationStats.rawBuyBoxPoints 
      : 0;
    
    const qualityColor = buyBoxSuccessRate > 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                         buyBoxSuccessRate > 0.5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                         'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    
    return (
      <Badge variant="secondary" className={qualityColor}>
        Buy Box: {Math.round(buyBoxSuccessRate * 100)}% Validated
      </Badge>
    );
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
                No historical price data available for the selected time range
              </p>
              {dataStats?.buyBoxValidationStats && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <div>Buy Box Validation Results:</div>
                  <div>Raw Points: {dataStats.buyBoxValidationStats.rawBuyBoxPoints}</div>
                  <div>Seller Correlation Rejected: {dataStats.buyBoxValidationStats.sellerCorrelationRejected}</div>
                  <div>Valid Points: {dataStats.buyBoxValidationStats.finalValidPoints}</div>
                </div>
              )}
              {chartData.length > 0 && (
                <div className="flex gap-2 justify-center mt-2">
                  <Button
                    onClick={() => setTimeRange('all')}
                    variant="outline"
                    size="sm"
                  >
                    Show All Time Data
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Seller-Validated Data ({filteredData.length} points)
              </Badge>
              {getDataQualityBadge()}
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
          
          {/* Controls Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Chart Mode Controls */}
            <ToggleGroup value={chartMode} onValueChange={(value) => value && setChartMode(value as any)} type="single">
              <ToggleGroupItem value="price" size="sm">Price History</ToggleGroupItem>
              <ToggleGroupItem value="sales" size="sm">Sales Data</ToggleGroupItem>
              <ToggleGroupItem value="reviews" size="sm">Reviews</ToggleGroupItem>
            </ToggleGroup>
            
            {/* Granularity Control */}
            <div className="flex items-center gap-2">
              <Label htmlFor="granularity" className="text-sm">Data:</Label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Fill Gaps Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="fill-gaps"
                checked={fillGaps}
                onCheckedChange={setFillGaps}
              />
              <Label htmlFor="fill-gaps" className="text-sm">Fill Gaps</Label>
            </div>
            
            {/* Data Stats Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="show-stats"
                checked={showDataStats}
                onCheckedChange={setShowDataStats}
              />
              <Label htmlFor="show-stats" className="text-sm">Show Stats</Label>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Enhanced Data Quality Statistics with Buy Box Validation Results */}
        {showDataStats && dataStats && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Buy Box Seller Correlation Validation Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
              <div>Raw Buy Box: {dataStats.buyBoxValidationStats.rawBuyBoxPoints}</div>
              <div>Correlation Rejected: {dataStats.buyBoxValidationStats.sellerCorrelationRejected}</div>
              <div>Basic Rejected: {dataStats.buyBoxValidationStats.basicValidationRejected}</div>
              <div>Final Valid: {dataStats.buyBoxValidationStats.finalValidPoints}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-800 p-2 rounded">
                <div className="font-medium text-blue-600">Validation Success Rate</div>
                <div>
                  {dataStats.buyBoxValidationStats.rawBuyBoxPoints > 0 
                    ? Math.round((dataStats.buyBoxValidationStats.finalValidPoints / dataStats.buyBoxValidationStats.rawBuyBoxPoints) * 100)
                    : 0}% of raw Buy Box prices validated
                </div>
                <div className="text-green-600">
                  {dataStats.buyBoxValidationStats.sellerCorrelationRejected} phantom prices eliminated
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2 rounded">
                <div className="font-medium text-purple-600">Data Quality Impact</div>
                <div>
                  Before: {dataStats.buyBoxValidationStats.rawBuyBoxPoints} Buy Box points
                </div>
                <div>
                  After: {dataStats.buyBoxValidationStats.finalValidPoints} validated points
                </div>
                <div className="text-red-600">
                  Removed {dataStats.buyBoxValidationStats.sellerCorrelationRejected} unmatched prices
                </div>
              </div>
            </div>
          </div>
        )}

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
                    Buy Box (Validated)
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
                      connectNulls={fillGaps}
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
                      connectNulls={fillGaps}
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
                      connectNulls={fillGaps}
                    />
                  )}
                  {lineVisibility.buyBoxPrice && (
                    <Line 
                      type="monotone" 
                      dataKey="buyBoxPrice" 
                      stroke={COLOR_SCHEME.buyBoxPrice}
                      strokeWidth={2}
                      name="Buy Box Price (Validated)"
                      dot={false}
                      connectNulls={fillGaps}
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
                      connectNulls={fillGaps}
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
                      connectNulls={fillGaps}
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
                      connectNulls={fillGaps}
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
                      connectNulls={fillGaps}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Chart Info */}
        <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredData.length} data points ({granularity} granularity) with seller correlation validation
          {dataStats?.buyBoxValidationStats && (
            <>
              <br />
              <span className="text-green-600">
                Buy Box: {filteredData.filter(d => d.buyBoxPrice !== undefined).length} validated points 
                ({dataStats.buyBoxValidationStats.sellerCorrelationRejected} phantom prices filtered out)
              </span>
              <br />
              <span>Success Rate: {dataStats.buyBoxValidationStats.rawBuyBoxPoints > 0 
                ? Math.round((dataStats.buyBoxValidationStats.finalValidPoints / dataStats.buyBoxValidationStats.rawBuyBoxPoints) * 100) 
                : 0}% of raw Buy Box data validated against seller prices</span>
            </>
          )}
          <br />
          Last updated: {product.last_updated ? new Date(product.last_updated).toLocaleString() : 'Unknown'}
        </div>
      </CardContent>
    </Card>
  );
};
