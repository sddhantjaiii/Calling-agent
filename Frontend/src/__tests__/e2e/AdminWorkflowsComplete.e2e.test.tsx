import { test, expect, Page } from '@playwright/test';
import { vi, describe, beforeEach, afterEach } from 'vitest';

// Mock data for testing
const mockAdminUser = {
  id: '1',
  email: 'admin@test.com',
  role: 'admin',
  name: 'Test Admin',
};

const mockSuperAdminUser = {
  id: '2',
  email: 'superadmin@test.com',
  role: 'super_admin',
  name: 'Super Admin',
};

const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    status: 'active',
    registrationDate: '2024-01-01',
    lastLogin: '2024-01-15',
    agentCount: 3,
    callCount: 150,
    creditsUsed: 500,
    creditsRemaining: 1500,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user',
    status: 'inactive',
    registrationDate: '2024-01-05',
    lastLogin: '2024-01-10',
    agentCount: 1,
    callCount: 25,
    creditsUsed: 100,
    creditsRemaining: 900,
  },
];

const mockAgents = [
  {
    id: '1',
    name: 'Sales Agent',
    owner: 'john@example.com',
    type: 'outbound',
    status: 'active',
    creationDate: '2024-01-01',
    performanceMetrics: {
      callsToday: 25,
      successRate: 85,
      averageDuration: 180,
    },
    healthStatus: 'healthy',
  },
  {
    id: '2',
    name: 'Support Agent',
    owner: 'jane@example.com',
    type: 'inbound',
    status: 'inactive',
    creationDate: '2024-01-05',
    performanceMetrics: {
      callsToday: 10,
      successRate: 92,
      averageDuration: 240,
    },
    healthStatus: 'warning',
  },
];

describe('Admin Panel E2E Workflows', () => {
  let page: Page;

  beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock API responses
    await page.route('**/api/admin/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAdminUser),
      });
    });

    await page.route('**/api/admin/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10,
        }),
      });
    });

    await page.route('**/api/admin/agents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agents: mockAgents,
          total: mockAgents.length,
          page: 1,
          limit: 10,
        }),
      });
    });

    await page.route('**/api/admin/stats/system', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: { total: 1000, active: 850, newThisMonth: 150 },
          agents: { total: 2500, active: 2000, healthyPercentage: 95 },
          calls: { totalThisMonth: 50000, successRate: 92, averageDuration: 180 },
          system: { uptime: 99.9, responseTime: 150, errorRate: 0.1 },
        }),
      });
    });

    // Navigate to admin panel
    await page.goto('/admin');
  });

  afterEach(async () => {
    await page.close();
  });

  test('Complete Admin Dashboard Workflow', async () => {
    // Verify admin dashboard loads
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Check dashboard metrics are displayed
    await expect(page.locator('text=1,000')).toBeVisible(); // Total users
    await expect(page.locator('text=2,500')).toBeVisible(); // Total agents
    await expect(page.locator('text=50,000')).toBeVisible(); // Total calls
    
    // Verify charts are rendered
    await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    
    // Test refresh functionality
    await page.click('[data-testid="refresh-dashboard"]');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });

  test('Complete User Management Workflow', async () => {
    // Navigate to user management
    await page.click('text=Users');
    await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
    
    // Verify user list is displayed
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=jane@example.com')).toBeVisible();
    
    // Test user search
    await page.fill('[data-testid="user-search"]', 'John');
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).not.toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="user-search"]', '');
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    
    // Test user details modal
    await page.click('[data-testid="user-details-1"]');
    await expect(page.locator('[data-testid="user-details-modal"]')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=150 calls')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="user-details-modal"]')).not.toBeVisible();
    
    // Test credit adjustment
    await page.click('[data-testid="adjust-credits-1"]');
    await expect(page.locator('[data-testid="credit-adjust-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="credit-amount"]', '100');
    await page.fill('[data-testid="credit-reason"]', 'Test adjustment');
    
    // Mock the credit adjustment API
    await page.route('**/api/admin/users/1/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    await page.click('[data-testid="submit-credit-adjustment"]');
    await expect(page.locator('text=Credits adjusted successfully')).toBeVisible();
    
    // Test user status toggle
    await page.route('**/api/admin/users/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    await page.click('[data-testid="user-status-toggle-1"]');
    await expect(page.locator('text=User status updated')).toBeVisible();
  });

  test('Complete Agent Management Workflow', async () => {
    // Navigate to agent management
    await page.click('text=Agents');
    await expect(page.locator('[data-testid="agent-management"]')).toBeVisible();
    
    // Verify agent list is displayed
    await expect(page.locator('text=Sales Agent')).toBeVisible();
    await expect(page.locator('text=Support Agent')).toBeVisible();
    
    // Test agent filtering
    await page.selectOption('[data-testid="agent-status-filter"]', 'active');
    await expect(page.locator('text=Sales Agent')).toBeVisible();
    await expect(page.locator('text=Support Agent')).not.toBeVisible();
    
    // Reset filter
    await page.selectOption('[data-testid="agent-status-filter"]', 'all');
    await expect(page.locator('text=Support Agent')).toBeVisible();
    
    // Test agent details modal
    await page.click('[data-testid="agent-details-1"]');
    await expect(page.locator('[data-testid="agent-details-modal"]')).toBeVisible();
    await expect(page.locator('text=Sales Agent')).toBeVisible();
    await expect(page.locator('text=85% success rate')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    
    // Test bulk operations
    await page.check('[data-testid="agent-checkbox-1"]');
    await page.check('[data-testid="agent-checkbox-2"]');
    
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    
    // Mock bulk update API
    await page.route('**/api/admin/agents/bulk', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ successful: 2, failed: [] }),
      });
    });
    
    await page.click('[data-testid="bulk-activate"]');
    await expect(page.locator('text=2 agents activated successfully')).toBeVisible();
  });

  test('Complete System Analytics Workflow', async () => {
    // Navigate to analytics
    await page.click('text=Analytics');
    await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible();
    
    // Verify analytics data is displayed
    await expect(page.locator('[data-testid="analytics-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-charts"]')).toBeVisible();
    
    // Test timeframe selection
    await page.selectOption('[data-testid="timeframe-select"]', '7d');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    
    // Test report generation
    await page.route('**/api/admin/reports/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reportId: 'report-123',
          downloadUrl: '/api/reports/report-123/download',
        }),
      });
    });
    
    await page.click('[data-testid="generate-report"]');
    await expect(page.locator('text=Report generated successfully')).toBeVisible();
    
    // Test export functionality
    await page.click('[data-testid="export-data"]');
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="confirm-export"]');
    
    // Verify download initiated
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });

  test('Complete Audit Log Workflow', async () => {
    // Mock audit logs API
    await page.route('**/api/admin/audit-logs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [
            {
              id: '1',
              adminUserId: '1',
              adminUserEmail: 'admin@test.com',
              action: 'USER_UPDATE',
              resourceType: 'user',
              resourceId: '1',
              targetUserId: '1',
              targetUserEmail: 'john@example.com',
              details: { field: 'status', oldValue: 'active', newValue: 'inactive' },
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0...',
              timestamp: '2024-01-15T10:30:00Z',
              success: true,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      });
    });
    
    // Navigate to audit logs
    await page.click('text=Audit Logs');
    await expect(page.locator('[data-testid="audit-logs"]')).toBeVisible();
    
    // Verify audit log entries are displayed
    await expect(page.locator('text=USER_UPDATE')).toBeVisible();
    await expect(page.locator('text=john@example.com')).toBeVisible();
    
    // Test audit log filtering
    await page.selectOption('[data-testid="action-filter"]', 'USER_UPDATE');
    await expect(page.locator('text=USER_UPDATE')).toBeVisible();
    
    // Test date range filtering
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-01-31');
    await page.click('[data-testid="apply-filters"]');
    
    // Test audit log details
    await page.click('[data-testid="audit-log-details-1"]');
    await expect(page.locator('[data-testid="audit-log-details-modal"]')).toBeVisible();
    await expect(page.locator('text=192.168.1.1')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
  });

  test('Complete Configuration Management Workflow (Super Admin)', async () => {
    // Mock super admin user
    await page.route('**/api/admin/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuperAdminUser),
      });
    });
    
    // Reload page to get super admin permissions
    await page.reload();
    
    // Navigate to configuration
    await page.click('text=Configuration');
    await expect(page.locator('[data-testid="system-configuration"]')).toBeVisible();
    
    // Test API key management
    await page.click('[data-testid="api-keys-tab"]');
    await expect(page.locator('[data-testid="api-key-manager"]')).toBeVisible();
    
    // Mock API keys data
    await page.route('**/api/admin/api-keys', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          apiKeys: [
            {
              id: '1',
              name: 'Primary Key',
              key: 'sk-***************',
              isDefault: true,
              assignedUsers: ['user1', 'user2'],
              usageStats: {
                totalCalls: 1000,
                remainingQuota: 9000,
                costThisMonth: 150,
              },
              status: 'active',
            },
          ],
        }),
      });
    });
    
    await expect(page.locator('text=Primary Key')).toBeVisible();
    await expect(page.locator('text=sk-***************')).toBeVisible();
    
    // Test feature flag management
    await page.click('[data-testid="feature-flags-tab"]');
    await expect(page.locator('[data-testid="feature-flag-manager"]')).toBeVisible();
    
    // Mock feature flags data
    await page.route('**/api/admin/feature-flags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          flags: [
            {
              id: 'dashboard_kpis',
              name: 'Dashboard KPIs',
              description: 'Advanced dashboard KPI features',
              isEnabled: false,
              scope: 'user',
              targetUsers: [],
            },
          ],
        }),
      });
    });
    
    await expect(page.locator('text=Dashboard KPIs')).toBeVisible();
    
    // Test feature flag toggle
    await page.route('**/api/admin/feature-flags/dashboard_kpis', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    await page.click('[data-testid="feature-flag-toggle-dashboard_kpis"]');
    await expect(page.locator('text=Feature flag updated')).toBeVisible();
  });

  test('Error Handling and Recovery Workflow', async () => {
    // Test network error handling
    await page.route('**/api/admin/users**', async (route) => {
      await route.abort('failed');
    });
    
    await page.click('text=Users');
    await expect(page.locator('text=Error loading users')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.route('**/api/admin/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10,
        }),
      });
    });
    
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('text=John Doe')).toBeVisible();
    
    // Test unauthorized access
    await page.route('**/api/admin/users**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });
    
    await page.reload();
    await page.click('text=Users');
    await expect(page.locator('text=Unauthorized access')).toBeVisible();
  });

  test('Responsive Design Workflow', async () => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify tablet layout
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Verify desktop layout
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
  });

  test('Accessibility Workflow', async () => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test skip links
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeFocused();
    
    // Test ARIA labels and roles
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    // Test screen reader announcements
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    
    // Test high contrast mode
    await page.click('[data-testid="accessibility-toolbar"]');
    await page.click('[data-testid="high-contrast-toggle"]');
    await expect(page.locator('body')).toHaveClass(/high-contrast/);
  });
});