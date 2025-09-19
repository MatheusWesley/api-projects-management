#!/usr/bin/env bun

/**
 * Performance monitoring script for the Project Management API
 * This script can be used to monitor API performance and identify bottlenecks
 */

import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async measureEndpoint(
    endpoint: string,
    method: string = 'GET',
    headers: Record<string, string> = {},
    body?: any
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      const metric: PerformanceMetrics = {
        endpoint,
        method,
        responseTime: endTime - startTime,
        statusCode: response.status,
        timestamp: new Date(),
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
        }
      };

      this.metrics.push(metric);
      return metric;
    } catch (error) {
      const endTime = performance.now();
      const metric: PerformanceMetrics = {
        endpoint,
        method,
        responseTime: endTime - startTime,
        statusCode: 0,
        timestamp: new Date(),
        memoryUsage: process.memoryUsage()
      };

      this.metrics.push(metric);
      throw error;
    }
  }

  async runPerformanceTest(token?: string): Promise<void> {
    console.log('🚀 Starting Performance Test...\n');

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    // Test basic endpoints
    const tests = [
      { endpoint: '/', method: 'GET', name: 'Health Check' },
      { endpoint: '/health', method: 'GET', name: 'Health Status' },
      { endpoint: '/swagger', method: 'GET', name: 'API Documentation' }
    ];

    // Add authenticated endpoints if token is provided
    if (token) {
      tests.push(
        { endpoint: '/projects', method: 'GET', name: 'List Projects' },
        { endpoint: '/projects', method: 'POST', name: 'Create Project', body: { name: 'Test Project', description: 'Performance test project' } }
      );
    }

    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const metric = await this.measureEndpoint(
          test.endpoint,
          test.method,
          authHeaders,
          (test as any).body
        );

        console.log(`  ✅ ${test.method} ${test.endpoint}`);
        console.log(`     Response Time: ${metric.responseTime.toFixed(2)}ms`);
        console.log(`     Status Code: ${metric.statusCode}`);
        console.log(`     Memory Delta: ${(metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB\n`);
      } catch (error) {
        console.log(`  ❌ ${test.method} ${test.endpoint} - Error: ${error}\n`);
      }
    }
  }

  async runLoadTest(endpoint: string, concurrency: number = 10, requests: number = 100, token?: string): Promise<void> {
    console.log(`🔥 Running Load Test: ${concurrency} concurrent requests, ${requests} total requests\n`);

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const promises: Promise<PerformanceMetrics>[] = [];

    const startTime = performance.now();

    for (let i = 0; i < requests; i++) {
      const promise = this.measureEndpoint(endpoint, 'GET', authHeaders);
      promises.push(promise);

      // Control concurrency
      if (promises.length >= concurrency) {
        await Promise.all(promises.splice(0, concurrency));
      }
    }

    // Wait for remaining requests
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Calculate statistics
    const recentMetrics = this.metrics.slice(-requests);
    const responseTimes = recentMetrics.map(m => m.responseTime);
    const successfulRequests = recentMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 400);

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const successRate = (successfulRequests.length / requests) * 100;
    const requestsPerSecond = requests / (totalTime / 1000);

    console.log('📊 Load Test Results:');
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Requests/Second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
  }

  generateReport(): void {
    if (this.metrics.length === 0) {
      console.log('No metrics collected yet.');
      return;
    }

    console.log('\n📈 Performance Report:');
    console.log('='.repeat(50));

    // Group by endpoint
    const endpointGroups = this.metrics.reduce((groups, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);

    Object.entries(endpointGroups).forEach(([endpoint, metrics]) => {
      const responseTimes = metrics.map(m => m.responseTime);
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const minTime = Math.min(...responseTimes);
      const maxTime = Math.max(...responseTimes);
      const successRate = (metrics.filter(m => m.statusCode >= 200 && m.statusCode < 400).length / metrics.length) * 100;

      console.log(`\n${endpoint}:`);
      console.log(`  Requests: ${metrics.length}`);
      console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
      console.log(`  Avg Response Time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min Response Time: ${minTime.toFixed(2)}ms`);
      console.log(`  Max Response Time: ${maxTime.toFixed(2)}ms`);
    });

    // Overall statistics
    const allResponseTimes = this.metrics.map(m => m.responseTime);
    const overallAvg = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
    const overallSuccess = (this.metrics.filter(m => m.statusCode >= 200 && m.statusCode < 400).length / this.metrics.length) * 100;

    console.log('\n🎯 Overall Statistics:');
    console.log(`  Total Requests: ${this.metrics.length}`);
    console.log(`  Overall Success Rate: ${overallSuccess.toFixed(2)}%`);
    console.log(`  Overall Avg Response Time: ${overallAvg.toFixed(2)}ms`);
  }

  exportMetrics(filename: string = 'performance-metrics.json'): void {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(this.metrics, null, 2));
    console.log(`📁 Metrics exported to ${filename}`);
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  const baseUrl = args[1] || 'http://localhost:3001';
  const token = args[2]; // Optional JWT token

  const monitor = new PerformanceMonitor(baseUrl);

  switch (command) {
    case 'test':
      await monitor.runPerformanceTest(token);
      monitor.generateReport();
      break;

    case 'load':
      const endpoint = args[2] || '/health';
      const concurrency = parseInt(args[3]) || 10;
      const requests = parseInt(args[4]) || 100;
      await monitor.runLoadTest(endpoint, concurrency, requests, token);
      monitor.generateReport();
      break;

    case 'monitor':
      console.log('🔍 Starting continuous monitoring...');
      setInterval(async () => {
        try {
          await monitor.measureEndpoint('/health');
          console.log(`Health check completed at ${new Date().toISOString()}`);
        } catch (error) {
          console.error(`Health check failed: ${error}`);
        }
      }, 30000); // Every 30 seconds
      break;

    default:
      console.log('Usage:');
      console.log('  bun run src/scripts/performance-monitor.ts test [baseUrl] [token]');
      console.log('  bun run src/scripts/performance-monitor.ts load [baseUrl] [endpoint] [concurrency] [requests] [token]');
      console.log('  bun run src/scripts/performance-monitor.ts monitor [baseUrl] [token]');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { PerformanceMonitor, type PerformanceMetrics };