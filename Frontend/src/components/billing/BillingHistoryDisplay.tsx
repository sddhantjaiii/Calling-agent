import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  RefreshCw, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Search,
  X
} from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import type { TransactionType, CreditTransaction } from '../../types';

interface BillingHistoryDisplayProps {
  className?: string;
  showTitle?: boolean;
  maxHeight?: string;
}

interface FilterState {
  type: TransactionType | 'all';
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
}

const TRANSACTION_TYPES: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'usage', label: 'Usage' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'admin_adjustment', label: 'Adjustment' },
  { value: 'refund', label: 'Refund' },
];

export const BillingHistoryDisplay: React.FC<BillingHistoryDisplayProps> = ({
  className = '',
  showTitle = true,
  maxHeight = '600px',
}) => {
  const { theme } = useTheme();
  const {
    history,
    loadingHistory,
    error,
    refreshHistory,
  } = useBilling();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  // Load history when page or filters change
  useEffect(() => {
    refreshHistory(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, refreshHistory]);

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    if (!history?.transactions) return [];

    return history.transactions.filter((transaction) => {
      // Type filter
      if (filters.type !== 'all' && transaction.type !== filters.type) {
        return false;
      }

      // Date range filter
      const transactionDate = new Date(transaction.createdAt);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (transactionDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (transactionDate > toDate) return false;
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesDescription = transaction.description.toLowerCase().includes(searchLower);
        const matchesType = transaction.type.toLowerCase().includes(searchLower);
        const matchesAmount = transaction.amount.toString().includes(searchLower);
        
        if (!matchesDescription && !matchesType && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [history?.transactions, filters]);

  const handleRefresh = async () => {
    try {
      await refreshHistory(currentPage, itemsPerPage);
      toast.success('Billing history refreshed');
    } catch (error) {
      toast.error('Failed to refresh billing history');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
    });
  };

  const hasActiveFilters = filters.type !== 'all' || filters.dateFrom || filters.dateTo || filters.searchTerm;

  const formatTransactionType = (type: TransactionType) => {
    switch (type) {
      case 'purchase':
        return 'Purchase';
      case 'usage':
        return 'Usage';
      case 'bonus':
        return 'Bonus';
      case 'admin_adjustment':
        return 'Adjustment';
      case 'refund':
        return 'Refund';
      default:
        return (type as string).charAt(0).toUpperCase() + (type as string).slice(1);
    }
  };

  const getTransactionColor = (amount: number) => {
    if (amount > 0) {
      return theme === 'dark' ? 'text-green-400' : 'text-green-600';
    } else {
      return theme === 'dark' ? 'text-red-400' : 'text-red-600';
    }
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'purchase':
        return '💳';
      case 'usage':
        return '📞';
      case 'bonus':
        return '🎁';
      case 'admin_adjustment':
        return '⚙️';
      case 'refund':
        return '↩️';
      default:
        return '📄';
    }
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <History className={`w-5 h-5 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`} />
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Billing History
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              } ${hasActiveFilters ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && <span className="ml-1 text-xs">•</span>}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loadingHistory}
              className={`${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className={`p-4 rounded-lg border mb-4 ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Transaction Type Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Transaction Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  theme === 'dark'
                    ? 'bg-slate-700 border-slate-600 text-slate-300'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-slate-300'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                />
                <Calendar className={`absolute right-3 top-2.5 w-4 h-4 pointer-events-none ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                }`} />
              </div>
            </div>

            {/* Date To Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-slate-300'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                />
                <Calendar className={`absolute right-3 top-2.5 w-4 h-4 pointer-events-none ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                }`} />
              </div>
            </div>

            {/* Search Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  placeholder="Search description, type, amount..."
                  className={`w-full px-3 py-2 pr-8 border rounded-md text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-slate-300 placeholder-slate-400'
                      : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                  }`}
                />
                <Search className={`absolute right-3 top-2.5 w-4 h-4 pointer-events-none ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                }`} />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              {filteredTransactions.length} of {history?.transactions.length || 0} transactions
            </div>
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className={`${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={`p-4 rounded-lg border mb-4 ${
          theme === 'dark'
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p>{error}</p>
        </div>
      )}

      {/* Transaction List */}
      <div className={`rounded-lg border ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-gray-200'
      }`} style={{ maxHeight }}>
        {loadingHistory ? (
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`h-16 rounded ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
                }`} />
              ))}
            </div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-auto" style={{ maxHeight }}>
            <div className="space-y-1 p-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-opacity-50 ${
                    theme === 'dark'
                      ? 'border-slate-600 bg-slate-700/30 hover:bg-slate-600/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    
                    <div>
                      <div className={`font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {formatTransactionType(transaction.type)}
                      </div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        {transaction.description}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                      }`}>
                        {new Date(transaction.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold text-lg ${getTransactionColor(transaction.amount)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </div>
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      Balance: {transaction.balanceAfter}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`text-center py-12 ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
          }`}>
            {hasActiveFilters ? (
              <div>
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No transactions match your filters</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div>
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No transaction history</p>
                <p className="text-sm">Your billing history will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {history && history.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              Show:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className={`px-2 py-1 border rounded text-sm ${
                theme === 'dark'
                  ? 'bg-slate-700 border-slate-600 text-slate-300'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              per page
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              Page {currentPage} of {history.totalPages}
            </span>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700 disabled:text-slate-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-400'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === history.totalPages}
                className={`${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700 disabled:text-slate-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-400'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingHistoryDisplay;