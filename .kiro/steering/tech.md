# Technology Stack & Build System
Dont create .md file when not needed, make sure to delete test files
## Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (development server on port 8080)
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme support
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Testing**: Vitest with Testing Library

## Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with comprehensive middleware stack
- **Database**: PostgreSQL with custom migration system
- **Authentication**: Stack Auth integration
- **File Upload**: Multer for multipart form handling
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Testing**: Jest with Supertest
- **Process Management**: ts-node-dev for development

## Development Commands

### Server Management (IMPORTANT)
**Always check for running servers before starting development:**

```bash
# Check for running processes on ports
netstat -ano | findstr :8080    # Check frontend port (Windows)
netstat -ano | findstr :3000    # Check backend port (Windows)

# Kill processes if found (replace PID with actual process ID)
taskkill /PID <PID> /F

# Alternative: Kill all Node.js processes (use with caution)
taskkill /IM node.exe /F
```

### Frontend
```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run test         # Run tests with Vitest
npm run test:ui      # Run tests with UI
npm run lint         # ESLint check
```

### Backend
```bash
npm run dev          # Start development server with hot reload (port 3000)
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server
npm run test         # Run Jest tests
npm run migrate      # Run database migrations
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix ESLint issues
```

### Server Startup Behavior (AI Assistant Guidelines)
**When starting servers, follow these rules:**

1. **Timeout Management**: After starting a server, wait maximum 20 seconds for startup completion
2. **Success Indicators**: Look for these messages in logs:
   - Backend: "🚀 Server running on port 3000" and "✅ Database connection established"
   - Frontend: "Local:" and "Network:" URLs displayed
3. **Auto-Exit**: Automatically exit terminal monitoring after 20 seconds or when success indicators appear
4. **Log Analysis**: After server starts, analyze the startup logs for:
   - Any error messages or warnings
   - Database connection status
   - Port binding confirmation
   - Environment configuration issues
5. **Next Steps**: After successful startup, proceed with the intended task rather than staying in terminal monitoring

## Key Libraries & Dependencies

### Frontend
- **UI Components**: @radix-ui/* for accessible primitives
- **Data Fetching**: @tanstack/react-query for caching and synchronization
- **Validation**: zod for schema validation
- **Utilities**: clsx, tailwind-merge for conditional styling
- **Icons**: lucide-react for consistent iconography

### Backend
- **Security**: helmet, cors, express-validator, bcrypt
- **Database**: pg (PostgreSQL client)
- **External APIs**: axios for HTTP requests
- **File Processing**: multer, xlsx for file uploads
- **Payments**: stripe SDK integration

## Development Setup
- Frontend proxy configured to backend (localhost:3000)
- CORS enabled for cross-origin requests
- Hot reload enabled for both frontend and backend
- TypeScript strict mode enabled across the stack