import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../../src/app';

describe('Main Application Integration', () => {
  beforeAll(async () => {
    // Give the app a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(() => {
    // Clean up if needed
  });

  it('should respond to root endpoint', async () => {
    const response = await app.handle(new Request('http://localhost/'));
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.name).toBe('Project Management API');
    expect(data.version).toBe('1.0.0');
    expect(data.status).toBe('running');
  });

  it('should respond to health check endpoint', async () => {
    const response = await app.handle(new Request('http://localhost/health'));
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
    expect(data.memory).toBeDefined();
    expect(data.environment).toBeDefined();
  });

  it('should have swagger documentation endpoint', async () => {
    const response = await app.handle(new Request('http://localhost/swagger'));
    expect(response.status).toBe(200);
  });

  it('should handle CORS preflight requests', async () => {
    const response = await app.handle(new Request('http://localhost/auth/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    }));
    
    // CORS should be handled, status might be 200 or 204
    expect([200, 204]).toContain(response.status);
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await app.handle(new Request('http://localhost/unknown-route'));
    expect(response.status).toBe(404);
    
    const text = await response.text();
    expect(text).toBeTruthy(); // Should have some error response
  });

  it('should have authentication routes available', async () => {
    // Test login endpoint exists (should fail without credentials but not 404)
    const response = await app.handle(new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }));
    
    // Should not be 404, should be validation error
    expect(response.status).not.toBe(404);
  });

  it('should have project routes available', async () => {
    // Test projects endpoint exists (should fail without auth but not 404)
    const response = await app.handle(new Request('http://localhost/projects'));
    
    // Should not be 404, should be auth error
    expect(response.status).not.toBe(404);
  });

  it('should include request ID in responses', async () => {
    const response = await app.handle(new Request('http://localhost/health'));
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });
});