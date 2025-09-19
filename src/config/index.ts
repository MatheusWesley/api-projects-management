// Main configuration module
export * from './database.js';
export * from './env.js';

import { config, isDevelopment, isProduction, isTest } from './env.js';
import { initializeDatabase, getDatabase, closeDatabase } from './database.js';

// Application configuration object
export const appConfig = {
  ...config,
  // Helper methods
  isDevelopment,
  isProduction,
  isTest,
  
  // Database methods
  database: {
    initialize: () => initializeDatabase(config.database),
    get: getDatabase,
    close: closeDatabase,
  },
} as const;

// Initialize application configuration
export function initializeApp() {
  console.log(`🚀 Starting application in ${config.nodeEnv} mode`);
  console.log(`📊 Database: ${config.database.filename}`);
  console.log(`🔐 JWT expires in: ${config.jwtExpiresIn}`);
  
  // Initialize database
  const db = appConfig.database.initialize();
  console.log('✅ Database initialized successfully');
  
  return {
    config: appConfig,
    database: db,
  };
}