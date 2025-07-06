
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface ProfitabilityCalculatorProps {
  initialData?: {
    sellPrice?: number;
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
  };
  onCalculation?: (results: any) => void;
}

export const ProfitabilityCalculator: React.FC<ProfitabilityCalculatorProps> = ({ 
  initialData,
  onCalculation 
}) => {
  const [inputs, setInputs] = useState({
    sellPrice: initialData?.sellPrice || 29.99,
    productCost: 15.00,
    shippingToAmazon: 2.50,
    prepCost: 0.50,
    multipacks: 1,
    weight: initialData?.weight || 0.5,
    length: initialData?.dimensions?.length || 6,
    width: initialData?.dimensions?.width || 4,
    height: initialData?.dimensions?.height || 2,
    taxRate: 0.08,
    customFees: 0
  });

  const [results, setResults] = useState({
    fbaFee: 0,
    referralFee: 0,
    storageFee: 0,
    totalFees: 0,
    totalCosts: 0,
    netProfit: 0,
    roi: 0,
    margin: 0,
    breakeven: 0,
    profitPerUnit: 0
  });

  const calculateFees = () => {
    const { sellPrice, productCost, shippingToAmazon, prepCost, multipacks, weight, length, width, height, taxRate, customFees } = inputs;

    // Calculate dimensional weight
    const dimensionalWeight = (length * width * height) / 166;
    const billableWeight = Math.max(weight, dimensionalWeight);

    // FBA fulfillment fee calculation (simplified)
    let fbaFee = 2.50; // Base fee for standard size
    if (billableWeight > 1) {
      fbaFee += (billableWeight - 1) * 0.40;
    }
    
    // Add dimensional fee if oversized
    if (length > 12 || width > 9 || height > 2) {
      fbaFee += 2.00; // Oversize fee
    }

    // Referral fee (category dependent - using 8% as default)
    const referralFee = sellPrice * 0.08;

    // Monthly storage fee (estimated)
    const volume = (length * width * height) / 1728; // cubic feet
    const storageFee = volume * 0.83; // $0.83 per cubic foot per month

    // Calculate per unit costs
    const costPerUnit = productCost / multipacks;
    const shippingPerUnit = shippingToAmazon / multipacks;
    const prepPerUnit = prepCost / multipacks;
    const taxPerUnit = (costPerUnit + shippingPerUnit) * taxRate;

    const totalFees = fbaFee + referralFee + storageFee + customFees;
    const totalCosts = costPerUnit + shippingPerUnit + prepPerUnit + taxPerUnit + totalFees;
    const netProfit = sellPrice - totalCosts;
    const roi = ((netProfit / (costPerUnit + shippingPerUnit + prepPerUnit)) * 100);
    const margin = (netProfit / sellPrice) * 100;
    const breakeven = totalCosts;

    const calculatedResults = {
      fbaFee: Number(fbaFee.toFixed(2)),
      referralFee: Number(referralFee.toFixed(2)),
      storageFee: Number(storageFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      totalCosts: Number(totalCosts.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roi: Number(roi.toFixed(1)),
      margin: Number(margin.toFixed(1)),
      breakeven: Number(breakeven.toFixed(2)),
      profitPerUnit: Number(netProfit.toFixed(2))
    };

    setResults(calculatedResults);
    
    if (onCalculation) {
      onCalculation(calculatedResults);
    }
  };

  useEffect(() => {
    calculateFees();
  }, [inputs]);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            Advanced Profitability Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pricing Inputs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Pricing</h3>
              
              <div>
                <Label htmlFor="sellPrice">Selling Price ($)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  value={inputs.sellPrice}
                  onChange={(e) => handleInputChange('sellPrice', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="productCost">Product Cost ($)</Label>
                <Input
                  id="productCost"
                  type="number"
                  step="0.01"
                  value={inputs.productCost}
                  onChange={(e) => handleInputChange('productCost', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="multipacks">Units per Pack</Label>
                <Input
                  id="multipacks"
                  type="number"
                  min="1"
                  value={inputs.multipacks}
                  onChange={(e) => handleInputChange('multipacks', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Shipping & Prep */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Shipping & Prep</h3>
              
              <div>
                <Label htmlFor="shippingToAmazon">Shipping to Amazon ($)</Label>
                <Input
                  id="shippingToAmazon"
                  type="number"
                  step="0.01"
                  value={inputs.shippingToAmazon}
                  onChange={(e) => handleInputChange('shippingToAmazon', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="prepCost">Prep Cost ($)</Label>
                <Input
                  id="prepCost"
                  type="number"
                  step="0.01"
                  value={inputs.prepCost}
                  onChange={(e) => handleInputChange('prepCost', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={inputs.taxRate}
                  onChange={(e) => handleInputChange('taxRate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Dimensions & Weight */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Dimensions & Weight</h3>
              
              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={inputs.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="length">L (in)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={inputs.length}
                    onChange={(e) => handleInputChange('length', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="width">W (in)</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={inputs.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="height">H (in)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={inputs.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customFees">Custom Fees ($)</Label>
                <Input
                  id="customFees"
                  type="number"
                  step="0.01"
                  value={inputs.customFees}
                  onChange={(e) => handleInputChange('customFees', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Profitability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${results.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${results.netProfit}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Net Profit</div>
            </div>
            
            <div className="text-center">
              <div className={`text-3xl font-bold ${results.roi >= 30 ? 'text-green-600' : results.roi >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                {results.roi}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">ROI</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {results.margin}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Margin</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                ${results.breakeven}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Breakeven</div>
            </div>
          </div>
          
          {/* Detailed Breakdown */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Selling Price:</span>
                  <span className="font-medium">${inputs.sellPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Product Cost:</span>
                  <span className="font-medium text-red-600">-${(inputs.productCost / inputs.multipacks).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Shipping Cost:</span>
                  <span className="font-medium text-red-600">-${(inputs.shippingToAmazon / inputs.multipacks).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Prep Cost:</span>
                  <span className="font-medium text-red-600">-${(inputs.prepCost / inputs.multipacks).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">FBA Fee:</span>
                  <span className="font-medium text-red-600">-${results.fbaFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Referral Fee:</span>
                  <span className="font-medium text-red-600">-${results.referralFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Storage Fee:</span>
                  <span className="font-medium text-red-600">-${results.storageFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Tax:</span>
                  <span className="font-medium text-red-600">-${((inputs.productCost + inputs.shippingToAmazon) * inputs.taxRate / inputs.multipacks).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
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
                      ? 'This product shows strong profitability with high ROI.'
                      : results.roi >= 15 
                      ? 'This product meets basic profitability thresholds.'
                      : 'Consider improving costs or finding better pricing to increase profitability.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
