
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { AmazonProduct } from '@/hooks/useAmazonProduct';

interface KeepaFeeCalculatorProps {
  product: AmazonProduct;
}

export const KeepaFeeCalculator: React.FC<KeepaFeeCalculatorProps> = ({ product }) => {
  const [inputs, setInputs] = useState({
    costPrice: 0,
    salePrice: product.buy_box_price || product.lowest_fba_price || 0,
    fulfillmentType: 'FBA',
    storageMonths: 0
  });

  const [results, setResults] = useState({
    fbaFee: 0,
    referralFee: 0,
    storageFee: 0,
    variableClosingFee: 0,
    totalFees: 0,
    profit: 0,
    roi: 0,
    profitMargin: 0,
    breakevenSalePrice: 0,
    estimatedPayout: 0
  });

  // Update sale price when product data changes
  useEffect(() => {
    const newSalePrice = product.buy_box_price || product.lowest_fba_price || 0;
    setInputs(prev => ({
      ...prev,
      salePrice: newSalePrice
    }));
  }, [product.buy_box_price, product.lowest_fba_price]);

  const calculateResults = () => {
    const { costPrice, salePrice, storageMonths } = inputs;
    const fees = product.fees;

    console.log('Fee Calculation Debug:', {
      productASIN: product.asin,
      rawFees: fees,
      hasFeesObject: !!fees,
      feesKeys: fees ? Object.keys(fees) : 'No fees object'
    });

    if (!fees) {
      console.log('No fee data available from Keepa');
      return;
    }

    // Extract fees with better null checking and debugging
    const fbaFee = fees.pickAndPackFee || 0;
    const referralFee = fees.referralFee || 0;
    const storageFeePerMonth = fees.storageFee || 0;
    const variableClosingFee = fees.variableClosingFee && fees.variableClosingFee > 0 ? fees.variableClosingFee : 0;

    console.log('Individual Fee Debug:', {
      pickAndPackFee: fees.pickAndPackFee,
      referralFee: fees.referralFee,
      storageFee: fees.storageFee,
      variableClosingFee: fees.variableClosingFee,
      processedFBAFee: fbaFee,
      processedReferralFee: referralFee,
      processedStorageFeePerMonth: storageFeePerMonth,
      processedVariableClosingFee: variableClosingFee
    });

    // Calculate total storage fee
    const totalStorageFee = storageFeePerMonth * storageMonths;

    // Calculate totals
    const totalFees = fbaFee + referralFee + totalStorageFee + variableClosingFee;
    const profit = salePrice - costPrice - totalFees;
    const roi = costPrice > 0 ? (profit / costPrice) * 100 : 0;
    const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const breakevenSalePrice = costPrice + totalFees;
    const estimatedPayout = salePrice - totalFees;

    console.log('Calculation Results Debug:', {
      fbaFee,
      referralFee,
      totalStorageFee,
      variableClosingFee,
      totalFees,
      profit,
      roi,
      profitMargin
    });

    setResults({
      fbaFee: Number(fbaFee.toFixed(2)),
      referralFee: Number(referralFee.toFixed(2)),
      storageFee: Number(totalStorageFee.toFixed(2)),
      variableClosingFee: Number(variableClosingFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      roi: Number(roi.toFixed(1)),
      profitMargin: Number(profitMargin.toFixed(1)),
      breakevenSalePrice: Number(breakevenSalePrice.toFixed(2)),
      estimatedPayout: Number(estimatedPayout.toFixed(2))
    });
  };

  useEffect(() => {
    calculateResults();
  }, [inputs, product.fees]);

  const handleInputChange = (field: string, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  if (!product.fees) {
    return (
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            Keepa Fee Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Fee Data Not Available
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Keepa fee data is not available for this product. Try refreshing the product data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            Keepa Fee Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="costPrice">Cost Price ($)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                value={inputs.costPrice}
                onChange={(e) => handleInputChange('costPrice', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="salePrice">Sale Price ($)</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                value={inputs.salePrice}
                onChange={(e) => handleInputChange('salePrice', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="fulfillmentType">Fulfillment Type</Label>
              <Select value={inputs.fulfillmentType} onValueChange={(value) => handleInputChange('fulfillmentType', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FBA">FBA</SelectItem>
                  <SelectItem value="FBM" disabled>FBM (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="storageMonths">Storage (Months)</Label>
              <Input
                id="storageMonths"
                type="number"
                min="0"
                value={inputs.storageMonths}
                onChange={(e) => handleInputChange('storageMonths', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${results.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${results.profit}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Profit</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${results.roi >= 30 ? 'text-green-600' : results.roi >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
              {results.roi}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">ROI</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {results.profitMargin}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Profit Margin</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ${results.totalFees}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Fees</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              ${results.breakevenSalePrice}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Breakeven Sale Price</div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              ${results.estimatedPayout}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Estimated Amz. Payout</div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              ${inputs.costPrice > 0 ? (results.breakevenSalePrice - results.totalFees).toFixed(2) : '0.00'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Max Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Breakdown */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Fee Breakdown (Real Keepa Data)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Debug Info:</strong> FBA Fee: ${results.fbaFee} | Referral Fee: ${results.referralFee} | Storage Fee: ${results.storageFee}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">FBA Fee:</span>
                <span className="font-medium">${results.fbaFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Referral Fee:</span>
                <span className="font-medium">${results.referralFee}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Storage Fee ({inputs.storageMonths} months):</span>
                <span className="font-medium">${results.storageFee}</span>
              </div>
              {results.variableClosingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Variable Closing Fee:</span>
                  <span className="font-medium">${results.variableClosingFee}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="flex items-start gap-2">
              {results.roi >= 30 ? (
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {results.roi >= 30 ? 'Excellent Opportunity!' : results.roi >= 15 ? 'Decent Opportunity' : 'Low Profitability'}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {results.roi >= 30 
                    ? 'This product shows strong profitability with high ROI using real Keepa fee data.'
                    : results.roi >= 15 
                    ? 'This product meets basic profitability thresholds with real fee calculations.'
                    : 'Consider improving costs or finding better pricing to increase profitability.'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
