# Railway Deployment Guide

This guide walks you through deploying the Blueprint backend to Railway with PostgreSQL.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. PostgreSQL database on Railway
3. Environment variables configured

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (if connected) or "Empty Project"

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL instance
4. **Important**: Railway automatically sets the `DATABASE_URL` environment variable

## Step 3: Deploy Backend

### Option A: Deploy from GitHub

1. Connect your GitHub repository to Railway
2. Railway will detect the `backend/` directory
3. Set the root directory to `backend/` in Railway settings
4. Railway will automatically build and deploy

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Deploy
railway up
```

## Step 4: Configure Environment Variables

In Railway dashboard, go to your service → Variables tab and add:

### Required Variables

```bash
# Database (automatically set by Railway PostgreSQL service)
DATABASE_URL=postgresql://...  # Auto-set by Railway

# Server
PORT=3001
NODE_ENV=production

# Frontend URL (your Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# JWT Secret
JWT_SECRET=your-very-secure-random-string

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google AI
GOOGLE_AI_API_KEY=your-api-key
```

### Optional Variables

```bash
# File Storage (Railway uses ephemeral storage)
# For production, use S3 or similar
STORAGE_PATH=/tmp/storage
```

## Step 5: Initialize Database Schema

The database schema will be automatically initialized on first connection. You can also run it manually:

```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Or use psql with the connection string from Railway
psql $DATABASE_URL

# The schema is auto-created on first API call
```

## Step 6: Configure Railway Settings

1. Go to your service → Settings
2. Set **Root Directory** to `backend/`
3. Set **Start Command** to `node server.js`
4. Set **Build Command** (optional): `npm install`

## Step 7: Get Your Backend URL

1. Railway will assign a URL like: `https://your-service.up.railway.app`
2. Copy this URL - you'll need it for the frontend

## Step 8: Update Frontend (Vercel)

In your Vercel deployment, add environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-service.up.railway.app
```

Update `next.config.js` to proxy API requests:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
    },
  ];
}
```

## Step 9: File Storage Considerations

⚠️ **Important**: Railway uses ephemeral storage. Files uploaded will be lost on redeploy.

### Solutions:

1. **Use S3/Cloud Storage** (Recommended for production)
   - AWS S3
   - Google Cloud Storage
   - Cloudflare R2

2. **Use Railway Volumes** (For development)
   - Add a Volume service in Railway
   - Mount it to `/storage`

3. **Use External Storage Service**
   - Upload files directly to S3 from frontend
   - Store file URLs in database

## Step 10: Monitor Deployment

1. Check Railway logs: `railway logs`
2. Monitor health endpoint: `https://your-service.up.railway.app/health`
3. Check database connection in Railway dashboard

## Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL is set
railway variables

# Test connection
railway connect postgres
```

### Build Failures

- Check Railway logs
- Ensure `backend/package.json` has all dependencies
- Verify Node.js version (Railway auto-detects)

### CORS Issues

- Ensure `FRONTEND_URL` matches your Vercel deployment exactly
- Check backend CORS configuration in `server.js`

## Railway Information Needed

To complete the setup, provide:

1. **Railway Project Name**: Your project name
2. **PostgreSQL Connection String**: From Railway dashboard (DATABASE_URL)
3. **Backend Service URL**: The Railway-assigned URL
4. **Any custom domain**: If you've set one up

## Next Steps

- [ ] Deploy backend to Railway
- [ ] Configure environment variables
- [ ] Initialize database schema
- [ ] Update frontend API URL
- [ ] Set up file storage (S3 recommended)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/alerts

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

