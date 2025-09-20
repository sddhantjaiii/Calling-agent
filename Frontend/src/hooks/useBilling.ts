import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import type {
  CreditBalance,
  CreditStats,
  BillingHistory,
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
  PricingConfig,
  PaymentHistory,
  CreditCheckResponse,
  ApiError
} from '../types';

export interface UseBillingReturn {
  // Data
  credits: CreditBalance | null;
  stats: CreditStats | null;
  history: BillingHistory | null;
  pricing: PricingConfig | null;
  paymentHistory: PaymentHistory | null;

  // Loading states
  loading: boolean;
  loadingCredits: boolean;
  loadingStats: boolean;
  loadingHistory: boolean;
  loadingPricing: boolean;
  purchasing: boolean;

  // Error states
  error: string | null;

  // Metadata
  lastRefresh: Date | null;

  // Actions
  refreshCredits: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshHistory: (page?: number, limit?: number) => Promise<void>;
  loadPricing: () => Promise<void>;
  loadPaymentHistory: (limit?: number) => Promise<void>;
  purchaseCredits: (amount: number) => Promise<PurchaseCreditsResponse | null>;
  confirmPayment: (paymentIntentId: string) => Promise<boolean>;
  checkCredits: (requiredCredits?: number) => Promise<CreditCheckResponse | null>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
}

export const useBilling = (autoLoadPricing: boolean = true): UseBillingReturn => {
  const queryClient = useQueryClient();

  // Helper function to handle API errors
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);

    let errorMessage = `Failed to ${operation}`;

    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (apiError.code === 'INSUFFICIENT_CREDITS') {
        errorMessage = 'Insufficient credits for this operation';
      } else if (apiError.code === 'PAYMENT_FAILED') {
        errorMessage = 'Payment processing failed. Please try again.';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }

    return errorMessage;
  };

  // Query for credit balance with caching
  const {
    data: credits = null,
    isLoading: loadingCredits,
    error: creditsError,
    refetch: refetchCredits,
  } = useQuery({
    queryKey: queryKeys.credits,
    queryFn: async () => {
      const response = await apiService.getCredits();
      return response.data || response as unknown as CreditBalance;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - credits change frequently
    gcTime: 3 * 60 * 1000, // 3 minutes
  });

  // Query for credit statistics with longer caching
  const {
    data: stats = null,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: queryKeys.creditStats,
    queryFn: async () => {
      const response = await apiService.getCreditStats();
      return response.data || response as unknown as CreditStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for billing history with caching
  const {
    data: history = null,
    isLoading: loadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: queryKeys.billingHistory,
    queryFn: async () => {
      const response = await apiService.getBillingHistory();
      return response.data || response as unknown as BillingHistory;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for pricing configuration (optional)
  const {
    data: pricing = null,
    isLoading: loadingPricing,
  } = useQuery({
    queryKey: ['billing', 'pricing'],
    queryFn: async () => {
      const response = await apiService.getPricing();
      return response.data || response as unknown as PricingConfig;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - pricing rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: autoLoadPricing, // Use the parameter to control pricing query
    retry: false, // Don't retry pricing when Stripe is not configured
  });

  // Mutations for credit operations
  const purchaseCreditsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const request: PurchaseCreditsRequest = { amount };
      const response = await apiService.purchaseCredits(request);
      return response.data || response as unknown as PurchaseCreditsResponse;
    },
    onSuccess: () => {
      // Invalidate billing data after successful purchase
      cacheUtils.invalidateBilling();
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const response = await apiService.confirmPayment(paymentIntentId);
      return response.data || response as unknown as { success: boolean };
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate billing data after successful payment confirmation
        cacheUtils.invalidateBilling();
      }
    },
  });

  const checkCreditsMutation = useMutation({
    mutationFn: async (requiredCredits?: number) => {
      const response = await apiService.checkCredits(requiredCredits);
      return response.data || response as unknown as CreditCheckResponse;
    },
  });

  // Calculate loading and error states
  const loading = loadingCredits && loadingStats && loadingHistory;
  const purchasing = purchaseCreditsMutation.isPending || confirmPaymentMutation.isPending;
  const error = creditsError ? handleError(creditsError, 'load credit balance') :
    statsError ? handleError(statsError, 'load credit statistics') :
      historyError ? handleError(historyError, 'load billing history') : null;

  // Action functions
  const refreshCredits = async (): Promise<void> => {
    await refetchCredits();
  };

  const refreshStats = async (): Promise<void> => {
    await refetchStats();
  };

  const refreshHistory = async (page?: number, limit?: number): Promise<void> => {
    if (page || limit) {
      // Invalidate history query with new parameters
      queryClient.invalidateQueries({ queryKey: [...queryKeys.billingHistory, { page, limit }] });
    } else {
      // Just refetch current data
      await refetchHistory();
    }
  };

  const loadPricing = async (): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: ['billing', 'pricing'] });
  };

  const loadPaymentHistory = async (limit?: number): Promise<void> => {
    // This would typically be handled by a separate query
    console.log('Loading payment history with limit:', limit);
  };

  const purchaseCredits = async (amount: number): Promise<PurchaseCreditsResponse | null> => {
    try {
      return await purchaseCreditsMutation.mutateAsync(amount);
    } catch (error) {
      handleError(error, 'purchase credits');
      return null;
    }
  };

  const confirmPayment = async (paymentIntentId: string): Promise<boolean> => {
    try {
      const result = await confirmPaymentMutation.mutateAsync(paymentIntentId);
      return result.success;
    } catch (error) {
      handleError(error, 'confirm payment');
      return false;
    }
  };

  const checkCredits = async (requiredCredits?: number): Promise<CreditCheckResponse | null> => {
    try {
      return await checkCreditsMutation.mutateAsync(requiredCredits);
    } catch (error) {
      console.warn('Failed to check credits:', error);
      return null;
    }
  };

  const refreshAll = async (): Promise<void> => {
    cacheUtils.invalidateBilling();
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch to prevent infinite loops
    queryClient.setQueryData(queryKeys.credits, (oldData: CreditBalance | undefined) => oldData);
    queryClient.setQueryData(queryKeys.billingHistory, (oldData: BillingHistory | undefined) => oldData);
  };

  return {
    // Data
    credits,
    stats,
    history,
    pricing,
    paymentHistory: null, // This would be a separate query in a full implementation

    // Loading states
    loading,
    loadingCredits,
    loadingStats,
    loadingHistory,
    loadingPricing,
    purchasing,

    // Error states
    error,

    // Metadata
    lastRefresh: new Date(), // React Query handles this internally

    // Actions
    refreshCredits,
    refreshStats,
    refreshHistory,
    loadPricing,
    loadPaymentHistory,
    purchaseCredits,
    confirmPayment,
    checkCredits,
    refreshAll,
    clearError,
  };
};

export default useBilling;