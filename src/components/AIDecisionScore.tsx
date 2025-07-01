
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, Clock, Target } from 'lucide-react';

interface AIDecisionScoreProps {
  productId: string;
  detailed?: boolean;
  compact?: boolean;
}

export const AIDecisionScore: React.FC<AIDecisionScoreProps> = ({ productId, detailed = false, compact = false }) => {
  // Mock AI analysis - in real app this would come from AI service
  const analysis = {
    buyScore: 78,
    riskLevel: 'Medium',
    timeToSell: '14-21 days',
    amazonRisk: 25,
    ipRisk: 10,
    competitionLevel: 'High',
    demandTrend: 'Stable',
    insights: [
      'Strong sales velocity with consistent demand',
      'Amazon in stock 70% of the time - moderate competition risk',
      'Brand gating risk is low for this category',
      'Price has been stable with minimal volatility',
      'Good profit margins available at current costs'
    ],
    factors: [
      { name: 'Sales Velocity', score: 85, weight: 'High' },
      { name: 'Competition', score: 60, weight: 'High' },
      { name: 'Profit Margin', score: 75, weight: 'Medium' },
      { name: 'Brand Risk', score: 90, weight: 'Medium' },
      { name: 'Market Trend', score: 70, weight: 'Low' }
    ]
  };

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Decision Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-3">
            <div className="text-4xl font-bold text-purple-600">
              {analysis.buyScore}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Recommendation Score
            </div>
            <Badge 
              variant={analysis.buyScore >= 70 ? "default" : analysis.buyScore >= 50 ? "secondary" : "destructive"}
              className="w-full justify-center"
            >
              {analysis.buyScore >= 70 ? 'BUY' : analysis.buyScore >= 50 ? 'MAYBE' : 'AVOID'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          AI Decision Support
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2">
                {analysis.buyScore}
              </div>
              <div className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                Should I Buy This?
              </div>
              <Badge 
                variant={analysis.buyScore >= 70 ? "default" : analysis.buyScore >= 50 ? "secondary" : "destructive"}
                className="text-sm px-4 py-1"
              >
                {analysis.buyScore >= 70 ? 'STRONG BUY' : analysis.buyScore >= 50 ? 'MODERATE BUY' : 'AVOID'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="font-semibold text-slate-900 dark:text-white">
                  {analysis.timeToSell}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Time to Sell
                </div>
              </div>
              
              <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <div className="font-semibold text-slate-900 dark:text-white">
                  {analysis.riskLevel}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Risk Level
                </div>
              </div>
            </div>
          </div>

          {detailed && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Analysis Factors</h3>
              {analysis.factors.map((factor) => (
                <div key={factor.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{factor.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{factor.score}/100</span>
                  </div>
                  <Progress value={factor.score} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>

        {detailed && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Key Insights</h3>
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Target className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 dark:border-slate-600">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Amazon Risk</div>
            <div className="flex items-center gap-2">
              <Progress value={analysis.amazonRisk} className="flex-1 h-2" />
              <span className="text-sm font-medium">{analysis.amazonRisk}%</span>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400">IP Risk</div>
            <div className="flex items-center gap-2">
              <Progress value={analysis.ipRisk} className="flex-1 h-2" />
              <span className="text-sm font-medium">{analysis.ipRisk}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
