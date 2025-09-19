#!/usr/bin/env bun
/**
 * Configuration validation script
 * Validates environment configuration before starting the application
 */

import { config, isProduction, isDevelopment, isTest } from '../config/env.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateConfiguration(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // JWT Secret validation
  if (isProduction()) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    } else if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production');
    }
  } else if (isDevelopment()) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
      warnings.push('Using default JWT_SECRET in development. Set JWT_SECRET in .env file');
    }
  }

  // Port validation
  if (config.port < 0 || config.port > 65535) {
    errors.push(`Invalid port number: ${config.port}. Must be between 0-65535`);
  }

  // Database validation
  if (isProduction() && config.database.filename === './data/database.sqlite') {
    warnings.push('Using default database path in production. Consider setting DB_PATH');
  }

  if (config.database.filename !== ':memory:' && !config.database.filename.includes('/')) {
    warnings.push('Database path should be absolute or include directory structure');
  }

  // CORS validation
  if (isProduction()) {
    if (config.cors.origin.includes('localhost')) {
      warnings.push('CORS origin includes localhost in production environment');
    }
    if (Array.isArray(config.cors.origin) && config.cors.origin.length === 0) {
      warnings.push('No CORS origins configured in production');
    }
  }

  // Bcrypt rounds validation
  if (config.bcryptRounds < 4) {
    errors.push('BCRYPT_ROUNDS must be at least 4');
  }
  if (isProduction() && config.bcryptRounds < 10) {
    warnings.push('BCRYPT_ROUNDS should be at least 10 in production for security');
  }

  // JWT expiration validation
  const validExpirationPattern = /^\d+[smhdw]$/;
  if (!validExpirationPattern.test(config.jwtExpiresIn)) {
    errors.push(`Invalid JWT_EXPIRES_IN format: ${config.jwtExpiresIn}. Use format like '24h', '7d', '30m'`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function printValidationResults(result: ValidationResult) {
  console.log('🔍 Configuration Validation Results\n');
  
  // Print environment info
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database.filename}`);
  console.log(`JWT Expires: ${config.jwtExpiresIn}`);
  console.log(`Bcrypt Rounds: ${config.bcryptRounds}`);
  console.log(`Log Level: ${config.logging.level}`);
  console.log('');

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
    console.log('');
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
    console.log('');
  }

  // Print result
  if (result.valid) {
    console.log('✅ Configuration is valid!');
  } else {
    console.log('❌ Configuration has errors that must be fixed before starting the application.');
  }
}

async function validateConfig() {
  try {
    console.log('🔧 Validating application configuration...\n');
    
    const result = validateConfiguration();
    printValidationResults(result);
    
    if (!result.valid) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  await validateConfig();
}

export { validateConfiguration, validateConfig };