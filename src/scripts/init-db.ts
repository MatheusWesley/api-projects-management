#!/usr/bin/env bun
/**
 * Database initialization script
 * Creates database tables and sets up initial schema
 */

import { initializeApp } from '../config/index.js';
import { config } from '../config/env.js';

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Initialize the application (which creates the database and tables)
    const { database } = initializeApp();
    
    console.log('✅ Database initialization completed successfully');
    console.log(`📍 Database location: ${config.database.filename}`);
    
    // Verify tables were created
    const tables = database.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log('📋 Created tables:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.name}`);
    });
    
    // Close database connection
    database.close();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  await initializeDatabase();
}

export { initializeDatabase };