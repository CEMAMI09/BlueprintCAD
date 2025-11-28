# Railway Information Needed

To complete the Railway deployment setup, please provide the following information:

## 1. PostgreSQL Connection Details

After adding PostgreSQL to your Railway project, you'll get a `DATABASE_URL`. Please provide:

- **DATABASE_URL**: The full PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - This is automatically set by Railway, but you can find it in:
    - Railway Dashboard → Your PostgreSQL Service → Variables → `DATABASE_URL`

## 2. Backend Service URL

After deploying the backend, Railway will assign a URL. Please provide:

- **Backend URL**: The Railway-assigned URL for your backend service
  - Format: `https://your-service.up.railway.app`
  - Or your custom domain if you've set one up

## 3. Environment Variables to Set

In Railway Dashboard → Your Backend Service → Variables, set these:

### Required:
- `DATABASE_URL` - Auto-set by Railway PostgreSQL service
- `PORT` - Usually `3001` (or Railway auto-assigns)
- `NODE_ENV` - Set to `production`
- `FRONTEND_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- `JWT_SECRET` - A secure random string for JWT tokens

### Optional (but recommended):
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `GOOGLE_AI_API_KEY` - Google AI API key

## 4. File Storage

⚠️ **Important**: Railway uses ephemeral storage. Files will be lost on redeploy.

**Options:**
1. **S3/Cloud Storage** (Recommended)
   - AWS S3
   - Google Cloud Storage  
   - Cloudflare R2
   - Provide bucket name and credentials

2. **Railway Volumes** (Development only)
   - Add a Volume service in Railway
   - Mount path: `/storage`

## Quick Checklist

- [ ] PostgreSQL service added to Railway project
- [ ] DATABASE_URL copied from Railway
- [ ] Backend service deployed
- [ ] Backend URL obtained
- [ ] Environment variables configured
- [ ] Frontend API URL updated to point to Railway backend
- [ ] File storage solution chosen (S3 recommended)

## Next Steps After You Provide Info

1. I'll update the frontend to point to your Railway backend URL
2. Configure file storage if using S3
3. Test the connection
4. Set up monitoring/alerts

