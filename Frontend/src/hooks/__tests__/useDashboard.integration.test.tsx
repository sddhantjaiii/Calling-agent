import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReactNode } from 'react';
import { useDashboard } from '../useDashboard';
import { apiService } from '../../services/apiService';
import type {
    DashboardOverview,
    DashboardAnalytics,
    AnalyticsMetrics,
    ApiError
} from '../../types';

// Mock the API service
vi.mock('../../services/apiService', () => ({
    apiService: {
        getDashboardOverview: vi.fn(),
        getDashboardAnalytics: vi.fn(),
        getDashboardMetrics: vi.fn(),
    },
}));

const mockApiService = apiService as {
    getDashboardOverview: Mock;
    getDashboardAnalytics: Mock;
    getDashboardMetrics: Mock;
};

// Test wrapper with QueryClient
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useDashboard Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Data Fetching', () => {
        it('should fetch dashboard overview and analytics successfully', async () => {
            const mockOverview: DashboardOverview = {
                totalLeads: 150,
                leadsGrowth: 12.5,
                totalInteractions: 450,
                interactionsGrowth: 8.3,
                convertedLeads: 45,
                conversionRate: 30.0,
                conversionGrowth: 5.2,
                avgConversationsPerHour: 15.5,
                conversationRateGrowth: -2.1,
            };

            const mockAnalytics: DashboardAnalytics = {
                callVolumeData: [
                    { date: '2024-01-01', calls: 25, duration: 125 },
                    { date: '2024-01-02', calls: 30, duration: 150 },
                    { date: '2024-01-03', calls: 28, duration: 140 },
                ],
                conversionTrendData: [
                    { date: '2024-01-01', conversions: 8, rate: 32.0 },
                    { date: '2024-01-02', conversions: 9, rate: 30.0 },
                    { date: '2024-01-03', conversions: 10, rate: 35.7 },
                ],
                leadSourceData: [
                    { source: 'Website', count: 75, percentage: 50.0 },
                    { source: 'Referral', count: 45, percentage: 30.0 },
                    { source: 'Social Media', count: 30, percentage: 20.0 },
                ],
                performanceMetrics: [
                    { metric: 'Answer Rate', value: 85.5, change: 2.3 },
                    { metric: 'Avg Call Duration', value: 4.2, change: -0.5 },
                    { metric: 'Customer Satisfaction', value: 4.6, change: 0.2 },
                ],
            };

            mockApiService.getDashboardOverview.mockResolvedValue({ data: mockOverview });
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: mockAnalytics });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            // Initially loading
            expect(result.current.loadingOverview).toBe(true);
            expect(result.current.loadingAnalytics).toBe(true);
            expect(result.current.overview).toBeNull();
            expect(result.current.analytics).toBeNull();

            // Wait for data to load
            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
                expect(result.current.loadingAnalytics).toBe(false);
            });

            expect(result.current.overview).toEqual(mockOverview);
            expect(result.current.analytics).toEqual(mockAnalytics);
            expect(result.current.error).toBeNull();
            expect(mockApiService.getDashboardOverview).toHaveBeenCalledTimes(1);
            expect(mockApiService.getDashboardAnalytics).toHaveBeenCalledTimes(1);
        });

        it('should handle different response formats', async () => {
            const mockOverview: DashboardOverview = {
                totalLeads: 100,
                leadsGrowth: 10.0,
                totalInteractions: 300,
                interactionsGrowth: 5.0,
                convertedLeads: 30,
                conversionRate: 30.0,
                conversionGrowth: 2.0,
                avgConversationsPerHour: 12.0,
                conversationRateGrowth: 1.0,
            };

            // Test direct object response (not wrapped in data)
            mockApiService.getDashboardOverview.mockResolvedValue(mockOverview);
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });

            expect(result.current.overview).toEqual(mockOverview);
        });

        it('should handle API errors gracefully', async () => {
            const mockError: ApiError = {
                name: 'ApiError',
                message: 'Network error',
                code: 'NETWORK_ERROR',
                status: 500,
            };

            mockApiService.getDashboardOverview.mockRejectedValue(mockError);
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });

            expect(result.current.overview).toBeNull();
            expect(result.current.error).toBe('Network error. Please check your connection.');
        });
    });

    describe('State Management', () => {
        it('should manage loading states correctly', async () => {
            mockApiService.getDashboardOverview.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ data: null }), 100))
            );
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            expect(result.current.loadingOverview).toBe(true);
            expect(result.current.loadingAnalytics).toBe(false); // This loads faster
            expect(result.current.loading).toBe(false); // Combined loading is false when analytics is done

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });
        });

        it('should handle auto-refresh when enabled', async () => {
            const mockOverview: DashboardOverview = {
                totalLeads: 100,
                leadsGrowth: 10.0,
                totalInteractions: 300,
                interactionsGrowth: 5.0,
                convertedLeads: 30,
                conversionRate: 30.0,
                conversionGrowth: 2.0,
                avgConversationsPerHour: 12.0,
                conversationRateGrowth: 1.0,
            };

            mockApiService.getDashboardOverview.mockResolvedValue({ data: mockOverview });
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(true, 1000), { wrapper }); // 1 second refresh

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });

            expect(result.current.overview).toEqual(mockOverview);
            expect(mockApiService.getDashboardOverview).toHaveBeenCalledTimes(1);

            // Auto-refresh is handled by React Query internally
            // We can't easily test the interval behavior in unit tests
        });
    });

    describe('Refresh Actions', () => {
        beforeEach(() => {
            mockApiService.getDashboardOverview.mockResolvedValue({ data: null });
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });
        });

        it('should refresh overview data', async () => {
            const initialOverview: DashboardOverview = {
                totalLeads: 100,
                leadsGrowth: 10.0,
                totalInteractions: 300,
                interactionsGrowth: 5.0,
                convertedLeads: 30,
                conversionRate: 30.0,
                conversionGrowth: 2.0,
                avgConversationsPerHour: 12.0,
                conversationRateGrowth: 1.0,
            };

            const updatedOverview: DashboardOverview = {
                ...initialOverview,
                totalLeads: 120,
                leadsGrowth: 15.0,
            };

            mockApiService.getDashboardOverview
                .mockResolvedValueOnce({ data: initialOverview })
                .mockResolvedValueOnce({ data: updatedOverview });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });

            expect(result.current.overview).toEqual(initialOverview);

            await act(async () => {
                await result.current.refreshOverview();
            });

            expect(result.current.overview).toEqual(updatedOverview);
            expect(mockApiService.getDashboardOverview).toHaveBeenCalledTimes(2);
        });

        it('should refresh analytics data', async () => {
            const initialAnalytics: DashboardAnalytics = {
                callVolumeData: [
                    { date: '2024-01-01', calls: 25, duration: 125 },
                ],
                conversionTrendData: [],
                leadSourceData: [],
                performanceMetrics: [],
            };

            const updatedAnalytics: DashboardAnalytics = {
                callVolumeData: [
                    { date: '2024-01-01', calls: 25, duration: 125 },
                    { date: '2024-01-02', calls: 30, duration: 150 },
                ],
                conversionTrendData: [],
                leadSourceData: [],
                performanceMetrics: [],
            };

            mockApiService.getDashboardAnalytics
                .mockResolvedValueOnce({ data: initialAnalytics })
                .mockResolvedValueOnce({ data: updatedAnalytics });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingAnalytics).toBe(false);
            });

            expect(result.current.analytics).toEqual(initialAnalytics);

            await act(async () => {
                await result.current.refreshAnalytics();
            });

            expect(result.current.analytics).toEqual(updatedAnalytics);
            expect(mockApiService.getDashboardAnalytics).toHaveBeenCalledTimes(2);
        });

        it('should refresh metrics with parameters', async () => {
            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.refreshMetrics({
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                });
            });

            // This should trigger query invalidation
            expect(result.current.error).toBeNull();
        });

        it('should refresh all data', async () => {
            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.refreshAll();
            });

            // This should trigger cache invalidation
            expect(result.current.error).toBeNull();
        });
    });

    describe('Advanced Data Loading', () => {
        beforeEach(() => {
            mockApiService.getDashboardOverview.mockResolvedValue({ data: null });
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });
        });

        it('should load call volume data with parameters', async () => {
            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.loadCallVolumeData({
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    groupBy: 'day',
                });
            });

            // This is a placeholder implementation in the hook
            expect(result.current.callVolumeData).toBeNull();
        });

        it('should load lead trends with parameters', async () => {
            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.loadLeadTrends({
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    groupBy: 'week',
                });
            });

            // This is a placeholder implementation in the hook
            expect(result.current.leadTrendsData).toBeNull();
        });

        it('should load CTA trends with parameters', async () => {
            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.loadCTATrends({
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    groupBy: 'month',
                });
            });

            // This is a placeholder implementation in the hook
            expect(result.current.ctaTrendsData).toBeNull();
        });

        it('should load top agents with parameters', async () => {
            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.loadTopAgents({
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    limit: 10,
                });
            });

            // This is a placeholder implementation in the hook
            expect(result.current.topAgents).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle unauthorized errors', async () => {
            const mockError: ApiError = {
                name: 'ApiError',
                message: 'Unauthorized',
                code: 'UNAUTHORIZED',
                status: 401,
            };

            mockApiService.getDashboardOverview.mockRejectedValue(mockError);
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });

            expect(result.current.error).toBe('Session expired. Please log in again.');
        });

        it('should handle validation errors', async () => {
            const mockError: ApiError = {
                name: 'ApiError',
                message: 'Invalid date range',
                code: 'VALIDATION_ERROR',
                status: 400,
            };

            mockApiService.getDashboardOverview.mockResolvedValue({ data: null });
            mockApiService.getDashboardAnalytics.mockRejectedValue(mockError);

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingAnalytics).toBe(false);
            });

            expect(result.current.error).toBe('Invalid date range');
        });

        it('should handle generic errors', async () => {
            const mockError = new Error('Generic error');

            mockApiService.getDashboardOverview.mockRejectedValue(mockError);
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loadingOverview).toBe(false);
            });

            expect(result.current.error).toBe('Generic error');
        });
    });

    describe('Metadata and State', () => {
        it('should provide last refresh timestamp', async () => {
            mockApiService.getDashboardOverview.mockResolvedValue({ data: null });
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.lastRefresh).toBeInstanceOf(Date);
        });

        it('should handle refreshing state', async () => {
            mockApiService.getDashboardOverview.mockResolvedValue({ data: null });
            mockApiService.getDashboardAnalytics.mockResolvedValue({ data: null });

            const wrapper = createWrapper();
            const { result } = renderHook(() => useDashboard(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Refreshing is handled by React Query internally
            expect(result.current.refreshing).toBe(false);
        });
    });
});