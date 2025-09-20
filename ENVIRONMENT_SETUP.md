# Environment Setup Guide

This guide helps you set up the environment files for both frontend and backend to ensure smooth communication without CORS errors.

## Quick Setup

### 1. Frontend Configuration (Vite)
- **Port**: 5173 (default Vite dev server port)
- **Backend API**: http://localhost:3000
- **Environment File**: `Frontend/.env`

### 2. Backend Configuration (Node.js/Express)
- **Port**: 3000
- **CORS Origins**: Configured to allow frontend connections
- **Environment File**: `backend/.env`

## How to Start

### Frontend (Vite)
```bash
cd Frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`

### Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```
The backend will start on `http://localhost:3000`

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173` (Vite default)
- `http://localhost:8080` (Alternative port)
- `http://localhost:8081` (Alternative port)
- `http://localhost:8082` (Alternative port)

## Key Environment Variables

### Frontend (.env)
- `VITE_API_BASE_URL=http://localhost:3000` - Backend API URL
- `VITE_XI_API_KEY` - ElevenLabs API key

### Backend (.env)
- `PORT=3000` - Server port
- `CORS_ORIGIN` - Allowed frontend origins
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `DATABASE_URL` - Database connection string

## Troubleshooting CORS Issues

If you still get CORS errors:

1. **Check ports match**: Frontend connects to correct backend URL
2. **Verify CORS_ORIGIN**: Includes your frontend URL
3. **Check credentials**: CORS_CREDENTIALS=true for cookie support
4. **Restart servers**: After changing environment variables

## Development Tips

1. Both servers support hot reloading
2. Debug mode is enabled for development
3. Request logging is enabled to track API calls
4. All origins are configured for local development

## Production Notes

Remember to update these values for production:
- Change JWT_SECRET and SESSION_SECRET
- Update CORS_ORIGIN to your production frontend URL
- Set NODE_ENV=production
- Use secure database connections