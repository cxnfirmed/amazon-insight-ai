
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
  activeView: string;
  setActiveView: (view: string) => void;
}

const menuItems = [
  { icon: BarChart, label: 'Dashboard', view: 'Dashboard' },
  { icon: TrendingUp, label: 'Product Analysis', view: 'Product Analysis' },
  { icon: Calculator, label: 'FBA Calculator', view: 'FBA Calculator' },
  { icon: Brain, label: 'AI Insights', view: 'AI Insights' },
  { icon: Package, label: 'Inventory Tracker', view: 'Inventory Tracker' },
  { icon: Bell, label: 'Alerts', view: 'Alerts', badge: '3' },
  { icon: Zap, label: 'Automation', view: 'Automation' },
  { icon: FileText, label: 'Reports', view: 'Reports' },
  { icon: Settings, label: 'Settings', view: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, activeView, setActiveView }) => {
  const handleMenuClick = (view: string) => {
    setActiveView(view);
  };

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
              variant={activeView === item.view ? "default" : "ghost"}
              className={cn(
                "w-full justify-start relative",
                !open && "px-2",
                activeView === item.view && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
              )}
              onClick={() => handleMenuClick(item.view)}
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
