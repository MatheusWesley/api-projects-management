# Scripts Documentation

This directory contains utility scripts for managing the Project Management API application.

## Available Scripts

### Database Management

#### `init-db.ts`
Initializes the database by creating all required tables and indexes.

```bash
bun run db:init
```

**Features:**
- Creates SQLite database file
- Sets up all tables (users, projects, work_items, sprints)
- Creates indexes for performance
- Enables foreign key constraints

#### `seed-data.ts`
Populates the database with sample data for development and testing.

```bash
bun run db:seed
```

**Features:**
- Only runs in development/test environments
- Creates sample users, projects, and work items
- Skips if data already exists
- Provides login credentials for testing

**Sample Data:**
- 4 users (admin, manager, 2 developers)
- 3 projects with different statuses
- 7 work items across projects
- Realistic project management scenarios

#### Database Reset
```bash
bun run db:reset    # Initialize + seed
```

### Environment Management

#### `setup-env.ts`
Creates `.env` files with appropriate defaults for different environments.

```bash
bun run setup:env development
bun run setup:env production --force
bun run setup:env test
```

**Environments:**
- `development` - Local development with debug logging
- `test` - Testing with in-memory database
- `production` - Production with security defaults

**Features:**
- Backs up existing `.env` files
- Environment-specific defaults
- Security warnings for production
- Organized configuration sections

#### `validate-config.ts`
Validates environment configuration before starting the application.

```bash
bun run validate
```

**Validation Checks:**
- JWT secret strength (production)
- Port number validity
- Database path accessibility
- CORS configuration
- Bcrypt rounds security
- JWT expiration format

### Complete Setup

#### `complete-setup.ts`
Comprehensive setup script that handles full application initialization.

```bash
bun run setup              # Development setup
bun run setup:prod         # Production setup
bun run setup:test         # Test setup
```

**Options:**
- `--skip-deps` - Skip dependency installation
- `--skip-db` - Skip database initialization
- `--skip-seed` - Skip database seeding
- `--force` - Force overwrite existing files

**Process:**
1. Install dependencies
2. Setup environment configuration
3. Create required directories
4. Validate configuration
5. Initialize database
6. Seed sample data (dev/test only)
7. Final validation

## Usage Examples

### First-time Setup
```bash
# Complete development setup
bun run setup

# Production setup
bun run setup:prod --force
```

### Development Workflow
```bash
# Reset database with fresh data
bun run db:reset

# Validate current configuration
bun run validate

# Start development server
bun run dev
```

### Production Deployment
```bash
# Setup production environment
bun run setup:prod

# Validate production config
bun run validate

# Start production server
bun run start
```

### Testing Setup
```bash
# Setup test environment
bun run setup:test

# Run tests
bun test
```

## Script Dependencies

### Required Files
- `src/config/env.ts` - Environment configuration
- `src/config/database.ts` - Database utilities
- `src/utils/password.ts` - Password hashing utilities

### Generated Files
- `.env` - Environment configuration
- `data/database.sqlite` - SQLite database file
- `.env.backup.*` - Backup files

### Required Directories
- `data/` - Database storage
- `logs/` - Application logs (created by complete-setup)

## Environment Variables

See `src/config/README.md` for detailed environment variable documentation.

## Troubleshooting

### Common Issues

#### "Database not initialized"
```bash
bun run db:init
```

#### "JWT_SECRET must be set in production"
```bash
bun run setup:env production --force
# Edit .env and set a secure JWT_SECRET
```

#### "Permission denied" (database)
```bash
# Ensure data directory exists and is writable
mkdir -p data
chmod 755 data
```

#### Configuration validation errors
```bash
bun run validate
# Fix reported issues in .env file
```

### Debug Mode
Set `LOG_LEVEL=debug` in `.env` for detailed logging during script execution.

### Script Execution
All scripts can be run directly with Bun:
```bash
bun run src/scripts/script-name.ts [arguments]
```

Or through npm scripts:
```bash
bun run script-alias
```

## Development

### Adding New Scripts
1. Create script in `src/scripts/`
2. Add shebang: `#!/usr/bin/env bun`
3. Export main function for testing
4. Add to `package.json` scripts
5. Update this README

### Script Structure
```typescript
#!/usr/bin/env bun
/**
 * Script description
 */

async function mainFunction() {
  // Implementation
}

// Run if called directly
if (import.meta.main) {
  await mainFunction();
}

export { mainFunction };
```