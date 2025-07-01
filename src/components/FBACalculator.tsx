
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign } from 'lucide-react';

interface FBACalculatorProps {
  productId: string;
}

export const FBACalculator: React.FC<FBACalculatorProps> = ({ productId }) => {
  const [calculations, setCalculations] = useState({
    sellingPrice: 49.99,
    productCost: 25.00,
    shippingCost: 3.50,
    prepCost: 0.50,
    category: 'electronics',
    weight: 0.7,
    dimensions: { length: 3.9, width: 3.9, height: 3.5 }
  });

  const [results, setResults] = useState({
    fbaFee: 0,
    referralFee: 0,
    totalFees: 0,
    netProfit: 0,
    roi: 0,
    margin: 0
  });

  const calculateFees = () => {
    const { sellingPrice, productCost, shippingCost, prepCost, weight } = calculations;
    
    // Simplified FBA fee calculation
    const referralFeeRate = calculations.category === 'electronics' ? 0.08 : 0.15;
    const referralFee = sellingPrice * referralFeeRate;
    
    // Simplified FBA fulfillment fee based on weight
    let fbaFee = 2.50; // Base fee
    if (weight > 1) fbaFee += (weight - 1) * 0.40;
    
    const totalCosts = productCost + shippingCost + prepCost + fbaFee + referralFee;
    const netProfit = sellingPrice - totalCosts;
    const roi = ((netProfit / (productCost + shippingCost + prepCost)) * 100);
    const margin = (netProfit / sellingPrice) * 100;

    setResults({
      fbaFee: Number(fbaFee.toFixed(2)),
      referralFee: Number(referralFee.toFixed(2)),
      totalFees: Number((fbaFee + referralFee).toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roi: Number(roi.toFixed(1)),
      margin: Number(margin.toFixed(1))
    });
  };

  useEffect(() => {
    calculateFees();
  }, [calculations]);

  const handleInputChange = (field: string, value: string | number) => {
    setCalculations(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            FBA Profitability Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sellingPrice">Selling Price ($)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  value={calculations.sellingPrice}
                  onChange={(e) => handleInputChange('sellingPrice', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="productCost">Product Cost ($)</Label>
                <Input
                  id="productCost"
                  type="number"
                  step="0.01"
                  value={calculations.productCost}
                  onChange={(e) => handleInputChange('productCost', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="shippingCost">Shipping to Amazon ($)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  value={calculations.shippingCost}
                  onChange={(e) => handleInputChange('shippingCost', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="prepCost">Prep Cost ($)</Label>
                <Input
                  id="prepCost"
                  type="number"
                  step="0.01"
                  value={calculations.prepCost}
                  onChange={(e) => handleInputChange('prepCost', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Product Category</Label>
                <Select value={calculations.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="home">Home & Kitchen</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="toys">Toys & Games</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={calculations.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="length">Length (in)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={calculations.dimensions.length}
                    onChange={(e) => setCalculations(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, length: parseFloat(e.target.value) || 0 }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (in)</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={calculations.dimensions.width}
                    onChange={(e) => setCalculations(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, width: parseFloat(e.target.value) || 0 }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (in)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={calculations.dimensions.height}
                    onChange={(e) => setCalculations(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, height: parseFloat(e.target.value) || 0 }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Profitability Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${results.netProfit}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Net Profit</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${results.roi >= 30 ? 'text-green-600' : results.roi >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                {results.roi}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">ROI</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {results.margin}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Margin</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${results.totalFees}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Fees</div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Selling Price:</span>
                <span className="font-medium">${calculations.sellingPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Product Cost:</span>
                <span className="font-medium">-${calculations.productCost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Referral Fee:</span>
                <span className="font-medium">-${results.referralFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">FBA Fee:</span>
                <span className="font-medium">-${results.fbaFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Shipping Cost:</span>
                <span className="font-medium">-${calculations.shippingCost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Prep Cost:</span>
                <span className="font-medium">-${calculations.prepCost}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
