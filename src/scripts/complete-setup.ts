#!/usr/bin/env bun
/**
 * Complete application setup script
 * Handles full application setup from scratch
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface SetupOptions {
  environment: 'development' | 'test' | 'production';
  skipDependencies: boolean;
  skipDatabase: boolean;
  skipSeed: boolean;
  force: boolean;
}

function parseArgs(): SetupOptions {
  const args = process.argv.slice(2);
  
  return {
    environment: (args.find(arg => ['development', 'test', 'production'].includes(arg)) || 'development') as SetupOptions['environment'],
    skipDependencies: args.includes('--skip-deps'),
    skipDatabase: args.includes('--skip-db'),
    skipSeed: args.includes('--skip-seed'),
    force: args.includes('--force'),
  };
}

function runCommand(command: string, description: string): void {
  console.log(`🔧 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    process.exit(1);
  }
}

function ensureDirectories(): void {
  const directories = ['data', 'logs'];
  
  console.log('📁 Creating required directories...');
  directories.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`  - Created ${dir}/`);
    } else {
      console.log(`  - ${dir}/ already exists`);
    }
  });
  console.log('✅ Directory setup completed\n');
}

async function completeSetup() {
  try {
    const options = parseArgs();
    
    console.log('🚀 Project Management API - Complete Setup\n');
    console.log(`Environment: ${options.environment}`);
    console.log(`Skip dependencies: ${options.skipDependencies}`);
    console.log(`Skip database: ${options.skipDatabase}`);
    console.log(`Skip seed data: ${options.skipSeed}`);
    console.log(`Force overwrite: ${options.force}\n`);

    // Step 1: Install dependencies
    if (!options.skipDependencies) {
      runCommand('bun install', 'Installing dependencies');
    } else {
      console.log('⏭️  Skipping dependency installation\n');
    }

    // Step 2: Setup environment
    const envCommand = `bun run src/scripts/setup-env.ts ${options.environment}${options.force ? ' --force' : ''}`;
    runCommand(envCommand, `Setting up ${options.environment} environment`);

    // Step 3: Ensure required directories exist
    ensureDirectories();

    // Step 4: Validate configuration
    runCommand('bun run src/scripts/validate-config.ts', 'Validating configuration');

    // Step 5: Initialize database
    if (!options.skipDatabase) {
      runCommand('bun run src/scripts/init-db.ts', 'Initializing database');
    } else {
      console.log('⏭️  Skipping database initialization\n');
    }

    // Step 6: Seed database (only for development/test)
    if (!options.skipSeed && (options.environment === 'development' || options.environment === 'test')) {
      runCommand('bun run src/scripts/seed-data.ts', 'Seeding database with sample data');
    } else if (options.environment === 'production') {
      console.log('⏭️  Skipping seed data for production environment\n');
    } else {
      console.log('⏭️  Skipping database seeding\n');
    }

    // Step 7: Run final validation
    runCommand('bun run src/scripts/validate-config.ts', 'Final configuration validation');

    // Success message
    console.log('🎉 Setup completed successfully!\n');
    
    // Next steps
    console.log('📋 Next steps:');
    if (options.environment === 'development') {
      console.log('  - Run `bun run dev` to start development server');
      console.log('  - API will be available at http://localhost:3000');
      console.log('  - Use the seeded accounts to test authentication:');
      console.log('    • admin@example.com / admin123');
      console.log('    • manager@example.com / manager123');
      console.log('    • dev1@example.com / dev123');
    } else if (options.environment === 'production') {
      console.log('  - Review and update .env file with production values');
      console.log('  - Ensure JWT_SECRET is secure (32+ characters)');
      console.log('  - Update CORS_ORIGIN to your domain');
      console.log('  - Run `bun run start` to start production server');
    } else if (options.environment === 'test') {
      console.log('  - Run `bun test` to execute test suite');
      console.log('  - Tests will use in-memory database');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Show usage if no arguments or help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🚀 Project Management API - Complete Setup\n');
  console.log('Usage: bun run complete-setup [environment] [options]\n');
  console.log('Environments:');
  console.log('  development  - Local development setup (default)');
  console.log('  test         - Testing environment setup');
  console.log('  production   - Production environment setup\n');
  console.log('Options:');
  console.log('  --skip-deps   - Skip dependency installation');
  console.log('  --skip-db     - Skip database initialization');
  console.log('  --skip-seed   - Skip database seeding');
  console.log('  --force       - Force overwrite existing files');
  console.log('  --help, -h    - Show this help message\n');
  console.log('Examples:');
  console.log('  bun run complete-setup development');
  console.log('  bun run complete-setup production --force');
  console.log('  bun run complete-setup test --skip-seed');
  process.exit(0);
}

// Run if called directly
if (import.meta.main) {
  await completeSetup();
}

export { completeSetup };