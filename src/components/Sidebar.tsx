
import React from 'react';
import { 
  BarChart, 
  TrendingUp, 
  Package, 
  Calculator, 
  Brain, 
  Bell, 
  FileText, 
  Settings,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const menuItems = [
  { icon: BarChart, label: 'Dashboard', active: true },
  { icon: TrendingUp, label: 'Product Analysis', active: false },
  { icon: Calculator, label: 'FBA Calculator', active: false },
  { icon: Brain, label: 'AI Insights', active: false },
  { icon: Package, label: 'Inventory Tracker', active: false },
  { icon: Bell, label: 'Alerts', active: false, badge: '3' },
  { icon: Zap, label: 'Automation', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  return (
    <div className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-r border-slate-200 dark:border-slate-700 transition-all duration-300 z-40",
      open ? "w-64" : "w-16"
    )}>
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "default" : "ghost"}
              className={cn(
                "w-full justify-start relative",
                !open && "px-2",
                item.active && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
              )}
            >
              <item.icon className="w-5 h-5" />
              {open && (
                <>
                  <span className="ml-3">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};
