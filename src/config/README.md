# Configuration Documentation

This directory contains all configuration-related files for the Project Management API.

## Files Overview

- `env.ts` - Environment variable handling and validation
- `database.ts` - Database connection and schema management
- `index.ts` - Main configuration module that exports everything
- `README.md` - This documentation file

## Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and update the values as needed.

### Required Variables

#### JWT_SECRET
- **Description**: Secret key used for JWT token signing and verification
- **Required**: Yes (in production)
- **Default**: `dev-secret-key-not-for-production` (development only)
- **Production Requirements**: Must be at least 32 characters long
- **Example**: `your-super-secret-jwt-key-change-in-production-must-be-32-chars-minimum`

### Optional Variables

#### Server Configuration
- `PORT` - Server port (default: 3000, 0 for test)
- `NODE_ENV` - Environment mode: `development`, `test`, or `production`

#### JWT Configuration
- `JWT_EXPIRES_IN` - Token expiration time (default: `24h`)

#### Database Configuration
- `DB_PATH` - Database file path
  - Development: `./data/database.sqlite`
  - Test: `:memory:` (in-memory)
  - Production: `/app/data/database.sqlite`
- `DB_MAX_CONNECTIONS` - Maximum database connections (optional)

#### Security Configuration
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12, 4 for tests)

#### CORS Configuration
- `CORS_ORIGIN` - Allowed origins (comma-separated)
- `CORS_CREDENTIALS` - Allow credentials (`true`/`false`)

#### Logging Configuration
- `LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error`

## Environment-Specific Behavior

### Development
- Uses file-based SQLite database
- Allows weak JWT secrets
- Enables debug logging
- Permissive CORS settings

### Test
- Uses in-memory database
- Faster bcrypt rounds (4 instead of 12)
- Random port assignment
- Minimal logging

### Production
- Validates JWT secret strength
- Stricter security settings
- Info-level logging by default
- Requires explicit CORS configuration

## Database Management

### Initialization
```bash
# Initialize database tables
bun run db:init
```

### Seeding
```bash
# Add sample data (development/test only)
bun run db:seed
```

### Reset
```bash
# Initialize and seed database
bun run db:reset
```

### Complete Setup
```bash
# Install dependencies and setup database
bun run setup
```

## Usage in Code

### Basic Configuration
```typescript
import { appConfig } from '../config/index.js';

// Access configuration
console.log(appConfig.port);
console.log(appConfig.jwtSecret);
console.log(appConfig.database.filename);

// Environment checks
if (appConfig.isDevelopment()) {
  console.log('Running in development mode');
}
```

### Database Access
```typescript
import { appConfig } from '../config/index.js';

// Initialize application (includes database)
const { config, database } = initializeApp();

// Use database
const users = database.prepare('SELECT * FROM users').all();
```

### Environment-Specific Logic
```typescript
import { isDevelopment, isProduction, isTest } from '../config/env.js';

if (isDevelopment()) {
  // Development-only code
}

if (isProduction()) {
  // Production-only code
}

if (isTest()) {
  // Test-only code
}
```

## Security Considerations

### JWT Secret
- Must be at least 32 characters in production
- Should be cryptographically random
- Never commit secrets to version control
- Rotate regularly in production

### Database
- File permissions should be restricted in production
- Consider encryption at rest for sensitive data
- Regular backups recommended

### CORS
- Configure specific origins in production
- Avoid wildcard origins (`*`) in production
- Set credentials carefully based on requirements

## Troubleshooting

### Common Issues

#### "JWT_SECRET must be set in production"
- Set a strong JWT_SECRET environment variable
- Ensure it's at least 32 characters long

#### "Database not initialized"
- Run `bun run db:init` to create tables
- Check database file permissions
- Verify DB_PATH is accessible

#### CORS errors
- Check CORS_ORIGIN configuration
- Ensure client origin is included
- Verify CORS_CREDENTIALS setting

### Debug Mode
Set `LOG_LEVEL=debug` to see detailed configuration logging during startup.