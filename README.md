# Blueprint CAD

3D CAD platform for design, collaboration, and manufacturing.

## Project Structure

```
blueprint/
├── app/                    # Next.js frontend (App Router)
│   ├── components/        # React components
│   └── ...                # Next.js pages
│
├── pages/                  # Next.js Pages Router
│   └── api/               # API routes (served by backend)
│
├── backend/                # Express backend server
│   ├── lib/               # Backend-specific utilities
│   ├── scripts/           # Database migrations & scripts
│   └── server.js          # Express server entry point
│
├── shared/                 # Shared code
│   ├── types/             # TypeScript types
│   └── utils/             # Shared utilities
│
├── db/                     # Database files & migrations
├── storage/                # File storage
└── public/                 # Static assets
```

## Development

### Install Dependencies

```bash
# Root dependencies (Next.js frontend)
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### Run Development Servers

```bash
# Run both frontend and backend
npm run dev

# Or separately:
npm run dev:frontend  # Next.js on port 3000
npm run dev:backend   # Express on port 3001
```

### Build for Production

```bash
npm run build
npm start
```

## Architecture

- **Frontend**: Next.js 13+ with App Router (`/app`) and Pages Router (`/pages`)
- **Backend**: Express server (`/backend/server.js`) that loads API routes from `/pages/api`
- **Shared**: Common utilities and types in `/shared`
- **Database**: SQLite with migrations in `/db/migrations`

## API Routes

API routes are defined in `/pages/api` and automatically loaded by the Express backend server. The backend server runs on port 3001 and the frontend proxies API requests to it.

## Environment Variables

Create a `.env.local` file:

```
JWT_SECRET=your-secret-key
DATABASE_URL=./db/blueprint.db
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## License

Proprietary
