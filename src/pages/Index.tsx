
import React, { useState } from 'react';
import { ProductAnalysis } from '@/components/ProductAnalysis';
import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="p-6">
            {selectedProduct ? (
              <ProductAnalysis 
                productId={selectedProduct} 
                onBack={() => setSelectedProduct(null)} 
              />
            ) : (
              <Dashboard onProductSelect={setSelectedProduct} />
            )}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
};

export default Index;
