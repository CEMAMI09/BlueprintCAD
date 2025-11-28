# Blueprint Project Structure

## Clean Architecture (Option A)

```
blueprint/
├── app/                    # Next.js frontend (App Router) - THE ONLY FRONTEND
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
├── shared/                 # Shared code (NO DUPLICATION)
│   ├── types/             # TypeScript types
│   └── utils/              # Shared utilities
│
├── db/                     # Database files & migrations
├── storage/                # File storage
└── public/                 # Static assets
```

## Key Points

✅ **Single Frontend**: `/app` is the only Next.js frontend
✅ **Single Backend**: `/backend` is the Express server
✅ **No Duplication**: `/shared` contains all shared code
✅ **API Routes**: Defined in `/pages/api`, loaded by backend server

## Import Paths

### Frontend (`/app`)
- `@/components/*` → `app/components/*`
- `@/lib/*` → `shared/utils/*`
- `@/types/*` → `shared/types/*`
- `@/db/*` → `db/*`
- `@/storage/*` → `storage/*`

### Backend (`/pages/api`)
- `../../shared/utils/*` → shared utilities
- `../../../db/db` → database connection

## Running

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Development
npm run dev              # Runs both frontend (3000) and backend (3001)
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
```

