# Project Management API

A comprehensive project management API built with Bun and Elysia, featuring JWT authentication, TypeBox validation, SQLite database, and comprehensive project management capabilities.

## 🚀 Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 📝 **Project Management** - Create, update, and manage projects
- 📋 **Work Item Tracking** - Tasks, bugs, and stories with full lifecycle management
- 🎯 **Kanban Boards** - Visual workflow management
- 📊 **Backlog Management** - Prioritized task management
- ✅ **TypeBox Validation** - Runtime type validation and API documentation
- 🗄️ **SQLite Database** - Lightweight, embedded database with optimized indexes
- 🧪 **Comprehensive Testing** - Unit, integration, and end-to-end tests
- 🛡️ **Rate Limiting** - API protection against abuse
- 📚 **Swagger Documentation** - Interactive API documentation
- 🔧 **Development Tools** - Hot reload, database seeding, and setup scripts

## 📋 Requirements

- [Bun](https://bun.sh/) v1.0.0 or higher
- Node.js v18+ (for compatibility)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd project-management-api
bun install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Run complete setup (creates database, seeds data, validates config)
bun run setup
```

### 3. Start Development Server

```bash
bun run dev
```

The API will be available at:
- **API**: `http://localhost:3001`
- **Documentation**: `http://localhost:3001/swagger`
- **Health Check**: `http://localhost:3001/health`

## 📖 API Documentation

### Interactive Documentation
Visit `http://localhost:3001/swagger` for interactive Swagger documentation with:
- Complete endpoint documentation
- Request/response examples
- Try-it-out functionality
- Schema definitions

### Comprehensive Guide
See [docs/API.md](docs/API.md) for detailed API documentation including:
- Authentication flows
- Complete endpoint reference
- Data models
- SDK examples
- cURL examples
- Error handling

## 🧪 Testing

### Run All Tests
```bash
bun test
```

### Test Categories
```bash
# Unit tests only
bun test tests/unit/

# Integration tests only
bun test tests/integration/

# Repository tests only
bun test tests/repositories/

# Watch mode for development
bun test --watch
```

### Test Coverage
The project includes comprehensive test coverage:
- **Unit Tests**: Services, utilities, middleware, validation
- **Integration Tests**: Complete API workflows, authentication, authorization
- **Repository Tests**: Database operations and data integrity
- **End-to-End Tests**: Full user workflows and business scenarios

## 🔧 Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run start` | Start production server |
| `bun run test` | Run all tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run build` | Build for production |
| `bun run setup` | Complete development setup |
| `bun run setup:prod` | Production environment setup |
| `bun run setup:test` | Test environment setup |
| `bun run db:init` | Initialize database schema |
| `bun run db:seed` | Seed database with test data |
| `bun run db:reset` | Reset and reseed database |
| `bun run validate` | Validate configuration |

### Project Structure

```
project-management-api/
├── src/
│   ├── controllers/        # HTTP request handlers
│   │   ├── authController.ts
│   │   ├── projectController.ts
│   │   ├── workItemController.ts
│   │   └── boardController.ts
│   ├── services/          # Business logic layer
│   │   ├── AuthService.ts
│   │   ├── ProjectService.ts
│   │   └── WorkItemService.ts
│   ├── repositories/      # Data access layer
│   │   ├── UserRepository.ts
│   │   ├── ProjectRepository.ts
│   │   └── WorkItemRepository.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimit.ts
│   ├── schemas/          # TypeBox validation schemas
│   │   ├── userSchemas.ts
│   │   ├── projectSchemas.ts
│   │   └── workItemSchemas.ts
│   ├── types/            # TypeScript definitions
│   │   ├── user.ts
│   │   ├── project.ts
│   │   ├── workItem.ts
│   │   ├── services.ts
│   │   └── repositories.ts
│   ├── utils/            # Utility functions
│   │   ├── jwt.ts
│   │   └── password.ts
│   ├── config/           # Configuration
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── index.ts
│   ├── scripts/          # Setup and maintenance scripts
│   └── app.ts            # Main application entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── repositories/     # Repository tests
├── docs/
│   └── API.md           # Comprehensive API documentation
├── data/
│   └── database.sqlite  # SQLite database file
└── dist/                # Built application (production)
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

### Login Flow
1. POST `/auth/login` with email/password
2. Receive JWT token in response
3. Include token in `Authorization: Bearer <token>` header for protected routes

### Example
```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Use token for protected routes
curl -X GET http://localhost:3001/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **Rate Limiting**: Prevents brute force attacks and API abuse
- **Input Validation**: TypeBox schemas validate all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable cross-origin resource sharing

## 📊 Database

### SQLite Database
The application uses SQLite for simplicity and portability:
- **Location**: `./data/database.sqlite`
- **Schema**: Automatically created on first run
- **Indexes**: Optimized for common query patterns
- **Migrations**: Handled automatically

### Database Schema
- **Users**: Authentication and user management
- **Projects**: Project information and ownership
- **Work Items**: Tasks, bugs, and stories
- **Sprints**: Sprint management (future feature)

### Optimizations
- Composite indexes for common query patterns
- Foreign key constraints for data integrity
- Automatic timestamp management
- Efficient priority ordering

## 🌍 Environment Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3001` | No |
| `DB_PATH` | Database file path | `./data/database.sqlite` | No |
| `JWT_SECRET` | JWT signing secret | Generated | Yes |
| `JWT_EXPIRES_IN` | Token expiration | `24h` | No |

### Environment Files
```bash
# Development
.env

# Production
.env.production

# Test
.env.test
```

## 🚀 Production Deployment

### Build and Deploy
```bash
# Build for production
bun run build

# Setup production environment
bun run setup:prod

# Start production server
bun start
```

### Production Considerations
1. **Environment Variables**: Set secure JWT_SECRET
2. **Database**: Consider PostgreSQL for larger deployments
3. **Rate Limiting**: Adjust limits based on expected traffic
4. **Monitoring**: Add application monitoring and logging
5. **Reverse Proxy**: Use nginx or similar for SSL termination
6. **Process Management**: Use PM2 or similar for process management

### Docker Deployment
```dockerfile
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Setup and build
RUN bun run setup:prod
RUN bun run build

# Expose port
EXPOSE 3001

# Start application
CMD ["bun", "start"]
```

## 🔧 Development Tips

### Hot Reload
The development server includes hot reload for rapid development:
```bash
bun run dev
```

### Database Management
```bash
# Reset database and seed with fresh data
bun run db:reset

# Just seed data (preserves existing data)
bun run db:seed

# Initialize empty database
bun run db:init
```

### Testing During Development
```bash
# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/integration/auth.test.ts

# Run tests with coverage
bun test --coverage
```

## 🤝 API Usage Examples

### JavaScript/TypeScript Client
```typescript
// See docs/API.md for complete SDK example
const api = new ProjectManagementAPI('http://localhost:3001');

// Login and get token
await api.login('user@example.com', 'password');

// Create project
const project = await api.createProject({
  name: 'My Project',
  description: 'Project description'
});

// Create work item
const item = await api.createWorkItem(project.data.project.id, {
  title: 'Implement feature',
  type: 'task',
  storyPoints: 5
});
```

### cURL Examples
```bash
# Complete workflow example
# 1. Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John Doe","password":"password123","role":"developer"}'

# 2. Login
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' | jq -r '.data.token')

# 3. Create project
PROJECT_ID=$(curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Project","description":"Test project"}' | jq -r '.data.project.id')

# 4. Create work item
curl -X POST http://localhost:3001/projects/$PROJECT_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"New task","type":"task","storyPoints":3}'

# 5. Get Kanban board
curl -X GET http://localhost:3001/projects/$PROJECT_ID/kanban \
  -H "Authorization: Bearer $TOKEN"
```

## 🐛 Troubleshooting

### Common Issues

1. **Database locked error**
   ```bash
   # Stop all processes and restart
   bun run db:init
   ```

2. **JWT token expired**
   ```bash
   # Login again to get new token
   curl -X POST http://localhost:3001/auth/login ...
   ```

3. **Rate limit exceeded**
   ```bash
   # Wait for rate limit window to reset or adjust limits in config
   ```

4. **Port already in use**
   ```bash
   # Change port in .env file
   PORT=3002
   ```

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development bun run dev
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Use TypeScript for type safety
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Write tests for new features
- Use meaningful commit messages

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Elysia](https://elysiajs.com/) - Fast and friendly web framework
- [TypeBox](https://github.com/sinclairzx81/typebox) - JSON Schema type builder
- [SQLite](https://sqlite.org/) - Embedded database engine

## 📞 Support

For questions, issues, or contributions:
1. Check the [API documentation](docs/API.md)
2. Review existing issues
3. Create a new issue with detailed information
4. Include error messages, environment details, and reproduction steps