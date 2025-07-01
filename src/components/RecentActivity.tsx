
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, AlertTriangle, Package } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'price_change',
    message: 'Echo Dot price increased by 15%',
    time: '2 hours ago',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  {
    id: 2,
    type: 'alert',
    message: 'Low inventory alert for AirPods Pro',
    time: '4 hours ago',
    icon: AlertTriangle,
    color: 'text-orange-600'
  },
  {
    id: 3,
    type: 'stock',
    message: 'Instant Pot back in stock',
    time: '6 hours ago',
    icon: Package,
    color: 'text-blue-600'
  },
  {
    id: 4,
    type: 'price_change',
    message: 'Fire TV Stick price dropped by 8%',
    time: '1 day ago',
    icon: TrendingUp,
    color: 'text-red-600'
  }
];

export const RecentActivity: React.FC = () => {
  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-700 ${activity.color}`}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900 dark:text-white">
                  {activity.message}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
