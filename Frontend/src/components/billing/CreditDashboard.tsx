import React, { useState } from 'react';
import { CreditCard, TrendingUp, ShoppingCart, RefreshCw } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import CreditDisplay from './CreditDisplay';
import CreditUsageIndicator from './CreditUsageIndicator';
import BillingHistoryDisplay from './BillingHistoryDisplay';

interface CreditDashboardProps {
  className?: string;
  onPurchaseClick?: () => void;
  showHistory?: boolean;
  showUsageIndicator?: boolean;
}

export const CreditDashboard: React.FC<CreditDashboardProps> = ({
  className = '',
  onPurchaseClick,
  showHistory = true,
  showUsageIndicator = true,
}) => {
  const { theme } = useTheme();
  const {
    stats,
    loading,
    error,
    refreshAll,
  } = useBilling();



  const handleRefreshAll = async () => {
    try {
      await refreshAll();
      toast.success('Credit data refreshed');
    } catch (error) {
      toast.error('Failed to refresh credit data');
    }
  };



  if (loading) {
    return (
      <div className={`p-6 rounded-lg border ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-gray-200'
      } ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-6 w-48 rounded ${
            theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
          }`} />
          <div className={`h-12 w-32 rounded ${
            theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
          }`} />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-16 rounded ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
              }`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className={`w-6 h-6 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
          }`} />
          <h2 className={`text-xl font-semibold ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            Credit Management
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {showUsageIndicator && <CreditUsageIndicator />}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshAll}
            disabled={loading}
            className={`${
              theme === 'dark'
                ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p>{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credit Balance Card */}
        <div className="lg:col-span-1">
          <CreditDisplay
            variant="card"
            showRefresh={false}
            onPurchaseClick={onPurchaseClick}
          />
        </div>

        {/* Statistics Grid */}
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-lg border ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Usage Statistics
            </h3>
            
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.totalPurchased}
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Total Purchased
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.totalUsed}
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Total Used
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold flex items-center justify-center space-x-1 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    <span>{stats.averageUsagePerDay}</span>
                    {stats.averageUsagePerDay > 0 && (
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Avg per Day
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.transactionCount}
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Transactions
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-8 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                No statistics available
              </div>
            )}

            {stats?.projectedRunoutDate && (
              <div className={`mt-4 pt-4 border-t text-center ${
                theme === 'dark' 
                  ? 'border-slate-700 text-slate-400' 
                  : 'border-gray-200 text-gray-500'
              }`}>
                <div className="text-sm">
                  Projected runout: {new Date(stats.projectedRunoutDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      {showHistory && (
        <BillingHistoryDisplay 
          showTitle={true}
          maxHeight="500px"
        />
      )}

      {/* Purchase Credits Button */}
      {onPurchaseClick && (
        <div className="text-center">
          <Button
            onClick={onPurchaseClick}
            size="lg"
            className="px-8"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Purchase Credits
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreditDashboard;