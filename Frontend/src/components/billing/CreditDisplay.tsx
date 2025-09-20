import React from 'react';
import { CreditCard, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { Button } from '../ui/button';
import { useTheme } from '../theme/ThemeProvider';
import { toast } from 'sonner';

interface CreditDisplayProps {
  variant?: 'compact' | 'detailed' | 'card';
  showRefresh?: boolean;
  showStats?: boolean;
  className?: string;
  onPurchaseClick?: () => void;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  variant = 'compact',
  showRefresh = true,
  showStats = false,
  className = '',
  onPurchaseClick,
}) => {
  const { theme } = useTheme();
  const {
    credits,
    stats,
    loadingCredits,
    loadingStats,
    error,
    refreshCredits,
    refreshStats,
    lastRefresh,
  } = useBilling();

  const handleRefresh = async () => {
    try {
      await refreshCredits();
      if (showStats) {
        await refreshStats();
      }
      toast.success('Credit balance updated');
    } catch (error) {
      toast.error('Failed to refresh credit balance');
    }
  };

  const isLowCredits = credits && credits.credits < 50;
  const isCriticalCredits = credits && credits.credits < 10;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-1">
          <CreditCard className={`w-4 h-4 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
          }`} />
          {loadingCredits ? (
            <div className="animate-pulse">
              <div className={`h-4 w-12 rounded ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
              }`} />
            </div>
          ) : credits ? (
            <span className={`text-sm font-medium ${
              isCriticalCredits 
                ? 'text-red-500' 
                : isLowCredits 
                  ? 'text-yellow-500' 
                  : theme === 'dark' 
                    ? 'text-slate-300' 
                    : 'text-gray-700'
            }`}>
              {credits.credits}
            </span>
          ) : (
            <span className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              --
            </span>
          )}
        </div>
        
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loadingCredits}
            className={`p-1 h-6 w-6 ${
              theme === 'dark'
                ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${loadingCredits ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {(isLowCredits || isCriticalCredits) && (
          <AlertCircle className={`w-4 h-4 ${
            isCriticalCredits ? 'text-red-500' : 'text-yellow-500'
          }`} />
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Credit Balance */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Credit Balance
            </h3>
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingCredits}
                className={`p-1 ${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loadingCredits ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
          
          {loadingCredits ? (
            <div className="animate-pulse">
              <div className={`h-8 w-24 rounded ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
              }`} />
            </div>
          ) : credits ? (
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${
                isCriticalCredits 
                  ? 'text-red-500' 
                  : isLowCredits 
                    ? 'text-yellow-500' 
                    : 'text-green-500'
              }`}>
                {credits.credits}
              </span>
              <span className={`text-sm ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                credits
              </span>
            </div>
          ) : (
            <div className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              No credit data available
            </div>
          )}

          {(isLowCredits || isCriticalCredits) && (
            <div className={`mt-2 flex items-center space-x-1 text-xs ${
              isCriticalCredits ? 'text-red-500' : 'text-yellow-500'
            }`}>
              <AlertCircle className="w-3 h-3" />
              <span>
                {isCriticalCredits ? 'Critical: Low credits' : 'Warning: Low credits'}
              </span>
            </div>
          )}

          {onPurchaseClick && (isLowCredits || isCriticalCredits) && (
            <Button
              onClick={onPurchaseClick}
              size="sm"
              className="mt-2 w-full"
              variant={isCriticalCredits ? 'default' : 'outline'}
            >
              Purchase Credits
            </Button>
          )}
        </div>

        {/* Credit Statistics */}
        {showStats && (
          <div className={`p-4 rounded-lg border ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Usage Statistics
              </h3>
              {showRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshStats()}
                  disabled={loadingStats}
                  className={`p-1 ${
                    theme === 'dark'
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>

            {loadingStats ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-4 rounded ${
                    theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className={`${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Total Purchased
                  </div>
                  <div className={`font-medium ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.totalPurchased}
                  </div>
                </div>
                <div>
                  <div className={`${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Total Used
                  </div>
                  <div className={`font-medium ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.totalUsed}
                  </div>
                </div>
                <div>
                  <div className={`${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Avg/Day
                  </div>
                  <div className={`font-medium flex items-center space-x-1 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    <span>{stats.averageUsagePerDay}</span>
                    {stats.averageUsagePerDay > 0 && (
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </div>
                <div>
                  <div className={`${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    Transactions
                  </div>
                  <div className={`font-medium ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.transactionCount}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-xs ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                No statistics available
              </div>
            )}

            {stats?.projectedRunoutDate && (
              <div className={`mt-3 pt-3 border-t text-xs ${
                theme === 'dark' 
                  ? 'border-slate-700 text-slate-400' 
                  : 'border-gray-200 text-gray-500'
              }`}>
                <div className="flex items-center space-x-1">
                  <TrendingDown className="w-3 h-3 text-orange-500" />
                  <span>
                    Projected runout: {new Date(stats.projectedRunoutDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last Refresh */}
        {lastRefresh && (
          <div className={`text-xs text-center ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
          }`}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={`p-3 rounded-lg border text-sm ${
            theme === 'dark'
              ? 'bg-red-900/20 border-red-800 text-red-300'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-6 rounded-lg border shadow-sm ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-gray-200'
      } ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CreditCard className={`w-5 h-5 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`} />
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Credit Balance
            </h3>
          </div>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loadingCredits}
              className={`${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loadingCredits ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {loadingCredits ? (
          <div className="animate-pulse">
            <div className={`h-12 w-32 rounded ${
              theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
            }`} />
          </div>
        ) : credits ? (
          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-bold ${
              isCriticalCredits 
                ? 'text-red-500' 
                : isLowCredits 
                  ? 'text-yellow-500' 
                  : 'text-green-500'
            }`}>
              {credits.credits}
            </span>
            <span className={`text-lg ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              credits
            </span>
          </div>
        ) : (
          <div className={`text-lg ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
          }`}>
            No credit data available
          </div>
        )}

        {(isLowCredits || isCriticalCredits) && (
          <div className={`mt-3 flex items-center space-x-2 text-sm ${
            isCriticalCredits ? 'text-red-500' : 'text-yellow-500'
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span>
              {isCriticalCredits ? 'Critical: Low credits remaining' : 'Warning: Low credits'}
            </span>
          </div>
        )}

        {onPurchaseClick && (isLowCredits || isCriticalCredits) && (
          <Button
            onClick={onPurchaseClick}
            className="mt-4 w-full"
            variant={isCriticalCredits ? 'default' : 'outline'}
          >
            Purchase More Credits
          </Button>
        )}

        {error && (
          <div className={`mt-4 p-3 rounded-lg border text-sm ${
            theme === 'dark'
              ? 'bg-red-900/20 border-red-800 text-red-300'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CreditDisplay;