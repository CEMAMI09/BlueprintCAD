# Blueprint Backend

Express backend server for Blueprint CAD platform.

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local settings

# Run development server
npm run dev
```

## Database

### Local Development (SQLite)

For local development, the app uses SQLite via `db/db.js` in the root directory.

### Production (PostgreSQL on Railway)

For production deployment on Railway, the app uses PostgreSQL via `backend/db.js`.

The database connection automatically switches based on the `DATABASE_URL` environment variable:
- If `DATABASE_URL` starts with `postgresql://`, uses PostgreSQL
- Otherwise, uses SQLite for local development

## Environment Variables

See `.env.example` for all required environment variables.

## Deployment

See `../RAILWAY_DEPLOYMENT.md` for Railway deployment instructions.

## API Routes

API routes are loaded from `../pages/api/` directory. The server automatically:
- Converts Next.js-style routes to Express routes
- Handles dynamic routes like `[id]`, `[username]`
- Supports both `.js` and `.ts` route files

## Health Check

The server exposes a health check endpoint:

```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

