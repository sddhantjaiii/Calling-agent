import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { useTheme } from '../theme/ThemeProvider';

interface CreditUsageIndicatorProps {
  className?: string;
  showTrend?: boolean;
  showActivity?: boolean;
}

interface CreditChange {
  amount: number;
  timestamp: Date;
  type: 'increase' | 'decrease';
}

export const CreditUsageIndicator: React.FC<CreditUsageIndicatorProps> = ({
  className = '',
  showTrend = true,
  showActivity = true,
}) => {
  const { theme } = useTheme();
  const { credits, stats, lastRefresh } = useBilling();
  const [previousCredits, setPreviousCredits] = useState<number | null>(null);
  const [recentChanges, setRecentChanges] = useState<CreditChange[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Track credit changes for real-time updates
  useEffect(() => {
    if (credits && previousCredits !== null && credits.credits !== previousCredits) {
      const change: CreditChange = {
        amount: Math.abs(credits.credits - previousCredits),
        timestamp: new Date(),
        type: credits.credits > previousCredits ? 'increase' : 'decrease',
      };

      setRecentChanges(prev => [change, ...prev.slice(0, 4)]); // Keep last 5 changes
      setIsActive(true);

      // Reset activity indicator after 3 seconds
      const timer = setTimeout(() => setIsActive(false), 3000);
      return () => clearTimeout(timer);
    }

    if (credits) {
      setPreviousCredits(credits.credits);
    }
  }, [credits, previousCredits]);

  // Calculate usage trend from stats
  const getTrendInfo = () => {
    if (!stats) return null;

    const usageRate = stats.averageUsagePerDay;
    const currentBalance = stats.currentBalance;
    
    if (usageRate === 0) {
      return { trend: 'stable', message: 'No recent usage' };
    }

    const daysRemaining = currentBalance / usageRate;
    
    if (daysRemaining < 7) {
      return { trend: 'critical', message: `${Math.ceil(daysRemaining)} days remaining` };
    } else if (daysRemaining < 30) {
      return { trend: 'warning', message: `${Math.ceil(daysRemaining)} days remaining` };
    } else {
      return { trend: 'good', message: `${Math.ceil(daysRemaining)} days remaining` };
    }
  };

  const trendInfo = getTrendInfo();

  const getTrendIcon = () => {
    if (!trendInfo) return <Minus className="w-4 h-4" />;
    
    switch (trendInfo.trend) {
      case 'critical':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <TrendingDown className="w-4 h-4 text-yellow-500" />;
      case 'good':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    if (!trendInfo) return theme === 'dark' ? 'text-slate-400' : 'text-gray-500';
    
    switch (trendInfo.trend) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'good':
        return 'text-green-500';
      default:
        return theme === 'dark' ? 'text-slate-400' : 'text-gray-500';
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Activity Indicator */}
      {showActivity && (
        <div className="flex items-center space-x-1">
          <Activity className={`w-4 h-4 transition-colors duration-300 ${
            isActive 
              ? 'text-blue-500 animate-pulse' 
              : theme === 'dark' 
                ? 'text-slate-600' 
                : 'text-gray-300'
          }`} />
          {isActive && (
            <span className={`text-xs animate-fade-in ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}>
              Updated
            </span>
          )}
        </div>
      )}

      {/* Recent Changes */}
      {recentChanges.length > 0 && (
        <div className="flex items-center space-x-1">
          {recentChanges.slice(0, 3).map((change, index) => (
            <div
              key={`${change.timestamp.getTime()}-${index}`}
              className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full transition-opacity duration-500 ${
                change.type === 'increase'
                  ? theme === 'dark'
                    ? 'bg-green-900/30 text-green-300'
                    : 'bg-green-100 text-green-700'
                  : theme === 'dark'
                    ? 'bg-red-900/30 text-red-300'
                    : 'bg-red-100 text-red-700'
              }`}
              style={{ opacity: 1 - (index * 0.3) }}
            >
              <span className="text-xs">
                {change.type === 'increase' ? '+' : '-'}{change.amount}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Usage Trend */}
      {showTrend && trendInfo && (
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={`text-xs ${getTrendColor()}`}>
            {trendInfo.message}
          </span>
        </div>
      )}

      {/* Last Update Time */}
      {lastRefresh && (
        <div className={`text-xs ${
          theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
        }`}>
          {new Date().getTime() - lastRefresh.getTime() < 60000 
            ? 'Just now'
            : `${Math.floor((new Date().getTime() - lastRefresh.getTime()) / 60000)}m ago`
          }
        </div>
      )}
    </div>
  );
};

export default CreditUsageIndicator;