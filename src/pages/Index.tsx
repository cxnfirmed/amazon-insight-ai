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
import { ProductSelector } from '@/components/ProductSelector';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { product, fetchProduct, loading, multipleProducts, selectProductFromMultiple, clearMultipleProducts } = useAmazonProduct();

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
      console.log('Valid input detected, processing...');
        
      // Fetch product data directly - the hook will handle UPC vs ASIN detection
      await fetchProduct(query.trim(), true);
      setActiveView('Product Analysis Results');
      setSelectedProduct(query.trim());
    }
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    // Clear search query when switching to Dashboard to show original dashboard content
    if (view === 'Dashboard') {
      setSearchQuery('');
    }
    // Clear multiple products selection when changing views
    if (multipleProducts) {
      clearMultipleProducts();
    }
  };

  const handleProductSelection = async (asin: string) => {
    console.log('User selected product:', asin);
    await selectProductFromMultiple(asin);
    setSelectedProduct(asin);
    setActiveView('Product Analysis Results');
  };

  const handleBackToSearch = () => {
    clearMultipleProducts();
    setSelectedProduct(null);
    setActiveView('Product Analysis');
  };

  const renderActiveView = () => {
    console.log('Rendering active view:', activeView, 'Product:', product);
    
    // Show product selector if multiple products were found
    if (multipleProducts && activeView === 'Product Analysis Results') {
      return (
        <ProductSelector
          upc={multipleProducts.upc}
          products={multipleProducts.products}
          totalFound={multipleProducts.totalFound}
          onSelectProduct={handleProductSelection}
          onBack={handleBackToSearch}
        />
      );
    }
    
    // Show Amazon product analytics if we have product data and we're showing results
    if (product && activeView === 'Product Analysis Results') {
      console.log('Showing AmazonProductAnalytics with product:', product.title);
      return (
        <div className="space-y-4">
          {/* Show UPC conversion info if applicable */}
          {product.upc_conversion && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <span className="text-lg">🔄</span>
                <span className="font-medium">
                  Searched by UPC: {product.upc_conversion.originalUpc}
                </span>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Found ASIN: {product.upc_conversion.convertedAsin}
              </div>
            </div>
          )}
          
          <AmazonProductAnalytics 
            product={product}
            onBack={() => {
              setSelectedProduct(null);
              setActiveView('Product Analysis');
            }}
          />
        </div>
      );
    }

    // Show loading state while fetching product data
    if (loading && activeView === 'Product Analysis Results') {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Fetching real Amazon product data...</p>
          </div>
        </div>
      );
    }

    // Show error state if we tried to fetch a product but failed
    if (selectedProduct && activeView === 'Product Analysis Results' && !product && !loading && !multipleProducts) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Unable to fetch product data for: {selectedProduct}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              This could be due to API limits, invalid input, or the product not being available.
            </p>
            <button 
              onClick={() => {
                setSelectedProduct(null);
                setActiveView('Product Analysis');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Product Search
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'Product Analysis':
        return <ProductSearch onSearch={handleSearch} />;
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
          setActiveView={handleViewChange}
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
