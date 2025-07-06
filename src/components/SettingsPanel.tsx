
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Key, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserSettings {
  // Calculation Defaults
  defaultProductCost: number;
  defaultShippingCost: number;
  defaultPrepCost: number;
  defaultTaxRate: number;
  defaultProfitThreshold: number;
  
  // API Settings
  keepaApiKey: string;
  spApiClientId: string;
  spApiClientSecret: string;
  spApiRefreshToken: string;
  
  // Preferences
  defaultMarketplace: string;
  currency: string;
  enableNotifications: boolean;
  autoRefreshInterval: number;
  
  // Risk Thresholds
  minRoi: number;
  minBuyScore: number;
  maxRiskScore: number;
}

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    defaultProductCost: 15.00,
    defaultShippingCost: 2.50,
    defaultPrepCost: 0.50,
    defaultTaxRate: 0.08,
    defaultProfitThreshold: 5.00,
    
    keepaApiKey: '',
    spApiClientId: '',
    spApiClientSecret: '',
    spApiRefreshToken: '',
    
    defaultMarketplace: 'ATVPDKIKX0DER',
    currency: 'USD',
    enableNotifications: true,
    autoRefreshInterval: 30,
    
    minRoi: 15,
    minBuyScore: 40,
    maxRiskScore: 3
  });

  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('amazon-insight-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleInputChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('amazon-insight-settings', JSON.stringify(settings));
      setHasChanges(false);
      
      toast({
        title: "Settings Saved",
        description: "Your preferences have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Save Failed",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetSettings = () => {
    setSettings({
      defaultProductCost: 15.00,
      defaultShippingCost: 2.50,
      defaultPrepCost: 0.50,
      defaultTaxRate: 0.08,
      defaultProfitThreshold: 5.00,
      
      keepaApiKey: '',
      spApiClientId: '',
      spApiClientSecret: '',
      spApiRefreshToken: '',
      
      defaultMarketplace: 'ATVPDKIKX0DER',
      currency: 'USD',
      enableNotifications: true,
      autoRefreshInterval: 30,
      
      minRoi: 15,
      minBuyScore: 40,
      maxRiskScore: 3
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-blue-500" />
          Settings
        </h1>
        
        <div className="flex gap-2">
          <Button
            onClick={resetSettings}
            variant="outline"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={saveSettings}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* API Credentials */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            API Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="keepaApiKey">Keepa API Key</Label>
              <Input
                id="keepaApiKey"
                type="password"
                value={settings.keepaApiKey}
                onChange={(e) => handleInputChange('keepaApiKey', e.target.value)}
                placeholder="Enter your Keepa API key"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Get your API key from <a href="https://keepa.com/#!api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">keepa.com</a>
              </p>
            </div>
            
            <div>
              <Label htmlFor="spApiClientId">SP-API Client ID</Label>
              <Input
                id="spApiClientId"
                type="password"
                value={settings.spApiClientId}
                onChange={(e) => handleInputChange('spApiClientId', e.target.value)}
                placeholder="amzn1.application-oa2-client.xxxxx"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="spApiClientSecret">SP-API Client Secret</Label>
              <Input
                id="spApiClientSecret"
                type="password"
                value={settings.spApiClientSecret}
                onChange={(e) => handleInputChange('spApiClientSecret', e.target.value)}
                placeholder="amzn1.oa2-cs.v1.xxxxx"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="spApiRefreshToken">SP-API Refresh Token</Label>
              <Input
                id="spApiRefreshToken"
                type="password"
                value={settings.spApiRefreshToken}
                onChange={(e) => handleInputChange('spApiRefreshToken', e.target.value)}
                placeholder="Atzr|IwEBIxxxxx"
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  API Setup Required
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You'll need active Keepa and Amazon SP-API credentials to access real product data. 
                  Without these, the app will use simulated data for demonstration purposes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Defaults */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Calculation Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="defaultProductCost">Default Product Cost ($)</Label>
              <Input
                id="defaultProductCost"
                type="number"
                step="0.01"
                value={settings.defaultProductCost}
                onChange={(e) => handleInputChange('defaultProductCost', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="defaultShippingCost">Default Shipping Cost ($)</Label>
              <Input
                id="defaultShippingCost"
                type="number"
                step="0.01"
                value={settings.defaultShippingCost}
                onChange={(e) => handleInputChange('defaultShippingCost', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="defaultPrepCost">Default Prep Cost ($)</Label>
              <Input
                id="defaultPrepCost"
                type="number"
                step="0.01"
                value={settings.defaultPrepCost}
                onChange={(e) => handleInputChange('defaultPrepCost', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="defaultTaxRate">Default Tax Rate</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.defaultTaxRate}
                onChange={(e) => handleInputChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Enter as decimal (e.g., 0.08 for 8%)</p>
            </div>
            
            <div>
              <Label htmlFor="defaultProfitThreshold">Minimum Profit Threshold ($)</Label>
              <Input
                id="defaultProfitThreshold"
                type="number"
                step="0.01"
                value={settings.defaultProfitThreshold}
                onChange={(e) => handleInputChange('defaultProfitThreshold', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="defaultMarketplace">Default Marketplace</Label>
              <Select
                value={settings.defaultMarketplace}
                onValueChange={(value) => handleInputChange('defaultMarketplace', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATVPDKIKX0DER">Amazon US</SelectItem>
                  <SelectItem value="A2EUQ1WTGCTBG2">Amazon CA</SelectItem>
                  <SelectItem value="A1AM78C64UM0Y8">Amazon MX</SelectItem>
                  <SelectItem value="A1PA6795UKMFR9">Amazon DE</SelectItem>
                  <SelectItem value="A1RKKUPIHCS9HS">Amazon ES</SelectItem>
                  <SelectItem value="A13V1IB3VIYZZH">Amazon FR</SelectItem>
                  <SelectItem value="APJ6JRA9NG5V4">Amazon IT</SelectItem>
                  <SelectItem value="A1F83G8C2ARO7P">Amazon UK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk & Scoring Thresholds */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Risk & Scoring Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="minRoi">Minimum ROI (%)</Label>
              <Input
                id="minRoi"
                type="number"
                value={settings.minRoi}
                onChange={(e) => handleInputChange('minRoi', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Products below this ROI will be flagged</p>
            </div>
            
            <div>
              <Label htmlFor="minBuyScore">Minimum Buy Score</Label>
              <Input
                id="minBuyScore"
                type="number"
                min="0"
                max="100"
                value={settings.minBuyScore}
                onChange={(e) => handleInputChange('minBuyScore', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum score to recommend purchase</p>
            </div>
            
            <div>
              <Label htmlFor="maxRiskScore">Maximum Risk Score</Label>
              <Input
                id="maxRiskScore"
                type="number"
                min="1"
                max="5"
                value={settings.maxRiskScore}
                onChange={(e) => handleInputChange('maxRiskScore', parseInt(e.target.value) || 1)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Products above this risk will be flagged</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableNotifications">Enable Notifications</Label>
                  <p className="text-xs text-slate-500">Get alerts for price changes and opportunities</p>
                </div>
                <Switch
                  id="enableNotifications"
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => handleInputChange('enableNotifications', checked)}
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="autoRefreshInterval">Auto Refresh Interval (minutes)</Label>
              <Input
                id="autoRefreshInterval"
                type="number"
                min="5"
                max="60"
                value={settings.autoRefreshInterval}
                onChange={(e) => handleInputChange('autoRefreshInterval', parseInt(e.target.value) || 30)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">How often to refresh price data automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
