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

interface BuyBoxSellerEntry {
  timestamp: number;
  sellerId: string;
}

interface SellerOfferData {
  sellerId: string;
  sellerName: string;
  priceHistory: { [timestamp: number]: number };
  condition: string;
  prime: boolean;
}

interface BuyBoxValidationStats {
  totalBuyBoxTimestamps: number;
  sellerIdFound: number;
  sellerInOffers: number;
  priceMatches: number;
  finalValidPoints: number;
  discardedPoints: number;
  sellerBreakdown: {
    [sellerId: string]: {
      sellerName: string;
      pointsContributed: number;
    };
  };
  matchingDetails: Array<{
    timestamp: number;
    sellerId: string;
    sellerName: string;
    buyBoxPrice: number;
    status: 'validated' | 'discarded';
    reason?: string;
  }>;
}

interface DataQualityStats {
  totalRawPoints: number;
  validPoints: number;
  filteredPoints: number;
  buyBoxValidationStats: BuyBoxValidationStats;
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
  amazonPrice: '#FFB366',    // Light orange
  fbaPrice: '#FF6B35',       // Dark orange
  fbmPrice: '#87CEEB',       // Light blue
  buyBoxPrice: '#FF69B4',    // Pink
  salesRank: '#10B981',
  reviewCount: '#8B5CF6',
  rating: '#F59E0B',
  offerCount: '#EF4444'
};

// Keepa epoch: January 1, 2011 00:00:00 UTC
const KEEPA_EPOCH = new Date('2011-01-01T00:00:00.000Z').getTime();

// Enhanced validation functions
const isValidPrice = (price: number): boolean => {
  return typeof price === 'number' && price > 0.01 && price < 10000;
};

// Convert Keepa timestamp to JavaScript timestamp
const keepaTimeToMs = (keepaMinutes: number): number => {
  return KEEPA_EPOCH + (keepaMinutes * 60 * 1000);
};

// Parse Buy Box seller ID history - check multiple possible indices 
const parseBuyBoxSellerIdHistory = (product: AmazonProduct): BuyBoxSellerEntry[] => {
  const history: BuyBoxSellerEntry[] = [];
  
  console.log('=== PARSING BUY BOX SELLER ID HISTORY ===');
  console.log('Available CSV indices:', Object.keys(product.csv || {}));
  
  // Check multiple indices for Buy Box seller ID history
  // Common indices: 4 (buyBoxSellerIdHistory), 6, 7, or even 14, 15
  const possibleIndices = [4, 5, 6, 7, 14, 15];
  let buyBoxSellerCSV: number[] | null = null;
  let usedIndex = -1;
  
  for (const index of possibleIndices) {
    const csvArray = product.csv?.[index];
    console.log(`Checking CSV[${index}]:`, csvArray ? `${csvArray.length} elements` : 'not found');
    
    if (csvArray && Array.isArray(csvArray) && csvArray.length >= 4) {
      // Sample first few entries to check format
      const sampleData = csvArray.slice(0, 10);
      console.log(`Sample data from CSV[${index}]:`, sampleData);
      
      // Check if this looks like seller ID data (alternating timestamp/sellerID pairs)
      let isSellerData = true;
      for (let i = 0; i < Math.min(csvArray.length - 1, 20); i += 2) {
        const timestamp = csvArray[i];
        const sellerId = csvArray[i + 1];
        if (typeof timestamp !== 'number' || typeof sellerId !== 'number') {
          isSellerData = false;
          break;
        }
        // Seller IDs should be reasonable numbers (not too large, not -1)
        if (sellerId < 0 || sellerId > 999999999) {
          isSellerData = false;
          break;
        }
      }
      
      if (isSellerData && csvArray.length >= 4) {
        buyBoxSellerCSV = csvArray;
        usedIndex = index;
        console.log(`✅ Found Buy Box seller history in CSV[${index}]: ${Math.floor(csvArray.length / 2)} potential data points`);
        break;
      }
    }
  }
  
  if (!buyBoxSellerCSV) {
    console.log('❌ No Buy Box seller ID history found in CSV indices:', possibleIndices);
    return history;
  }
  
  // Parse alternating [timestamp, sellerId] format
  for (let i = 0; i < buyBoxSellerCSV.length - 1; i += 2) {
    const timestampMinutes = buyBoxSellerCSV[i];
    const sellerId = buyBoxSellerCSV[i + 1];
    
    if (typeof timestampMinutes === 'number' && typeof sellerId === 'number' && 
        sellerId !== -1 && sellerId > 0 && timestampMinutes > 0) {
      history.push({
        timestamp: timestampMinutes,
        sellerId: sellerId.toString()
      });
    }
  }
  
  // Sort by timestamp
  history.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`Parsed ${history.length} valid Buy Box seller ID entries from CSV[${usedIndex}]`);
  if (history.length > 0) {
    console.log('Sample entries:', history.slice(0, 5));
    console.log('Date range:', {
      first: new Date(keepaTimeToMs(history[0].timestamp)).toISOString(),
      last: new Date(keepaTimeToMs(history[history.length - 1].timestamp)).toISOString()
    });
  }
  return history;
};

// Parse individual seller offer data from product.offers
const parseSellerOffers = (product: AmazonProduct): SellerOfferData[] => {
  const sellerData: SellerOfferData[] = [];
  
  console.log('=== PARSING SELLER OFFERS DATA ===');
  
  if (!product.offers || !Array.isArray(product.offers)) {
    console.log('❌ No product.offers data found');
    return sellerData;
  }
  
  console.log(`Processing ${product.offers.length} seller offers`);
  
  product.offers.forEach((offer: any, index: number) => {
    const sellerId = offer.sellerId || offer.seller_id || `seller_${index}`;
    const sellerName = offer.seller || offer.sellerName || `Seller ${index + 1}`;
    
    console.log(`Processing Seller ${sellerId} (${sellerName})`);
    
    // Parse price history from offerCSV
    const priceHistory: { [timestamp: number]: number } = {};
    
    if (offer.offerCSV && Array.isArray(offer.offerCSV) && offer.offerCSV.length >= 2) {
      console.log(`  Found offerCSV with ${offer.offerCSV.length} elements`);
      
      // Parse alternating [timestamp, price] format
      for (let i = 0; i < offer.offerCSV.length - 1; i += 2) {
        const timestamp = offer.offerCSV[i];
        const rawPrice = offer.offerCSV[i + 1];
        
        if (typeof timestamp === 'number' && typeof rawPrice === 'number' && rawPrice !== -1) {
          // Convert from Keepa price format (divide by 100)
          const price = rawPrice / 100;
          if (isValidPrice(price)) {
            priceHistory[timestamp] = price;
          }
        }
      }
      
      console.log(`  Parsed ${Object.keys(priceHistory).length} valid price points`);
    } else {
      console.log(`  No valid offerCSV found for seller ${sellerId}`);
    }
    
    sellerData.push({
      sellerId,
      sellerName,
      priceHistory,
      condition: offer.condition || 'Unknown',
      prime: offer.prime || false
    });
  });
  
  console.log(`Total sellers processed: ${sellerData.length}`);
  return sellerData;
};

// Find seller ID at specific timestamp (with tolerance) - this function not needed with new approach
const findSellerAtTimestamp = (
  timestamp: number,
  buyBoxHistory: BuyBoxSellerEntry[],
  toleranceMinutes: number = 30
): string | null => {
  
  // Find the most recent seller change before or at the timestamp
  let bestMatch: BuyBoxSellerEntry | null = null;
  let bestTimeDiff = Infinity;
  
  for (const entry of buyBoxHistory) {
    const timeDiff = Math.abs(entry.timestamp - timestamp);
    
    // Must be within tolerance and closer than previous matches
    if (timeDiff <= toleranceMinutes && timeDiff < bestTimeDiff) {
      bestMatch = entry;
      bestTimeDiff = timeDiff;
    }
  }
  
  return bestMatch ? bestMatch.sellerId : null;
};

// Find seller's price at specific timestamp (with tolerance)
const findSellerPriceAtTimestamp = (
  timestamp: number,
  sellerId: string,
  sellerOffers: SellerOfferData[],
  toleranceMinutes: number = 60 // Increased default tolerance
): number | null => {
  
  const seller = sellerOffers.find(s => s.sellerId === sellerId);
  if (!seller || !seller.priceHistory) {
    return null;
  }
  
  // Find exact match first
  if (seller.priceHistory[timestamp]) {
    return seller.priceHistory[timestamp];
  }
  
  // Find closest price match within tolerance
  let bestPrice: number | null = null;
  let bestTimeDiff = Infinity;
  
  Object.entries(seller.priceHistory).forEach(([priceTimestamp, price]) => {
    const timeDiff = Math.abs(Number(priceTimestamp) - timestamp);
    
    if (timeDiff <= toleranceMinutes && timeDiff < bestTimeDiff) {
      bestPrice = price;
      bestTimeDiff = timeDiff;
    }
  });
  
  return bestPrice;
};

// NEW: Parse Buy Box data from CSV[10] (BUY_BOX_SHIPPING)
const parseBuyBoxShippingData = (product: AmazonProduct): { series: ParsedSeries; stats: BuyBoxValidationStats } => {
  console.log('=== PARSING BUY BOX SHIPPING DATA (CSV[10]) ===');
  
  const buyBoxSeries: ParsedSeries = {};
  const stats: BuyBoxValidationStats = {
    totalBuyBoxTimestamps: 0,
    sellerIdFound: 0,
    sellerInOffers: 0,
    priceMatches: 0,
    finalValidPoints: 0,
    discardedPoints: 0,
    sellerBreakdown: {},
    matchingDetails: []
  };

  const csvArray = product.csv?.[10]; // BUY_BOX_SHIPPING
  if (!csvArray || !Array.isArray(csvArray) || csvArray.length < 2) {
    console.log('❌ No BUY_BOX_SHIPPING data found in CSV[10]');
    return { series: buyBoxSeries, stats };
  }

  console.log(`Processing ${Math.floor(csvArray.length / 2)} Buy Box shipping data points from CSV[10]`);
  stats.totalBuyBoxTimestamps = Math.floor(csvArray.length / 2);

  // Keepa epoch: January 1, 2011 00:00:00 UTC in seconds
  const KEEPA_EPOCH_SECONDS = 1293840000;

  // Parse alternating [minutesSinceStart, priceInCents] format
  for (let i = 0; i < csvArray.length - 1; i += 2) {
    const minutesSinceStart = csvArray[i];
    const priceInCents = csvArray[i + 1];
    
    if (typeof minutesSinceStart !== 'number' || typeof priceInCents !== 'number') {
      stats.discardedPoints++;
      continue;
    }
    
    // Skip Keepa's -1 placeholder values
    if (priceInCents === -1 || minutesSinceStart === -1) {
      stats.discardedPoints++;
      continue;
    }
    
    // Convert timestamp: (1293840000 + minutesSinceStart * 60) * 1000
    const timestampSeconds = KEEPA_EPOCH_SECONDS + (minutesSinceStart * 60);
    const timestampMs = timestampSeconds * 1000;
    
    // Convert to Keepa minutes format for consistency with other data
    const keepaMinutes = (timestampMs - KEEPA_EPOCH) / (60 * 1000);
    
    // Convert price from cents to dollars
    const priceInDollars = priceInCents / 100;
    
    // Validate price
    if (isValidPrice(priceInDollars)) {
      buyBoxSeries[keepaMinutes] = priceInDollars;
      stats.finalValidPoints++;
      stats.priceMatches++;
    } else {
      stats.discardedPoints++;
    }
  }
  
  console.log(`✅ Parsed ${stats.finalValidPoints} valid Buy Box shipping data points`);
  console.log(`Success Rate: ${stats.totalBuyBoxTimestamps > 0 ? Math.round((stats.finalValidPoints / stats.totalBuyBoxTimestamps) * 100) : 0}%`);
  
  return { series: buyBoxSeries, stats };
};

// LEGACY: Reconstruct Buy Box data using seller-backed validation (disabled for now)
const reconstructValidatedBuyBoxData = (
  buyBoxSellerHistory: BuyBoxSellerEntry[],
  sellerOffers: SellerOfferData[]
): { series: ParsedSeries; stats: BuyBoxValidationStats } => {
  
  console.log('=== SELLER-BACKED VALIDATION (CURRENTLY DISABLED) ===');
  
  const validatedBuyBox: ParsedSeries = {};
  const stats: BuyBoxValidationStats = {
    totalBuyBoxTimestamps: 0,
    sellerIdFound: 0,
    sellerInOffers: 0,
    priceMatches: 0,
    finalValidPoints: 0,
    discardedPoints: 0,
    sellerBreakdown: {},
    matchingDetails: []
  };
  
  // Currently disabled - return empty results
  console.log('Seller validation logic preserved but disabled in favor of CSV[10] data');
  return { series: validatedBuyBox, stats };
};

// Enhanced CSV parsing with forward-filling support
const parseCsvSeriesWithForwardFill = (csvArray: number[], seriesType: string): { series: ParsedSeries; stats: { rawCount: number; validCount: number; filteredCount: number; filterReasons: string[] } } => {
  const series: ParsedSeries = {};
  const stats = { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] as string[] };
  
  if (!Array.isArray(csvArray) || csvArray.length < 2) {
    console.log(`${seriesType}: No data or invalid array`);
    return { series, stats };
  }
  
  stats.rawCount = Math.floor(csvArray.length / 2);
  console.log(`${seriesType}: Processing ${stats.rawCount} raw data points`);
  
  // Parse alternating [timestamp, value] format
  const parsedPoints: Array<{ timestamp: number; value: number }> = [];
  
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
    if (['amazon', 'fba', 'fbm'].includes(seriesType)) {
      processedValue = rawValue / 100;
    } else if (seriesType === 'rating') {
      processedValue = rawValue / 10;
    }
    
    // Apply validation based on series type
    let isValid = false;
    if (['amazon', 'fba', 'fbm'].includes(seriesType)) {
      isValid = processedValue > 0.01 && processedValue < 50000;
    } else {
      isValid = processedValue >= 0;
    }
    
    if (isValid) {
      parsedPoints.push({ timestamp: timestampMinutes, value: processedValue });
      stats.validCount++;
    } else {
      stats.filteredCount++;
      stats.filterReasons.push(`Invalid ${seriesType} value: ${processedValue}`);
    }
  }
  
  // Sort points by timestamp
  parsedPoints.sort((a, b) => a.timestamp - b.timestamp);
  
  // For FBA series, implement forward-filling
  if (seriesType === 'fba' && parsedPoints.length > 0) {
    console.log(`${seriesType}: Implementing forward-filling for continuity`);
    
    // Create continuous timeline with forward-filled values
    const minTimestamp = parsedPoints[0].timestamp;
    const maxTimestamp = parsedPoints[parsedPoints.length - 1].timestamp;
    
    let lastKnownValue = parsedPoints[0].value;
    let currentPointIndex = 0;
    
    // Fill in gaps with forward-filled values (every 60 minutes for reasonable density)
    for (let timestamp = minTimestamp; timestamp <= maxTimestamp; timestamp += 60) {
      // Check if we have a real data point at this timestamp
      while (currentPointIndex < parsedPoints.length && parsedPoints[currentPointIndex].timestamp <= timestamp) {
        if (parsedPoints[currentPointIndex].timestamp === timestamp) {
          lastKnownValue = parsedPoints[currentPointIndex].value;
          series[timestamp] = lastKnownValue;
        } else if (parsedPoints[currentPointIndex].timestamp < timestamp) {
          lastKnownValue = parsedPoints[currentPointIndex].value;
        }
        currentPointIndex++;
      }
      
      // If no exact match, use forward-filled value
      if (!series[timestamp] && lastKnownValue) {
        series[timestamp] = lastKnownValue;
      }
    }
    
    console.log(`${seriesType}: Created ${Object.keys(series).length} data points with forward-filling`);
  } else {
    // For non-FBA series, use original logic
    parsedPoints.forEach(point => {
      series[point.timestamp] = point.value;
    });
  }
  
  return { series, stats };
};

// Legacy CSV parsing function (for non-FBA series)
const parseCsvSeries = (csvArray: number[], seriesType: string): { series: ParsedSeries; stats: { rawCount: number; validCount: number; filteredCount: number; filterReasons: string[] } } => {
  if (seriesType === 'fba') {
    return parseCsvSeriesWithForwardFill(csvArray, seriesType);
  }
  
  const series: ParsedSeries = {};
  const stats = { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] as string[] };
  
  if (!Array.isArray(csvArray) || csvArray.length < 2) {
    console.log(`${seriesType}: No data or invalid array`);
    return { series, stats };
  }
  
  stats.rawCount = Math.floor(csvArray.length / 2);
  console.log(`${seriesType}: Processing ${stats.rawCount} raw data points`);
  
  // Parse alternating [timestamp, value] format
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
    if (['amazon', 'fba', 'fbm'].includes(seriesType)) {
      processedValue = rawValue / 100;
    } else if (seriesType === 'rating') {
      processedValue = rawValue / 10;
    }
    
    // Apply validation based on series type
    let isValid = false;
    if (['amazon', 'fba', 'fbm'].includes(seriesType)) {
      isValid = processedValue > 0.01 && processedValue < 50000;
    } else {
      isValid = processedValue >= 0;
    }
    
    if (isValid) {
      series[timestampMinutes] = processedValue;
      stats.validCount++;
    } else {
      stats.filteredCount++;
      stats.filterReasons.push(`Invalid ${seriesType} value: ${processedValue}`);
    }
  }
  
  return { series, stats };
};

// Enhanced merge function with validated Buy Box data
const mergeSeriesWithValidatedBuyBox = (
  seriesData: { [key: string]: ParsedSeries }, 
  offerCountSeries: ParsedSeries, 
  validatedBuyBoxSeries: ParsedSeries,
  buyBoxStats: BuyBoxValidationStats
): { data: ChartDataPoint[]; stats: DataQualityStats } => {
  const allTimestamps = new Set<number>();
  
  Object.values(seriesData).forEach(series => {
    Object.keys(series).forEach(timestamp => {
      allTimestamps.add(Number(timestamp));
    });
  });
  
  Object.keys(offerCountSeries).forEach(timestamp => {
    allTimestamps.add(Number(timestamp));
  });
  
  Object.keys(validatedBuyBoxSeries).forEach(timestamp => {
    allTimestamps.add(Number(timestamp));
  });
  
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
  
  const stats: DataQualityStats = {
    totalRawPoints: sortedTimestamps.length,
    validPoints: 0,
    filteredPoints: 0,
    buyBoxValidationStats: buyBoxStats,
    seriesStats: {
      amazon: { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] },
      fba: { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] },
      fbm: { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] },
      salesRank: { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] },
      offerCount: { rawCount: 0, validCount: 0, filteredCount: 0, filterReasons: [] }
    }
  };
  
  console.log(`=== MERGING DATA WITH VALIDATED BUY BOX ===`);
  console.log(`Processing ${sortedTimestamps.length} timestamps`);
  
  // Create merged data points
  const dataPoints: ChartDataPoint[] = sortedTimestamps.map(keepaTimestamp => {
    const timestampMs = keepaTimeToMs(keepaTimestamp);
    const date = new Date(timestampMs);
    
    // Extract values for this timestamp from each series
    const amazonPrice = seriesData.amazon?.[keepaTimestamp];
    const fbaPrice = seriesData.fba?.[keepaTimestamp];
    const fbmPrice = seriesData.fbm?.[keepaTimestamp];
    const buyBoxPrice = validatedBuyBoxSeries[keepaTimestamp]; // Use validated data
    const salesRank = seriesData.salesRank?.[keepaTimestamp];
    const offerCount = offerCountSeries[keepaTimestamp];
    const rating = seriesData.rating?.[keepaTimestamp];
    const reviewCount = seriesData.reviewCount?.[keepaTimestamp];
    
    if (buyBoxPrice !== undefined || fbaPrice !== undefined) {
      stats.validPoints++;
    }
    
    return {
      timestamp: date.toISOString(),
      timestampMs,
      formattedDate: date.toLocaleDateString(),
      amazonPrice: amazonPrice && isValidPrice(amazonPrice) ? amazonPrice : undefined,
      fbaPrice: fbaPrice && isValidPrice(fbaPrice) ? fbaPrice : undefined,
      fbmPrice: fbmPrice && isValidPrice(fbmPrice) ? fbmPrice : undefined,
      buyBoxPrice: buyBoxPrice && isValidPrice(buyBoxPrice) ? buyBoxPrice : undefined,
      salesRank: salesRank || undefined,
      offerCount: offerCount || undefined,
      rating: rating || undefined,
      reviewCount: reviewCount || undefined
    };
  });
  
  // Log FBA data statistics
  const fbaDataPoints = dataPoints.filter(d => d.fbaPrice !== undefined);
  console.log('=== NEW_FBA (CSV[16]) RESULTS ===');
  console.log(`FBA Data Points Plotted: ${fbaDataPoints.length}`);
  console.log(`FBA Data Coverage: ${fbaDataPoints.length > 0 ? 
    `${new Date(fbaDataPoints[0].timestampMs).toLocaleDateString()} to ${new Date(fbaDataPoints[fbaDataPoints.length - 1].timestampMs).toLocaleDateString()}` : 
    'No data'}`);
  
  return { data: dataPoints, stats };
};

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
    salesRank: last(validPrices('salesRank')),
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

  // Parse Keepa CSV data with NEW_FBA series
  const { chartData, dataStats } = useMemo(() => {
    console.log('=== PROCESSING CHART DATA WITH NEW_FBA (CSV[16]) ===');
    console.log('Product ASIN:', product.asin);
    console.log('Product CSV structure:', Object.keys(product.csv || {}));
    
    if (!product.csv || typeof product.csv !== 'object') {
      console.log('ERROR: No CSV data found or invalid format');
      return { chartData: [], dataStats: null };
    }

    // Parse each CSV series separately - UPDATED FBA to use CSV[16]
    const seriesData: { [key: string]: ParsedSeries } = {};
    let offerCountSeries: ParsedSeries = {};
    
    // Map Keepa CSV indices to our data fields
    const csvMapping = {
      amazon: 0,        // Amazon price
      salesRank: 4,     // Sales rank
      offerCount: 5,    // Offer count
      fba: 16,          // NEW_FBA price (UPDATED to use CSV[16])
      fbm: 18,          // FBM price (NEW_FBM)
      rating: 44,       // Rating
      reviewCount: 45   // Review count
    };
    
    // Parse each available series
    Object.entries(csvMapping).forEach(([fieldName, csvIndex]) => {
      const csvArray = product.csv[csvIndex];
      if (csvArray && Array.isArray(csvArray) && csvArray.length > 0) {
        console.log(`=== PARSING ${fieldName.toUpperCase()} (CSV[${csvIndex}]) ===`);
        const { series, stats } = parseCsvSeries(csvArray, fieldName);
        if (fieldName === 'offerCount') {
          offerCountSeries = series;
        } else {
          seriesData[fieldName] = series;
        }
        console.log(`${fieldName} final result:`, Object.keys(series).length, 'data points');
        
        // Special logging for FBA data
        if (fieldName === 'fba') {
          console.log(`✅ NEW_FBA (CSV[16]) Successfully Parsed: ${Object.keys(series).length} valid data points`);
          console.log('FBA Statistics:', stats);
        }
      }
    });
    
    // Use Buy Box shipping data from CSV[10]
    console.log('=== PARSING BUY BOX SHIPPING DATA FROM CSV[10] ===');
    const { series: buyBoxSeries, stats: buyBoxStats } = parseBuyBoxShippingData(product);
    
    // Merge all series with Buy Box shipping data
    console.log('=== MERGING SERIES DATA WITH BUY BOX SHIPPING ===');
    const { data: mergedData, stats } = mergeSeriesWithValidatedBuyBox(
      seriesData, 
      offerCountSeries,
      buyBoxSeries,
      buyBoxStats
    );
    
    if (mergedData.length === 0) {
      console.log('ERROR: No merged data points created');
      return { chartData: [], dataStats: null };
    }
    
    // Sort data chronologically
    let filteredData = mergedData.sort((a, b) => a.timestampMs - b.timestampMs);
    
    console.log('=== FINAL RESULTS WITH NEW_FBA (CSV[16]) ===');
    console.log('Total processed data points:', filteredData.length);
    console.log('NEW_FBA data points:', filteredData.filter(d => d.fbaPrice !== undefined).length);
    console.log('Buy Box shipping data points:', filteredData.filter(d => d.buyBoxPrice !== undefined).length);
    console.log('Date range:', {
      first: filteredData[0]?.timestamp,
      last: filteredData[filteredData.length - 1]?.timestamp
    });
    
    return { chartData: filteredData, dataStats: stats };
  }, [product.csv, product.asin]);

  const aggregatedData = useMemo(() => {
    return aggregateData(chartData, granularity);
  }, [chartData, granularity]);

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
            {new Date(label).toLocaleDateString()} {new Date(label).toLocaleTimeString()}
          </p>
          {payload.map((entry: any, index: number) => {
            // Update FBA tooltip label
            let displayName = entry.name;
            if (entry.name === 'FBA Price') {
              displayName = 'FBA Price (Shipping Included)';
            }
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {displayName}: {entry.name.includes('Price') ? `$${entry.value?.toFixed(2)}` : entry.value?.toLocaleString()}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Generate enhanced data quality badge with validation stats
  const getDataQualityBadge = () => {
    if (!dataStats) return null;
    
    const validationSuccessRate = dataStats.buyBoxValidationStats.totalBuyBoxTimestamps > 0 
      ? dataStats.buyBoxValidationStats.finalValidPoints / dataStats.buyBoxValidationStats.totalBuyBoxTimestamps 
      : 0;
    
    const qualityColor = validationSuccessRate > 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                         validationSuccessRate > 0.5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                         'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    
    return (
      <Badge variant="secondary" className={qualityColor}>
        Buy Box: {Math.round(validationSuccessRate * 100)}% Validated
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
                  <div>Total Timestamps: {dataStats.buyBoxValidationStats.totalBuyBoxTimestamps}</div>
                  <div>Seller ID Found: {dataStats.buyBoxValidationStats.sellerIdFound}</div>
                  <div>Seller In Offers: {dataStats.buyBoxValidationStats.sellerInOffers}</div>
                  <div>Price Matches: {dataStats.buyBoxValidationStats.priceMatches}</div>
                  <div>Validated: {dataStats.buyBoxValidationStats.finalValidPoints}</div>
                  <div>Discarded: {dataStats.buyBoxValidationStats.discardedPoints}</div>
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
                NEW_FBA Series ({filteredData.filter(d => d.fbaPrice !== undefined).length} FBA points)
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
          
          <div className="flex items-center gap-4 flex-wrap">
            <ToggleGroup value={chartMode} onValueChange={(value) => value && setChartMode(value as any)} type="single">
              <ToggleGroupItem value="price" size="sm">Price History</ToggleGroupItem>
              <ToggleGroupItem value="sales" size="sm">Sales Data</ToggleGroupItem>
              <ToggleGroupItem value="reviews" size="sm">Reviews</ToggleGroupItem>
            </ToggleGroup>
            
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
            
            <div className="flex items-center space-x-2">
              <Switch
                id="fill-gaps"
                checked={fillGaps}
                onCheckedChange={setFillGaps}
              />
              <Label htmlFor="fill-gaps" className="text-sm">Fill Gaps</Label>
            </div>
            
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
        {/* Enhanced Data Quality Statistics with Validation Results */}
        {showDataStats && dataStats && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Buy Box Validation Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs mb-3">
              <div>Total Timestamps: {dataStats.buyBoxValidationStats.totalBuyBoxTimestamps}</div>
              <div>Seller ID Found: {dataStats.buyBoxValidationStats.sellerIdFound}</div>
              <div>Seller In Offers: {dataStats.buyBoxValidationStats.sellerInOffers}</div>
              <div>Price Matches: {dataStats.buyBoxValidationStats.priceMatches}</div>
              <div>Validated: {dataStats.buyBoxValidationStats.finalValidPoints}</div>
              <div>Discarded: {dataStats.buyBoxValidationStats.discardedPoints}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-800 p-2 rounded">
                <div className="font-medium text-blue-600">Validation Success</div>
                <div>
                  {dataStats.buyBoxValidationStats.totalBuyBoxTimestamps > 0 
                    ? Math.round((dataStats.buyBoxValidationStats.finalValidPoints / dataStats.buyBoxValidationStats.totalBuyBoxTimestamps) * 100)
                    : 0}% of timestamps successfully validated
                </div>
                <div className="text-green-600">
                  {dataStats.buyBoxValidationStats.finalValidPoints} seller-backed Buy Box points created
                </div>
                <div className="text-red-600">
                  {dataStats.buyBoxValidationStats.discardedPoints} phantom points discarded
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2 rounded">
                <div className="font-medium text-purple-600">Seller Contributions</div>
                {Object.entries(dataStats.buyBoxValidationStats.sellerBreakdown).slice(0, 3).map(([sellerId, data]) => (
                  <div key={sellerId} className="text-xs">
                    {data.sellerName}: {data.pointsContributed} points
                  </div>
                ))}
                {Object.keys(dataStats.buyBoxValidationStats.sellerBreakdown).length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{Object.keys(dataStats.buyBoxValidationStats.sellerBreakdown).length - 3} more sellers
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                    FBA (Shipping Included)
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
                     Buy Box (Shipping Included)
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
                      type="stepAfter" 
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
                      type="stepAfter" 
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
                      type="stepAfter" 
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
                      type="stepAfter" 
                      dataKey="buyBoxPrice" 
                      stroke={COLOR_SCHEME.buyBoxPrice}
                      strokeWidth={3}
                      name="Buy Box (Shipping Included)"
                      dot={false}
                      connectNulls={fillGaps}
                    />
                  )}
                </>
              )}
              
              {chartMode === 'sales' && (
                <>
                  {lineVisibility.salesRank && (
                    <Line 
                      type="stepAfter" 
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
                      type="stepAfter" 
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
              
              {chartMode === 'reviews' && (
                <>
                  {lineVisibility.reviewCount && (
                    <Line 
                      type="stepAfter" 
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
                      type="stepAfter" 
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
          Showing {filteredData.length} data points ({granularity} granularity) with NEW_FBA series (CSV[16])
          {dataStats && (
            <>
              <br />
              <span className="text-blue-600">
                FBA (NEW_FBA): {filteredData.filter(d => d.fbaPrice !== undefined).length} data points with forward-filling
              </span>
              <br />
              <span className="text-green-600">
                Buy Box: {filteredData.filter(d => d.buyBoxPrice !== undefined).length} seller-validated points 
                (from {Object.keys(dataStats.buyBoxValidationStats.sellerBreakdown).length} different sellers)
              </span>
            </>
          )}
          <br />
          Last updated: {product.last_updated ? new Date(product.last_updated).toLocaleString() : 'Unknown'}
        </div>
      </CardContent>
    </Card>
  );
};
