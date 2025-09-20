import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import userEvent from '@testing-library/user-event';

// Import admin components
import { AdminContext } from '../../contexts/AdminContext';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { AgentManagement } from '../../components/admin/AgentManagement/AgentManagement';
import { VirtualizedTable } from '../../components/admin/shared/VirtualizedTable';

// Mock services
vi.mock('../../services/adminApiService', () => ({
  adminApiService: {
    getUsers: vi.fn(),
    getAgents: vi.fn(),
    getSystemStats: vi.fn(),
    bulkUpdateAgents: vi.fn(),
    updateUser: vi.fn(),
  }
}));

// Load testing utilities
const simulateHighLoad = async (operations: (() => Promise<void>)[], concurrency = 10) => {
  const batches = [];
  for (let i = 0; i < operations.length; i += concurrency) {
    batches.push(operations.slice(i, i + concurrency));
  }

  const results = [];
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch.map(op => op()));
    results.push(...batchResults);
  }

  return results;
};

const measureMemoryUsage = () => {
  if ((performance as any).memory) {
    return {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit,
    };
  }
  return null;
};

const generateMassiveDataset = (size: number, type: 'users' | 'agents') => {
  const data = [];
  for (let i = 0; i < size; i++) {
    if (type === 'users') {
      data.push({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: 'user',
        status: i % 2 === 0 ? 'active' : 'inactive',
        registrationDate: new Date(2024, 0, (i % 365) + 1),
        lastLogin: new Date(2024, 0, (i % 365) + 1),
        agentCount: Math.floor(Math.random() * 20),
        callCount: Math.floor(Math.random() * 10000),
        creditsUsed: Math.floor(Math.random() * 50000),
        creditsRemaining: Math.floor(Math.random() * 100000),
        // Add more complex data
        metadata: {
          preferences: {
            theme: i % 2 === 0 ? 'dark' : 'light',
            notifications: i % 3 === 0,
            language: ['en', 'es', 'fr'][i % 3],
          },
          analytics: {
            loginCount: Math.floor(Math.random() * 1000),
            lastActivity: new Date(2024, 0, (i % 30) + 1),
            deviceInfo: `Device-${i % 10}`,
          },
        },
      });
    } else {
      data.push({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        owner: `user${i % 1000}@example.com`,
        type: ['outbound', 'inbound', 'hybrid'][i % 3],
        status: ['active', 'inactive', 'maintenance'][i % 3],
        creationDate: new Date(2024, 0, (i % 365) + 1),
        performanceMetrics: {
          callsToday: Math.floor(Math.random() * 500),
          callsThisWeek: Math.floor(Math.random() * 3500),
          callsThisMonth: Math.floor(Math.random() * 15000),
          successRate: Math.floor(Math.random() * 100),
          averageDuration: Math.floor(Math.random() * 600),
          costPerCall: Math.random() * 5,
        },
        healthStatus: ['healthy', 'warning', 'error', 'maintenance'][i % 4],
        configuration: {
          voice: `voice-${i % 20}`,
          language: ['en', 'es', 'fr', 'de'][i % 4],
          personality: ['professional', 'friendly', 'casual'][i % 3],
          responseTime: Math.floor(Math.random() * 5000),
        },
      });
    }
  }
  return data;
};

const createTestWrapper = (adminUser = { role: 'admin', id: '1', email: 'admin@test.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false, 
        staleTime: 0, 
        cacheTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
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

describe('Admin Panel Load Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performance.clearMarks();
    performance.clearMeasures();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Extreme Dataset Load Tests', () => {
    it('handles 100,000 users with pagination', async () => {
      const massiveUserDataset = generateMassiveDataset(100000, 'users');
      const { adminApiService } = await import('../../services/adminApiService');
      
      // Simulate paginated loading
      vi.mocked(adminApiService.getUsers).mockImplementation(async ({ page = 1, limit = 100 }) => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const pageData = massiveUserDataset.slice(startIndex, endIndex);
        
        return {
          success: true,
          data: pageData,
          pagination: { 
            total: massiveUserDataset.length, 
            page, 
            limit, 
            totalPages: Math.ceil(massiveUserDataset.length / limit) 
          },
        };
      });

      const TestWrapper = createTestWrapper();
      const initialMemory = measureMemoryUsage();
      
      const start = performance.now();
      render(<UserManagement />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      }, { timeout: 15000 });
      
      const renderTime = performance.now() - start;
      const finalMemory = measureMemoryUsage();
      
      console.log(`Render time for 100k users: ${renderTime.toFixed(2)}ms`);
      if (initialMemory && finalMemory) {
        const memoryIncrease = (finalMemory.used - initialMemory.used) / 1024 / 1024;
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
        
        // Should not use excessive memory for paginated data
        expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
      }
      
      // Should render within reasonable time even with massive dataset
      expect(renderTime).toBeLessThan(10000); // 10 seconds max
    });

    it('handles 50,000 agents with virtual scrolling', async () => {
      const massiveAgentDataset = generateMassiveDataset(50000, 'agents');
      
      const TestWrapper = createTestWrapper();
      const initialMemory = measureMemoryUsage();
      
      const start = performance.now();
      render(
        <VirtualizedTable
          data={massiveAgentDataset}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'owner', label: 'Owner' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'healthStatus', label: 'Health' },
          ]}
          rowHeight={60}
          height={800}
        />,
        { wrapper: TestWrapper }
      );
      
      const renderTime = performance.now() - start;
      const finalMemory = measureMemoryUsage();
      
      console.log(`Virtual scroll render time for 50k agents: ${renderTime.toFixed(2)}ms`);
      if (initialMemory && finalMemory) {
        const memoryIncrease = (finalMemory.used - initialMemory.used) / 1024 / 1024;
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
        
        // Virtual scrolling should use minimal memory
        expect(memoryIncrease).toBeLessThan(20); // Less than 20MB increase
      }
      
      // Virtual scrolling should render almost instantly
      expect(renderTime).toBeLessThan(2000); // 2 seconds max
      
      // Test scrolling performance
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      const scrollStart = performance.now();
      
      // Simulate rapid scrolling
      for (let i = 0; i < 100; i++) {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 100 } });
      }
      
      const scrollTime = performance.now() - scrollStart;
      console.log(`Scroll performance: ${scrollTime.toFixed(2)}ms for 100 scroll events`);
      expect(scrollTime).toBeLessThan(1000); // Should handle rapid scrolling
    });
  });

  describe('Concurrent Operations Load Tests', () => {
    it('handles 1000 concurrent API requests', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      // Mock API with realistic delay
      vi.mocked(adminApiService.getUsers).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return {
          success: true,
          data: generateMassiveDataset(10, 'users'),
          pagination: { total: 10, page: 1, limit: 10, totalPages: 1 },
        };
      });

      const operations = Array.from({ length: 1000 }, () => 
        () => adminApiService.getUsers({ page: 1, limit: 10, search: '', filters: {} })
      );

      const start = performance.now();
      const results = await simulateHighLoad(operations, 50); // 50 concurrent requests
      const totalTime = performance.now() - start;

      console.log(`1000 concurrent requests completed in: ${totalTime.toFixed(2)}ms`);
      
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const failedRequests = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Successful: ${successfulRequests}, Failed: ${failedRequests}`);
      
      // Should handle most requests successfully
      expect(successfulRequests).toBeGreaterThan(950); // At least 95% success rate
      expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds
    });

    it('handles concurrent bulk operations', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.bulkUpdateAgents).mockImplementation(async ({ agentIds }) => {
        // Simulate processing time based on batch size
        await new Promise(resolve => setTimeout(resolve, agentIds.length * 5));
        return {
          success: true,
          data: { successful: agentIds.length, failed: [] },
        };
      });

      // Create 100 bulk operations, each with 50 agents
      const bulkOperations = Array.from({ length: 100 }, (_, i) => 
        () => adminApiService.bulkUpdateAgents({
          agentIds: Array.from({ length: 50 }, (_, j) => `agent-${i * 50 + j}`),
          action: 'activate',
        })
      );

      const start = performance.now();
      const results = await simulateHighLoad(bulkOperations, 10); // 10 concurrent bulk ops
      const totalTime = performance.now() - start;

      console.log(`100 bulk operations (5000 agents total) completed in: ${totalTime.toFixed(2)}ms`);
      
      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOps).toBe(100); // All operations should succeed
      expect(totalTime).toBeLessThan(60000); // Complete within 1 minute
    });
  });

  describe('Memory Stress Tests', () => {
    it('handles memory pressure with large datasets', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      const TestWrapper = createTestWrapper();
      
      // Create multiple large datasets
      const datasets = Array.from({ length: 10 }, (_, i) => 
        generateMassiveDataset(1000, i % 2 === 0 ? 'users' : 'agents')
      );

      let maxMemoryUsage = 0;
      const memoryReadings = [];

      for (let i = 0; i < datasets.length; i++) {
        const dataset = datasets[i];
        const isUsers = i % 2 === 0;
        
        if (isUsers) {
          vi.mocked(adminApiService.getUsers).mockResolvedValue({
            success: true,
            data: dataset,
            pagination: { total: dataset.length, page: 1, limit: 1000, totalPages: 1 },
          });
        } else {
          vi.mocked(adminApiService.getAgents).mockResolvedValue({
            success: true,
            data: dataset,
            pagination: { total: dataset.length, page: 1, limit: 1000, totalPages: 1 },
          });
        }

        const { unmount } = render(
          isUsers ? <UserManagement /> : <AgentManagement />,
          { wrapper: TestWrapper }
        );

        await waitFor(() => {
          const firstItem = isUsers ? 'User 0' : 'Agent 0';
          expect(screen.getByText(firstItem)).toBeInTheDocument();
        });

        const currentMemory = measureMemoryUsage();
        if (currentMemory) {
          const memoryMB = currentMemory.used / 1024 / 1024;
          memoryReadings.push(memoryMB);
          maxMemoryUsage = Math.max(maxMemoryUsage, memoryMB);
        }

        unmount();
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Max memory usage: ${maxMemoryUsage.toFixed(2)}MB`);
      console.log(`Memory readings: ${memoryReadings.map(m => m.toFixed(2)).join(', ')}MB`);
      
      // Should not exceed reasonable memory limits
      expect(maxMemoryUsage).toBeLessThan(500); // Less than 500MB
      
      // Memory should not continuously increase (memory leak check)
      const firstHalf = memoryReadings.slice(0, 5);
      const secondHalf = memoryReadings.slice(5);
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not be significantly higher (indicating memory leaks)
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 2);
    });

    it('handles rapid component creation and destruction', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      const TestWrapper = createTestWrapper();
      
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: generateMassiveDataset(500, 'users'),
        pagination: { total: 500, page: 1, limit: 500, totalPages: 1 },
      });

      const initialMemory = measureMemoryUsage();
      const componentLifecycles = [];

      // Rapidly create and destroy components
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });
        
        await waitFor(() => {
          expect(screen.getByTestId('user-management')).toBeInTheDocument();
        });
        
        const mountTime = performance.now() - start;
        
        const unmountStart = performance.now();
        unmount();
        const unmountTime = performance.now() - unmountStart;
        
        componentLifecycles.push({ mount: mountTime, unmount: unmountTime });
        
        // Brief pause to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const finalMemory = measureMemoryUsage();
      
      const avgMountTime = componentLifecycles.reduce((sum, cycle) => sum + cycle.mount, 0) / componentLifecycles.length;
      const avgUnmountTime = componentLifecycles.reduce((sum, cycle) => sum + cycle.unmount, 0) / componentLifecycles.length;
      
      console.log(`Average mount time: ${avgMountTime.toFixed(2)}ms`);
      console.log(`Average unmount time: ${avgUnmountTime.toFixed(2)}ms`);
      
      if (initialMemory && finalMemory) {
        const memoryDiff = (finalMemory.used - initialMemory.used) / 1024 / 1024;
        console.log(`Memory difference after 50 cycles: ${memoryDiff.toFixed(2)}MB`);
        
        // Should not have significant memory increase after many cycles
        expect(memoryDiff).toBeLessThan(50); // Less than 50MB increase
      }
      
      // Component lifecycle should remain efficient
      expect(avgMountTime).toBeLessThan(1000); // Less than 1 second average mount
      expect(avgUnmountTime).toBeLessThan(100); // Less than 100ms average unmount
    });
  });

  describe('Network Load Tests', () => {
    it('handles network congestion and timeouts', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      let requestCount = 0;
      vi.mocked(adminApiService.getUsers).mockImplementation(async () => {
        requestCount++;
        
        // Simulate network congestion - some requests are slow, some fail
        const delay = Math.random() * 5000; // 0-5 second delay
        
        if (delay > 4000) {
          // Simulate timeout
          throw new Error('Request timeout');
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return {
          success: true,
          data: generateMassiveDataset(100, 'users'),
          pagination: { total: 100, page: 1, limit: 100, totalPages: 1 },
        };
      });

      const TestWrapper = createTestWrapper();
      const requests = [];
      
      // Make 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          render(<UserManagement />, { wrapper: TestWrapper })
        );
      }

      const start = performance.now();
      const results = await Promise.allSettled(
        requests.map(async ({ unmount }) => {
          try {
            await waitFor(() => {
              expect(screen.getByText('User 0')).toBeInTheDocument();
            }, { timeout: 10000 });
            unmount();
            return 'success';
          } catch (error) {
            unmount();
            throw error;
          }
        })
      );
      
      const totalTime = performance.now() - start;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Network load test: ${successCount} success, ${failureCount} failures in ${totalTime.toFixed(2)}ms`);
      console.log(`Total API requests made: ${requestCount}`);
      
      // Should handle network issues gracefully
      expect(successCount).toBeGreaterThan(10); // At least 50% success rate
      expect(totalTime).toBeLessThan(15000); // Complete within 15 seconds
    });

    it('handles API rate limiting gracefully', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      let requestCount = 0;
      const rateLimitThreshold = 10;
      
      vi.mocked(adminApiService.getUsers).mockImplementation(async () => {
        requestCount++;
        
        if (requestCount > rateLimitThreshold) {
          throw {
            response: {
              status: 429,
              data: { message: 'Rate limit exceeded' },
              headers: { 'retry-after': '1' },
            },
          };
        }
        
        return {
          success: true,
          data: generateMassiveDataset(50, 'users'),
          pagination: { total: 50, page: 1, limit: 50, totalPages: 1 },
        };
      });

      const TestWrapper = createTestWrapper();
      const operations = Array.from({ length: 20 }, () => 
        async () => {
          const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });
          try {
            await waitFor(() => {
              expect(screen.getByText('User 0')).toBeInTheDocument();
            }, { timeout: 5000 });
            unmount();
            return 'success';
          } catch (error) {
            unmount();
            // Check if it's a rate limit error
            if (error.message?.includes('rate limit')) {
              return 'rate_limited';
            }
            throw error;
          }
        }
      );

      const results = await simulateHighLoad(operations, 5);
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === 'success').length;
      const rateLimitedCount = results.filter(r => r.status === 'fulfilled' && r.value === 'rate_limited').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Rate limiting test: ${successCount} success, ${rateLimitedCount} rate limited, ${errorCount} errors`);
      
      // Should handle rate limiting appropriately
      expect(successCount).toBe(rateLimitThreshold);
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(errorCount).toBe(0); // Should not have unhandled errors
    });
  });

  describe('UI Responsiveness Under Load', () => {
    it('maintains UI responsiveness during heavy operations', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      const TestWrapper = createTestWrapper();
      
      // Mock slow API response
      vi.mocked(adminApiService.getUsers).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        return {
          success: true,
          data: generateMassiveDataset(1000, 'users'),
          pagination: { total: 1000, page: 1, limit: 1000, totalPages: 1 },
        };
      });

      render(<UserManagement />, { wrapper: TestWrapper });
      
      // Test UI interactions while loading
      const searchInput = screen.getByPlaceholderText(/search users/i);
      
      const interactionStart = performance.now();
      
      // Simulate user interactions during loading
      await userEvent.type(searchInput, 'test search');
      
      const interactionTime = performance.now() - interactionStart;
      
      console.log(`UI interaction time during load: ${interactionTime.toFixed(2)}ms`);
      
      // UI should remain responsive even during heavy operations
      expect(interactionTime).toBeLessThan(1000); // Less than 1 second for typing
      expect(searchInput).toHaveValue('test search');
      
      // Loading indicator should be present
      expect(screen.getByTestId('user-management-loading')).toBeInTheDocument();
    });

    it('handles smooth scrolling with large datasets', async () => {
      const largeDataset = generateMassiveDataset(10000, 'agents');
      const TestWrapper = createTestWrapper();
      
      render(
        <VirtualizedTable
          data={largeDataset}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
          ]}
          rowHeight={50}
          height={600}
        />,
        { wrapper: TestWrapper }
      );

      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      const scrollEvents = [];
      
      // Measure scroll performance
      for (let i = 0; i < 100; i++) {
        const scrollStart = performance.now();
        fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 50 } });
        const scrollTime = performance.now() - scrollStart;
        scrollEvents.push(scrollTime);
      }
      
      const avgScrollTime = scrollEvents.reduce((sum, time) => sum + time, 0) / scrollEvents.length;
      const maxScrollTime = Math.max(...scrollEvents);
      
      console.log(`Average scroll time: ${avgScrollTime.toFixed(2)}ms`);
      console.log(`Max scroll time: ${maxScrollTime.toFixed(2)}ms`);
      
      // Scrolling should be smooth and fast
      expect(avgScrollTime).toBeLessThan(16); // Less than one frame at 60fps
      expect(maxScrollTime).toBeLessThan(50); // No scroll event should take more than 50ms
    });
  });
});