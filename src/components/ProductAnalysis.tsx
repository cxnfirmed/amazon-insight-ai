
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Brain, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { FBACalculator } from '@/components/FBACalculator';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { AIDecisionScore } from '@/components/AIDecisionScore';
import { ProductInfo } from '@/components/ProductInfo';
import { AmazonProduct } from '@/hooks/useAmazonProduct';

interface ProductAnalysisProps {
  product: AmazonProduct;
  onBack: () => void;
}

export const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ product, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'calculator', label: 'FBA Calculator', icon: DollarSign },
    { id: 'ai-insights', label: 'AI Insights', icon: Brain },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Product Analysis - {product.asin}
        </h1>
      </div>

      <ProductInfo product={product} />

      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <PriceHistoryChart product={product} />
              <AIDecisionScore productId={product.asin} />
            </div>
          )}
          
          {activeTab === 'calculator' && (
            <FBACalculator productId={product.asin} />
          )}
          
          {activeTab === 'ai-insights' && (
            <AIDecisionScore productId={product.asin} detailed />
          )}
          
          {activeTab === 'alerts' && (
            <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400">
                  Configure price alerts, inventory notifications, and competitive intelligence alerts.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <AIDecisionScore productId={product.asin} compact />
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                Add to Watchlist
              </Button>
              <Button className="w-full" variant="outline">
                Set Price Alert
              </Button>
              <Button className="w-full" variant="outline">
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
