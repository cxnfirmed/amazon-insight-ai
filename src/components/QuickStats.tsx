
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign, Package, AlertTriangle } from 'lucide-react';

const stats = [
  {
    title: 'Total Revenue',
    value: '$127,435',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-600'
  },
  {
    title: 'Active Products',
    value: '342',
    change: '+8',
    trend: 'up',
    icon: Package,
    color: 'text-blue-600'
  },
  {
    title: 'Avg. ROI',
    value: '24.8%',
    change: '+2.1%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-indigo-600'
  },
  {
    title: 'Alerts',
    value: '7',
    change: '+3',
    trend: 'up',
    icon: AlertTriangle,
    color: 'text-orange-600'
  }
];

export const QuickStats: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                <p className={`text-sm mt-1 ${stat.color}`}>
                  {stat.change} from last month
                </p>
              </div>
              <div className={`p-3 rounded-full bg-gradient-to-r ${
                stat.color.includes('green') ? 'from-green-500 to-emerald-500' :
                stat.color.includes('blue') ? 'from-blue-500 to-cyan-500' :
                stat.color.includes('indigo') ? 'from-indigo-500 to-purple-500' :
                'from-orange-500 to-red-500'
              }`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
