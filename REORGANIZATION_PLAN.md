# Project Reorganization Plan

## Structure Overview

### Frontend Group (`frontend/`)
- `components/` - React components
- `types/` - TypeScript type definitions
- `styles/` - CSS/styling files
- `public/` - Static assets (moved from root)

### Backend Group (`backend/`)
- `api/` - API routes (moved from `pages/api/`)
- `lib/` - Server-side utilities (moved from root `lib/`)
- `scripts/` - Server-side scripts

### Database Group (`db/`)
- `migrations/` - Database migration files
- `db.js` - Database connection (moved from `lib/db.js`)
- `*.db`, `*.sqlite` - Database files

### Storage Group (`storage/`)
- `uploads/` - User uploaded files
- `temp/` - Temporary files
- `public-uploads/` - Public uploads (moved from `public/uploads/`)

### Root Level (Next.js Required)
- `app/` - Next.js App Router (must stay at root)
- `pages/` - Next.js Pages Router (must stay at root, but we'll move `pages/api/` to `backend/api/` and update Next.js config)
- `public/` - Next.js public directory (will keep at root, move uploads to storage)

## Implementation Steps

1. Move components/ to frontend/components/
2. Move types/ to frontend/types/
3. Move styles/ to frontend/styles/
4. Move lib/ to backend/lib/ (except db.js)
5. Move lib/db.js to db/db.js
6. Move scripts/ to backend/scripts/
7. Move pages/api/ to backend/api/
8. Move migrations/ to db/migrations/
9. Move *.db files to db/
10. Move uploads/ to storage/uploads/
11. Move temp/ to storage/temp/
12. Update all import paths
13. Update next.config.js to point to backend/api/
14. Update tsconfig.json paths

