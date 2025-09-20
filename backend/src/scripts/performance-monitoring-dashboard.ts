#!/usr/bin/env ts-node

/**
 * Performance Monitoring Dashboard
 * 
 * Continuous monitoring of system performance metrics:
 * - Real-time query performance tracking
 * - Trigger execution monitoring
 * - Cache performance metrics
 * - API response time monitoring
 */

import { Pool } from 'pg';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

interface PerformanceLog {
  timestamp: string;
  category: string;
  operation: string;
  duration: number;
  threshold: number;
  passed: boolean;
  metadata?: any;
}

class PerformanceMonitor {
  private pool: Pool;
  private logs: PerformanceLog[] = [];
  private isRunning = false;
  private logFile: string;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_calling_agent',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });

    this.logFile = path.join(__dirname, '../../logs/performance-monitoring.json');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private async logPerformance(
    category: string,
    operation: string,
    duration: number,
    threshold: number,
    metadata?: any
  ): Promise<void> {
    const log: PerformanceLog = {
      timestamp: new Date().toISOString(),
      category,
      operation,
      duration,
      threshold,
      passed: duration <= threshold,
      metadata
    };

    // Log to file
    const logLine = JSON.stringify(log) + '\n';
    const logFile = path.join(this.logDir, `performance-${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      await fs.promises.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write performance log:', error);
    }
  }
}

// Export the monitor instance
export const performanceMonitor = new PerformanceMonitor();