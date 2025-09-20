import React from 'react';
import { useBilling } from '../../hooks/useBilling';

/**
 * Example component demonstrating usage of the useBilling hook
 * This component shows how to:
 * - Display credit balance and statistics
 * - Handle billing history
 * - Purchase credits
 * - Handle loading states and errors
 */
export const BillingExample: React.FC = () => {
  const {
    // State
    credits,
    stats,
    history,
    pricing,
    loading,
    loadingCredits,
    loadingStats,
    loadingHistory,
    purchasing,
    error,
    lastRefresh,
    
    // Actions
    refreshCredits,
    refreshStats,
    refreshHistory,
    purchaseCredits,
    confirmPayment,
    checkCredits,
    refreshAll,
    clearError,
  } = useBilling();

  const handlePurchaseCredits = async (amount: number) => {
    const result = await purchaseCredits(amount);
    if (result) {
      console.log('Purchase initiated:', result);
      // Here you would typically redirect to Stripe checkout or handle payment
    }
  };

  const handleConfirmPayment = async (paymentIntentId: string) => {
    const success = await confirmPayment(paymentIntentId);
    if (success) {
      console.log('Payment confirmed successfully');
    }
  };

  const handleCheckCredits = async (required: number) => {
    const result = await checkCredits(required);
    if (result) {
      console.log('Credit check result:', result);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Billing Dashboard</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <button
                  onClick={clearError}
                  className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Balance Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Credit Balance</h2>
          <button
            onClick={refreshCredits}
            disabled={loadingCredits}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loadingCredits ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {credits ? (
          <div className="text-3xl font-bold text-green-600">
            {credits.credits} Credits
          </div>
        ) : (
          <div className="text-gray-500">No credit data available</div>
        )}
      </div>

      {/* Credit Statistics Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Credit Statistics</h2>
          <button
            onClick={refreshStats}
            disabled={loadingStats}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loadingStats ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Current Balance</div>
              <div className="text-xl font-semibold">{stats.currentBalance}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Purchased</div>
              <div className="text-xl font-semibold">{stats.totalPurchased}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Used</div>
              <div className="text-xl font-semibold">{stats.totalUsed}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Avg Usage/Day</div>
              <div className="text-xl font-semibold">{stats.averageUsagePerDay}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No statistics available</div>
        )}
      </div>

      {/* Purchase Credits Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Purchase Credits</h2>
        
        {pricing && (
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">
              Price: ${pricing.pricePerCredit} per credit (minimum {pricing.minimumPurchase} credits)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricing.examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handlePurchaseCredits(example.credits)}
                  disabled={purchasing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="text-lg font-semibold">{example.credits} Credits</div>
                  <div className="text-sm text-gray-500">${example.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Enter credit amount"
            min="50"
            className="flex-1 px-3 py-2 border rounded-md"
            id="creditAmount"
          />
          <button
            onClick={() => {
              const input = document.getElementById('creditAmount') as HTMLInputElement;
              const amount = parseInt(input.value);
              if (amount >= 50) {
                handlePurchaseCredits(amount);
              }
            }}
            disabled={purchasing}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {purchasing ? 'Processing...' : 'Purchase'}
          </button>
        </div>
      </div>

      {/* Billing History Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Billing History</h2>
          <button
            onClick={() => refreshHistory()}
            disabled={loadingHistory}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loadingHistory ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {history && history.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.type}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">No billing history available</div>
        )}
      </div>

      {/* Utility Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Utility Actions</h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCheckCredits(10)}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Check 10 Credits
          </button>
          
          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh All Data'}
          </button>
        </div>
        
        {lastRefresh && (
          <div className="mt-4 text-sm text-gray-500">
            Last refreshed: {lastRefresh.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingExample;