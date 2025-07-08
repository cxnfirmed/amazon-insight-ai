import React, { useState } from 'react';
import { AmazonProductAnalytics } from '@/components/AmazonProductAnalytics';
import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';
import { FBACalculator } from '@/components/FBACalculator';
import { AIDecisionScore } from '@/components/AIDecisionScore';
import { InventoryTracker } from '@/components/InventoryTracker';
import { Alerts } from '@/components/Alerts';
import { useAmazonProduct } from '@/hooks/useAmazonProduct';
import { BulkAnalysisTools } from '@/components/BulkAnalysisTools';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ProfitabilityCalculator } from '@/components/ProfitabilityCalculator';
import { ProductSearch } from '@/components/ProductSearch';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { product, fetchProduct, loading } = useAmazonProduct();

  const handleConnectAmazonAccount = () => {
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in localStorage to verify on return
    localStorage.setItem('amazon_oauth_state', state);
    
    // Redirect to Amazon's authorization URL
    const authUrl = `https://sellercentral.amazon.com/apps/authorize/consent?application_id=amzn1.application-oa2-client.e932a0aad37c4b15ad63f2482ea3e3b5&state=${state}&redirect_uri=https://amazon-insight-ai.lovable.app/redirect`;
    
    window.location.href = authUrl;
  };

  const handleSearch = async (query: string) => {
    console.log('Search initiated for:', query);
    setSearchQuery(query);
    if (query.trim()) {
      // Check if it's an ASIN (10 alphanumeric characters) or UPC (12 digits)
      const isASIN = query.match(/^[A-Z0-9]{10}$/);
      const isUPC = query.match(/^\d{12}$/);
      
      if (isASIN || isUPC) {
        console.log('Valid ASIN/UPC detected, fetching fresh product data...');
        // Force fresh fetch when user searches
        await fetchProduct(query, true);
        setActiveView('Product Analysis');
        setSelectedProduct(query);
      } else {
        // Otherwise show search results in dashboard
        setActiveView('Dashboard');
        setSelectedProduct(null);
      }
    }
  };

  const renderActiveView = () => {
    console.log('Rendering active view:', activeView, 'Product:', product);
    
    switch (activeView) {
      case 'Product Analysis':
        return <ProductSearch />;
      case 'FBA Calculator':
        return <ProfitabilityCalculator />;
      case 'AI Insights':
        return <AIDecisionScore productId="sample" detailed />;
      case 'Inventory Tracker':
        return <InventoryTracker />;
      case 'Alerts':
        return <Alerts />;
      case 'Bulk Analysis':
        return <BulkAnalysisTools />;
      case 'Settings':
        return <SettingsPanel />;
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
      default:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
              <Button 
                onClick={handleConnectAmazonAccount}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Connect Amazon Seller Account
              </Button>
            </div>
            <Dashboard onProductSelect={setSelectedProduct} searchQuery={searchQuery} />
          </div>
        );
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
          <div className={activeView === 'Product Analysis' ? '' : 'p-6'}>
            {renderActiveView()}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
};

export default Index;
