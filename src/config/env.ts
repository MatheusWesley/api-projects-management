// Environment configuration with validation
interface Config {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  database: {
    filename: string;
    maxConnections?: number;
    verbose: boolean;
  };
  nodeEnv: 'development' | 'test' | 'production';
  bcryptRounds: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

function validateConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as Config['nodeEnv'];
  
  // Validate required environment variables in production
  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }
  }

  const port = Number(process.env.PORT) || (nodeEnv === 'test' ? 0 : 3000);
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-not-for-production';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  // Database configuration based on environment
  let dbFilename: string;
  switch (nodeEnv) {
    case 'test':
      dbFilename = ':memory:'; // In-memory database for tests
      break;
    case 'production':
      dbFilename = process.env.DB_PATH || '/app/data/database.sqlite';
      break;
    default:
      dbFilename = process.env.DB_PATH || './data/database.sqlite';
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS) || (nodeEnv === 'test' ? 4 : 12);
  
  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : (nodeEnv === 'production' ? [] : ['http://localhost:3000', 'http://localhost:5173']);

  const logLevel = (process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug')) as Config['logging']['level'];

  return {
    port,
    jwtSecret,
    jwtExpiresIn,
    database: {
      filename: dbFilename,
      maxConnections: Number(process.env.DB_MAX_CONNECTIONS) || undefined,
      verbose: process.env.DB_VERBOSE === 'true' || false
    },
    nodeEnv,
    bcryptRounds,
    cors: {
      origin: corsOrigin,
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    logging: {
      level: logLevel,
    },
  };
}

export const config = validateConfig();

// Helper functions for environment checks
export const isDevelopment = () => config.nodeEnv === 'development';
export const isProduction = () => config.nodeEnv === 'production';
export const isTest = () => config.nodeEnv === 'test';