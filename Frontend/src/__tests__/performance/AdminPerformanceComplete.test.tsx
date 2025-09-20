import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { AdminContext } from '../../contexts/AdminContext';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { AgentManagement } from '../../components/admin/AgentManagement/AgentManagement';
import { SystemAnalytics } from '../../components/admin/SystemAnalytics';
import { VirtualizedTable } from '../../components/admin/shared/VirtualizedTable';

// Mock services
vi.mock('../../services/adminApiService');

// Performance measurement utilities
const measurePerformance = async (fn: () => Promise<void> | void, label: string) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;
  console.log(`${label}: ${duration.toFixed(2)}ms`);
  return duration;
};

const generateLargeDataset = (size: number, type: 'users' | 'agents') => {
  const data = [];
  for (let i = 0; i < size; i++) {
    if (type === 'users') {
      data.push({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: 'user',
        status: i % 2 === 0 ? 'active' : 'inactive',
        registrationDate: new Date(2024, 0, i % 30 + 1),
        lastLogin: new Date(2024, 0, (i % 30) + 1),
        agentCount: Math.floor(Math.random() * 10),
        callCount: Math.floor(Math.random() * 1000),
        creditsUsed: Math.floor(Math.random() * 5000),
        creditsRemaining: Math.floor(Math.random() * 10000),
      });
    } else {
      data.push({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        owner: `user${i % 100}@example.com`,
        type: i % 2 === 0 ? 'outbound' : 'inbound',
        status: i % 3 === 0 ? 'active' : 'inactive',
        creationDate: new Date(2024, 0, i % 30 + 1),
        performanceMetrics: {
          callsToday: Math.floor(Math.random() * 100),
          successRate: Math.floor(Math.random() * 100),
          averageDuration: Math.floor(Math.random() * 300),
        },
        healthStatus: ['healthy', 'warning', 'error'][i % 3],
      });
    }
  }
  return data;
};

const createTestWrapper = (adminUser = { role: 'admin', id: '1', email: 'admin@test.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminContext.Provider value={{
          user: adminUser,
          permissions: {
            canViewUsers: true,
            canEditUsers: true,
            canManageCredits: true,
            canViewAgents: true,
            canManageAgents: true,
            canViewAuditLogs: true,
            canManageSystem: adminUser.role === 'super_admin',
            canManageAPIKeys: adminUser.role === 'super_admin',
            canManageFeatureFlags: adminUser.role === 'super_admin',
          },
          isLoading: false,
          error: null,
        }}>
          {children}
        </AdminContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Panel Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing performance marks
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Large Dataset Handling', () => {
    it('handles 10,000 users efficiently', async () => {
      const largeUserDataset = generateLargeDataset(10000, 'users');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        users: largeUserDataset,
        total: largeUserDataset.length,
        page: 1,
        limit: 100,
      });

      const TestWrapper = createTestWrapper();
      
      const renderTime = await measurePerformance(async () => {
        render(<UserManagement />, { wrapper: TestWrapper });
        await waitFor(() => {
          expect(screen.getByText('User 0')).toBeInTheDocument();
        }, { timeout: 10000 });
      }, 'Large User Dataset Render');

      // Performance assertion: should render within 5 seconds
      expect(renderTime).toBeLessThan(5000);
      
      // Memory usage should be reasonable
      const memoryUsage = (performance as any).memory?.usedJSHeapSize;
      if (memoryUsage) {
        console.log(`Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`);
        // Should not exceed 100MB for this test
        expect(memoryUsage).toBeLessThan(100 * 1024 * 1024);
      }
    });

    it('handles 5,000 agents efficiently', async () => {
      const largeAgentDataset = generateLargeDataset(5000, 'agents');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getAgents).mockResolvedValue({
        agents: largeAgentDataset,
        total: largeAgentDataset.length,
        page: 1,
        limit: 100,
      });

      const TestWrapper = createTestWrapper();
      
      const renderTime = await measurePerformance(async () => {
        render(<AgentManagement />, { wrapper: TestWrapper });
        await waitFor(() => {
          expect(screen.getByText('Agent 0')).toBeInTheDocument();
        }, { timeout: 10000 });
      }, 'Large Agent Dataset Render');

      expect(renderTime).toBeLessThan(5000);
    });

    it('virtual scrolling performs well with large datasets', async () => {
      const largeDataset = generateLargeDataset(50000, 'users');
      
      const TestWrapper = createTestWrapper();
      
      const renderTime = await measurePerformance(async () => {
        render(
          <VirtualizedTable
            data={largeDataset}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status' },
            ]}
            rowHeight={50}
            height={600}
          />,
          { wrapper: TestWrapper }
        );
      }, 'Virtual Scrolling with 50k items');

      // Virtual scrolling should render almost instantly
      expect(renderTime).toBeLessThan(1000);
      
      // Test scrolling performance
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      const scrollTime = await measurePerformance(async () => {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 10000 } });
        await waitFor(() => {
          // Should have updated visible items
          expect(scrollContainer.scrollTop).toBe(10000);
        });
      }, 'Virtual Scroll Performance');

      expect(scrollTime).toBeLessThan(100);
    });
  });

  describe('Search and Filtering Performance', () => {
    it('search performs well with large datasets', async () => {
      const largeUserDataset = generateLargeDataset(10000, 'users');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getUsers).mockImplementation(async ({ search }) => {
        const filteredUsers = search 
          ? largeUserDataset.filter(user => 
              user.name.toLowerCase().includes(search.toLowerCase()) ||
              user.email.toLowerCase().includes(search.toLowerCase())
            )
          : largeUserDataset;
        
        return {
          users: filteredUsers.slice(0, 100),
          total: filteredUsers.length,
          page: 1,
          limit: 100,
        };
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      
      const searchTime = await measurePerformance(async () => {
        fireEvent.change(searchInput, { target: { value: 'User 100' } });
        await waitFor(() => {
          expect(adminApiService.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'User 100' })
          );
        });
      }, 'Search Performance');

      expect(searchTime).toBeLessThan(500);
    });

    it('filtering performs well with multiple criteria', async () => {
      const largeUserDataset = generateLargeDataset(10000, 'users');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getUsers).mockImplementation(async ({ filters }) => {
        let filteredUsers = largeUserDataset;
        
        if (filters?.status) {
          filteredUsers = filteredUsers.filter(user => user.status === filters.status);
        }
        if (filters?.role) {
          filteredUsers = filteredUsers.filter(user => user.role === filters.role);
        }
        
        return {
          users: filteredUsers.slice(0, 100),
          total: filteredUsers.length,
          page: 1,
          limit: 100,
        };
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      const statusFilter = screen.getByTestId('status-filter');
      const roleFilter = screen.getByTestId('role-filter');
      
      const filterTime = await measurePerformance(async () => {
        fireEvent.change(statusFilter, { target: { value: 'active' } });
        fireEvent.change(roleFilter, { target: { value: 'user' } });
        
        await waitFor(() => {
          expect(adminApiService.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({
              filters: { status: 'active', role: 'user' }
            })
          );
        });
      }, 'Multi-Filter Performance');

      expect(filterTime).toBeLessThan(500);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('bulk selection performs well with large datasets', async () => {
      const largeAgentDataset = generateLargeDataset(1000, 'agents');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getAgents).mockResolvedValue({
        agents: largeAgentDataset,
        total: largeAgentDataset.length,
        page: 1,
        limit: 100,
      });

      const TestWrapper = createTestWrapper();
      render(<AgentManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Agent 0')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
      
      const selectionTime = await measurePerformance(async () => {
        fireEvent.click(selectAllCheckbox);
        await waitFor(() => {
          const selectedItems = screen.getAllByRole('checkbox', { checked: true });
          expect(selectedItems.length).toBeGreaterThan(1);
        });
      }, 'Bulk Selection Performance');

      expect(selectionTime).toBeLessThan(1000);
    });

    it('bulk operations execute efficiently', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.bulkUpdateAgents).mockImplementation(async ({ agentIds }) => {
        // Simulate processing time based on number of items
        await new Promise(resolve => setTimeout(resolve, agentIds.length * 10));
        return {
          successful: agentIds.length,
          failed: [],
        };
      });

      const agentIds = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
      
      const bulkOperationTime = await measurePerformance(async () => {
        const result = await adminApiService.bulkUpdateAgents({
          agentIds,
          action: 'activate',
        });
        expect(result.successful).toBe(100);
      }, 'Bulk Operation Performance');

      // Should complete within 5 seconds for 100 items
      expect(bulkOperationTime).toBeLessThan(5000);
    });
  });

  describe('Chart and Analytics Performance', () => {
    it('renders complex charts efficiently', async () => {
      const mockAnalytics = {
        systemMetrics: {
          totalUsers: 10000,
          activeUsers: 8500,
          totalAgents: 25000,
          activeAgents: 20000,
          totalCalls: 500000,
          successfulCalls: 460000,
          systemUptime: 99.9,
          averageResponseTime: 150,
        },
        usageCharts: {
          dailyUsage: Array.from({ length: 365 }, (_, i) => ({
            date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
            calls: Math.floor(Math.random() * 1000) + 500,
            users: Math.floor(Math.random() * 100) + 50,
          })),
          monthlyTrends: Array.from({ length: 24 }, (_, i) => ({
            month: new Date(2022, i).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: Math.floor(Math.random() * 50000) + 10000,
            users: Math.floor(Math.random() * 1000) + 500,
          })),
        },
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getSystemAnalytics).mockResolvedValue(mockAnalytics);

      const TestWrapper = createTestWrapper();
      
      const chartRenderTime = await measurePerformance(async () => {
        render(<SystemAnalytics />, { wrapper: TestWrapper });
        await waitFor(() => {
          expect(screen.getByTestId('usage-charts')).toBeInTheDocument();
        }, { timeout: 10000 });
      }, 'Complex Charts Render');

      expect(chartRenderTime).toBeLessThan(3000);
    });

    it('chart interactions are responsive', async () => {
      const mockAnalytics = {
        systemMetrics: {
          totalUsers: 1000,
          activeUsers: 850,
          totalAgents: 2500,
          activeAgents: 2000,
          totalCalls: 50000,
          successfulCalls: 46000,
          systemUptime: 99.9,
          averageResponseTime: 150,
        },
        usageCharts: {
          dailyUsage: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
            calls: Math.floor(Math.random() * 1000) + 500,
            users: Math.floor(Math.random() * 100) + 50,
          })),
        },
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getSystemAnalytics).mockResolvedValue(mockAnalytics);

      const TestWrapper = createTestWrapper();
      render(<SystemAnalytics />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('usage-charts')).toBeInTheDocument();
      });

      const chart = screen.getByTestId('usage-chart');
      
      const interactionTime = await measurePerformance(async () => {
        fireEvent.mouseOver(chart);
        fireEvent.mouseMove(chart, { clientX: 100, clientY: 100 });
        fireEvent.mouseOut(chart);
      }, 'Chart Interaction Performance');

      expect(interactionTime).toBeLessThan(100);
    });
  });

  describe('Memory Management', () => {
    it('properly cleans up components on unmount', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        users: generateLargeDataset(1000, 'users'),
        total: 1000,
        page: 1,
        limit: 100,
      });

      const TestWrapper = createTestWrapper();
      const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize;
      
      const cleanupTime = await measurePerformance(async () => {
        unmount();
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }, 'Component Cleanup');

      expect(cleanupTime).toBeLessThan(500);

      const finalMemory = (performance as any).memory?.usedJSHeapSize;
      if (initialMemory && finalMemory) {
        const memoryDiff = initialMemory - finalMemory;
        console.log(`Memory freed: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);
        // Should free some memory (allowing for some variance)
        expect(memoryDiff).toBeGreaterThan(-10 * 1024 * 1024); // Not more than 10MB increase
      }
    });

    it('handles rapid component mounting/unmounting', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        users: generateLargeDataset(100, 'users'),
        total: 100,
        page: 1,
        limit: 100,
      });

      const TestWrapper = createTestWrapper();
      
      const rapidMountTime = await measurePerformance(async () => {
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });
          await waitFor(() => {
            expect(screen.getByTestId('user-management')).toBeInTheDocument();
          });
          unmount();
        }
      }, 'Rapid Mount/Unmount');

      // Should handle rapid mounting/unmounting efficiently
      expect(rapidMountTime).toBeLessThan(5000);
    });
  });

  describe('Network Performance', () => {
    it('handles concurrent API requests efficiently', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      // Mock multiple API endpoints
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        users: generateLargeDataset(100, 'users'),
        total: 100,
        page: 1,
        limit: 100,
      });
      
      vi.mocked(adminApiService.getAgents).mockResolvedValue({
        agents: generateLargeDataset(100, 'agents'),
        total: 100,
        page: 1,
        limit: 100,
      });
      
      vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
        users: { total: 1000, active: 850, newThisMonth: 150 },
        agents: { total: 2500, active: 2000, healthyPercentage: 95 },
        calls: { totalThisMonth: 50000, successRate: 92, averageDuration: 180 },
        system: { uptime: 99.9, responseTime: 150, errorRate: 0.1 },
      });

      const concurrentRequestTime = await measurePerformance(async () => {
        const promises = [
          adminApiService.getUsers({ page: 1, limit: 100, search: '', filters: {} }),
          adminApiService.getAgents({ page: 1, limit: 100, filters: {} }),
          adminApiService.getSystemStats(),
        ];
        
        await Promise.all(promises);
      }, 'Concurrent API Requests');

      // Concurrent requests should be faster than sequential
      expect(concurrentRequestTime).toBeLessThan(1000);
    });

    it('handles request caching effectively', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      const mockData = {
        users: generateLargeDataset(100, 'users'),
        total: 100,
        page: 1,
        limit: 100,
      };
      
      vi.mocked(adminApiService.getUsers).mockResolvedValue(mockData);

      const TestWrapper = createTestWrapper();
      
      // First request
      const firstRequestTime = await measurePerformance(async () => {
        render(<UserManagement />, { wrapper: TestWrapper });
        await waitFor(() => {
          expect(screen.getByText('User 0')).toBeInTheDocument();
        });
      }, 'First Request (No Cache)');

      // Second request (should use cache)
      const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });
      unmount();
      
      const secondRequestTime = await measurePerformance(async () => {
        render(<UserManagement />, { wrapper: TestWrapper });
        await waitFor(() => {
          expect(screen.getByText('User 0')).toBeInTheDocument();
        });
      }, 'Second Request (With Cache)');

      // Cached request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
    });
  });
});