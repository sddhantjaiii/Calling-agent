import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/__tests__/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      '.vscode/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/components/admin/**/*.{ts,tsx}',
        'src/services/admin*.{ts,tsx}',
        'src/contexts/AdminContext.tsx',
        'src/hooks/useAdmin*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/admin/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/services/admin*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    maxConcurrency: 5,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    logHeapUsage: true,
    reporters: [
      'default',
      'json',
      'html',
      ['junit', { outputFile: './test-reports/junit.xml' }],
    ],
    outputFile: {
      json: './test-reports/test-results.json',
      html: './test-reports/test-results.html',
    },
    // Performance testing configuration
    benchmark: {
      include: ['src/__tests__/performance/**/*.bench.{ts,tsx}'],
      exclude: ['node_modules/**'],
      reporters: ['default', 'json'],
      outputFile: {
        json: './test-reports/benchmark-results.json',
      },
    },
    // Security testing configuration
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:3000/api',
      VITE_ENABLE_SECURITY_HEADERS: 'true',
      VITE_ENABLE_CSP: 'true',
    },
    // Mock configuration
    deps: {
      inline: [
        '@testing-library/react',
        '@testing-library/user-event',
      ],
    },
    // Browser testing for E2E tests
    browser: {
      enabled: false, // Enable for E2E tests
      name: 'chromium',
      provider: 'playwright',
      headless: true,
      screenshotOnFailure: true,
      video: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/services': resolve(__dirname, './src/services'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/contexts': resolve(__dirname, './src/contexts'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
    },
  },
  define: {
    global: 'globalThis',
  },
});