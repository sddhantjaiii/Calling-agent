# Project Structure & Organization

## Repository Layout
```
├── Frontend/           # React frontend application
├── backend/           # Node.js/Express backend API
├── .kiro/            # Kiro AI assistant configuration
└── *.md              # Project documentation and summaries
```

## Frontend Structure (`Frontend/`)
```
src/
├── components/        # Reusable UI components
│   ├── ui/           # Base UI components (shadcn/ui)
│   ├── agents/       # Agent management components
│   ├── auth/         # Authentication components
│   ├── billing/      # Billing and payment components
│   ├── call/         # Call-related components
│   ├── contacts/     # Contact management components
│   └── dashboard/    # Dashboard-specific components
├── hooks/            # Custom React hooks
├── pages/            # Route-level page components
├── services/         # API service layer
├── contexts/         # React context providers
├── types/            # TypeScript type definitions
├── utils/            # Utility functions and helpers
├── lib/              # Third-party library configurations
└── __tests__/        # Test files
```

## Backend Structure (`backend/src/`)
```
src/
├── controllers/      # HTTP request handlers
├── services/         # Business logic and external integrations
├── models/           # Data models and interfaces
├── routes/           # API route definitions
├── middleware/       # Express middleware (auth, validation, etc.)
├── migrations/       # Database schema migrations
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
├── config/           # Configuration files
└── scripts/          # Utility scripts and tools
```

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `AgentModal.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAgents.ts`)
- **Services**: camelCase with service suffix (e.g., `apiService.ts`)
- **Types**: camelCase (e.g., `api.ts`)
- **Utils**: camelCase (e.g., `errorHandler.ts`)

### Code Conventions
- **React Components**: PascalCase function components
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces/Types**: PascalCase with descriptive names
- **Database Tables**: snake_case
- **API Endpoints**: kebab-case in URLs

## Architecture Patterns

### Frontend
- **Component Organization**: Feature-based grouping with shared UI components
- **State Management**: Server state via TanStack Query, local state via React hooks
- **Error Handling**: Error boundaries with centralized error handling utilities
- **Form Handling**: React Hook Form with Zod schema validation
- **API Integration**: Centralized API service with retry mechanisms

### Backend
- **Layered Architecture**: Controllers → Services → Models pattern
- **Middleware Stack**: Security, authentication, validation, error handling
- **Database Access**: Direct PostgreSQL queries with migration system
- **Error Handling**: Centralized error middleware with structured logging
- **Security**: Input sanitization, rate limiting, CORS, helmet protection

## Key Directories

### Configuration
- `.kiro/steering/` - AI assistant steering rules
- `.kiro/specs/` - Feature specifications and requirements
- `.vscode/` - VS Code workspace settings

### Documentation
- Root-level `*.md` files contain implementation summaries and fixes
- `backend/docs/` - API documentation
- Component-level README files for complex features