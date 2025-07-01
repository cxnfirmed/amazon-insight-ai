
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, TrendingDown, Package } from 'lucide-react';

export const Alerts: React.FC = () => {
  const alerts = [
    {
      id: 1,
      type: 'price',
      icon: TrendingDown,
      title: 'Price Drop Alert',
      message: 'Echo Dot price dropped to $39.99 (was $49.99)',
      time: '2 hours ago',
      severity: 'high'
    },
    {
      id: 2,
      type: 'inventory',
      icon: Package,
      title: 'Low Stock Warning',
      message: 'Instant Pot inventory below 10 units',
      time: '4 hours ago',
      severity: 'medium'
    },
    {
      id: 3,
      type: 'competition',
      icon: AlertTriangle,
      title: 'New Competitor',
      message: 'New seller entered AirPods Pro market',
      time: '1 day ago',
      severity: 'low'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Alerts & Notifications</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Stay informed about important changes in your market
          </p>
        </div>
        <Button variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Configure Alerts
        </Button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-100 dark:bg-red-900/20' :
                  alert.severity === 'medium' ? 'bg-orange-100 dark:bg-orange-900/20' :
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  <alert.icon className={`w-5 h-5 ${
                    alert.severity === 'high' ? 'text-red-600 dark:text-red-400' :
                    alert.severity === 'medium' ? 'text-orange-600 dark:text-orange-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{alert.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{alert.message}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">{alert.time}</p>
                </div>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
