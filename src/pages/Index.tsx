import React, { useState } from 'react';
import { ProductAnalysis } from '@/components/ProductAnalysis';
import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';
import { FBACalculator } from '@/components/FBACalculator';
import { AIDecisionScore } from '@/components/AIDecisionScore';
import { InventoryTracker } from '@/components/InventoryTracker';
import { Alerts } from '@/components/Alerts';

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // If it looks like an ASIN, go to product analysis
      if (query.match(/^[A-Z0-9]{10}$/)) {
        setSelectedProduct(query);
        setActiveView('Product Analysis');
      } else {
        // Otherwise show search results in dashboard
        setActiveView('Dashboard');
        setSelectedProduct(null);
      }
    }
  };

  const renderActiveView = () => {
    if (selectedProduct && activeView === 'Product Analysis') {
      return (
        <ProductAnalysis 
          productId={selectedProduct} 
          onBack={() => {
            setSelectedProduct(null);
            setActiveView('Dashboard');
          }} 
        />
      );
    }

    switch (activeView) {
      case 'FBA Calculator':
        return <FBACalculator productId="" />;
      case 'AI Insights':
        return <AIDecisionScore productId="sample" detailed />;
      case 'Inventory Tracker':
        return <InventoryTracker />;
      case 'Alerts':
        return <Alerts />;
      case 'Automation':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Automation</h1>
            <p className="text-slate-600 dark:text-slate-400">Automation features coming soon.</p>
          </div>
        );
      case 'Reports':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
            <p className="text-slate-600 dark:text-slate-400">Reporting features coming soon.</p>
          </div>
        );
      case 'Settings':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
            <p className="text-slate-600 dark:text-slate-400">Settings panel coming soon.</p>
          </div>
        );
      default:
        return <Dashboard onProductSelect={setSelectedProduct} searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        onSearch={handleSearch}
      />
      
      <div className="flex">
        <Sidebar 
          open={sidebarOpen} 
          setOpen={setSidebarOpen}
          activeView={activeView}
          setActiveView={setActiveView}
        />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="p-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
};

export default Index;
