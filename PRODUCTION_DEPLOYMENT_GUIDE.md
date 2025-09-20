# Production Deployment Guide

This guide helps you configure your environment files for production deployment to avoid CORS errors.

## Step-by-Step Setup

### 1. **Replace Placeholder URLs**

Replace `https://your-website.com` with your actual website URLs in both frontend and backend configuration.

### 2. **Frontend Configuration** (`Frontend/.env`)

```properties
# Production Backend API URL
VITE_API_BASE_URL=https://your-backend-domain.com

# Alternative: If backend is on same domain
# VITE_API_BASE_URL=https://your-website.com/api

# Keep other settings
VITE_XI_API_KEY=your_actual_elevenlabs_api_key
VITE_NODE_ENV=production
```

### 3. **Backend Configuration** (`backend/.env`)

```properties
# Add your production URLs (comma-separated)
FRONTEND_URL=https://your-website.com,https://www.your-website.com
CORS_ORIGIN=https://your-website.com,https://www.your-website.com

# Update other production settings
NODE_ENV=production
PORT=3000
WEBHOOK_BASE_URL=https://your-backend-domain.com
```

## Common Deployment Scenarios

### **Scenario 1: Separate Frontend & Backend Domains**
- Frontend: `https://myapp.com`
- Backend: `https://api.myapp.com`

**Frontend .env:**
```properties
VITE_API_BASE_URL=https://api.myapp.com
```

**Backend .env:**
```properties
CORS_ORIGIN=https://myapp.com,https://www.myapp.com
FRONTEND_URL=https://myapp.com
```

### **Scenario 2: Same Domain, Different Paths**
- Frontend: `https://myapp.com`
- Backend: `https://myapp.com/api`

**Frontend .env:**
```properties
VITE_API_BASE_URL=https://myapp.com/api
```

**Backend .env:**
```properties
CORS_ORIGIN=https://myapp.com,https://www.myapp.com
FRONTEND_URL=https://myapp.com
```

### **Scenario 3: Subdomain Setup**
- Frontend: `https://app.mycompany.com`
- Backend: `https://api.mycompany.com`

**Frontend .env:**
```properties
VITE_API_BASE_URL=https://api.mycompany.com
```

**Backend .env:**
```properties
CORS_ORIGIN=https://app.mycompany.com
FRONTEND_URL=https://app.mycompany.com
```

## Important Notes

### **HTTPS in Production**
- Always use `https://` for production URLs
- Never use `http://` in production (causes mixed content issues)

### **WWW vs Non-WWW**
Include both versions if your site supports both:
```properties
CORS_ORIGIN=https://myapp.com,https://www.myapp.com
```

### **Testing CORS Configuration**
1. Deploy both frontend and backend
2. Open browser developer tools  
3. Check for CORS errors in console
4. Verify network tab shows successful OPTIONS requests

## Quick Checklist
- [ ] Frontend `VITE_API_BASE_URL` points to production backend
- [ ] Backend `CORS_ORIGIN` includes production frontend URL
- [ ] Both URLs use HTTPS in production
- [ ] Server restarted after environment changes