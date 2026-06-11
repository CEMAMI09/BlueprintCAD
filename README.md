# BlueprintCAD

BlueprintCAD is a web platform for CAD creators to upload, preview, share, sell, and collaborate on 3D models and CAD files. It combines an interactive Three.js viewer, a community marketplace, team folders, manufacturing quotes, storefronts, forums, messaging, and subscription-based monetization — all in a Next.js application backed by an Express API.

The production site is deployed at [blueprintcad.io](https://blueprintcad.io). The home route currently shows a **coming-soon / waitlist** page; the full app is accessible after login via the sidebar navigation.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Subscription Tiers](#subscription-tiers)
- [Supported File Formats](#supported-file-formats)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Routes & Pages](#routes--pages)
- [API Overview](#api-overview)
- [Development Status](#development-status)
- [License](#license)

---

## Features

### CAD & 3D Viewing

- **Interactive 3D viewer** built on Three.js with orbit controls (zoom, pan, rotate), mobile touch support, theme-aware backgrounds, and optional auto-rotate
- **In-browser preview** for STL, OBJ, FBX, GLTF/GLB, PLY, and Collada (DAE) files
- **Upload wizard** with drag-and-drop, live 3D preview, metadata (file size, bounding box, format), and auto-generated or custom thumbnails
- **Manufacturing Quote Tool** — upload a model, analyze printability, extract dimensions, adjust scale, select materials, and get cost estimates (material, labor, machine time, markup, shipping)
- **Git-like branch management** UI for versioning designs within folders (create, rename, set master, upload branch files)
- **Download** original uploaded files from project pages and share links

### Project Management

- Upload and organize CAD projects with titles, descriptions, tags, and visibility (public/private)
- **Dashboard** with KPIs, storage usage meter, recent activity, trending designs, and quick upload
- **Explore** — discover public designs with filters (trending, popular, recent, free, premium) and user search
- **Folders** — group projects by client, product line, or version; team collaboration with role-based access (viewer, editor, admin, owner)
- **Folder notes**, activity audit log, and member invitations
- Star/unstar designs; bulk delete on your own profile
- Rename and delete projects

### Marketplace & Commerce

- **Marketplace** — browse paid listings with category and price filters
- **Storefronts** — customizable creator storefronts (branding, colors, featured projects, industry)
- Public storefront pages at `/[username]/store`
- **Stripe checkout** for digital purchases, manufacturing orders, and subscriptions
- **Orders** — view purchases, sales, and manufacturing orders
- **Seller analytics** — revenue, views, downloads, and top projects (Recharts dashboards)
- Multi-license pricing controls on upload (Creator+ tier)

### Social & Community

- **User profiles** with avatar, banner, bio, location, website, and social links (GitHub, X, Instagram, YouTube)
- **Follow system** with private profiles and follow-request flow
- **Direct messages** (1:1), group channels, and storefront customer messaging
- **Notifications** center for follows, folder invites, orders, and more
- **Community forum** with categories (general, electronics, mechanical, 3D printing, help), threads, replies, and likes
- **Followers / following** lists

### Collaboration & Sharing

- **Share links** — public, password-protected, or expiring links with optional download restrictions
- **Ownership transfer** requests between users
- **Activity panel** — filterable audit log (uploads, deletes, renames, branches, member changes)
- Team folders with invite-by-search and role management (Studio tier)

### Authentication & Account

- Email/password registration and login
- **OAuth** — Google and GitHub sign-in
- Email verification (link or 6-digit code) with resend
- Password recovery and username recovery flows
- Post-OAuth password setup
- Profile settings: appearance (dark/light/auto), notification preferences, security, billing
- Pre-launch **site password gate** for controlled access

### Support & Admin

- **Support center** with searchable FAQ and links to docs, forum, and issue reporting
- **Documentation hub** with getting-started guides, file format reference, and more
- **Issue tracker** — submit bugs, view your issues, admin triage panel
- **Admin tools** — waitlist management, email campaigns, mass email to users
- **Contact form** and waitlist signup on coming-soon page

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS |
| 3D | Three.js (STL, OBJ, FBX, GLTF, PLY, Collada loaders) |
| Backend | Express.js (Node.js), JWT auth, bcrypt |
| Database | PostgreSQL (production), SQLite (legacy/NextAuth) |
| Storage | Cloudflare R2 (S3-compatible) |
| Payments | Stripe (checkout, subscriptions, webhooks) |
| Email | SendGrid API, Nodemailer SMTP fallback |
| Charts | Recharts |
| Analytics | Vercel Analytics |
| Deployment | Vercel (frontend), Railway (Express API) |

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Next.js (Vercel)   │  proxy  │  Express API (Railway)   │
│  Port 3000          │ ──────► │  Port 8080               │
│  - App Router pages │         │  - Auth, projects, CAD   │
│  - API route proxies│         │  - Forum, storefront     │
│  - Three.js viewer  │         │  - Stripe, analytics     │
└─────────────────────┘         └──────────┬───────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │  PostgreSQL  │  R2 Storage │
                              └─────────────────────────┘
```

In production, Vercel rewrites all `/api/*` requests to the Railway backend (`vercel.json`). In local development, run both servers with `npm run dev:full` — Next.js on port 3000 and Express on port 8080.

State management uses React Context (`AuthContext`, `ThemeContext`) rather than external stores. Auth tokens are stored in `localStorage` and sent via `Authorization: Bearer` headers.

---

## Subscription Tiers

| Feature | Free | Creator | Studio |
|---------|------|---------|--------|
| Storage | 0.5 GB | 50 GB | 200 GB |
| Private projects | 2 | Unlimited | Unlimited |
| Folders | 3 | Unlimited | Unlimited |
| Team members | 0 | 0 | 10 |
| Sell on marketplace | Yes | Yes | Yes |
| Platform fee | 15% | 5% | 5% |
| Storefront customization | — | Yes | Yes |
| File versioning | — | Yes | Yes |
| Manufacturing orders | — | Yes | Yes |
| Sales analytics | — | Yes | Yes |
| Team collaboration | — | — | Yes |
| Role-based permissions | — | — | Yes |
| API access | — | — | Yes |
| Quote requests/month | 3 | Unlimited | Unlimited |

Tier definitions live in `backend/lib/subscriptionFeatures.js`. Feature gating is enforced on both frontend (`SubscriptionGate`) and backend (`/api/subscriptions/can-action`).

---

## Supported File Formats

### Viewable in browser (Three.js)

STL, OBJ, FBX, GLTF, GLB, PLY, Collada (DAE)

### Accepted for upload (stored, preview when supported)

| Category | Formats |
|----------|---------|
| 3D Mesh | STL, OBJ, FBX, GLTF, GLB, PLY, 3MF, AMF, X3D |
| CAD Exchange | STEP/STP, IGES/IGS |
| 2D/Technical | DWG, DXF |
| Parametric | SCAD (OpenSCAD) |
| Native CAD | Fusion 360 (.f3d), SolidWorks (.sldprt, .sldasm), Inventor (.ipt, .iam) |

Upload limit is **50 MB** on the frontend wizard; the backend CAD endpoint accepts up to **100 MB**. See `lib/cad-formats.js` for the full format registry.

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted, e.g. Railway)
- Cloudflare R2 bucket (or compatible S3 storage) for file uploads

### Install and run

```bash
# Install dependencies
npm install

# Create .env.local at the project root (see Environment Variables below)

# Run frontend + backend together (recommended)
npm run dev:full
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8080](http://localhost:8080)

### Other scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js frontend only |
| `npm run dev:api` | Express backend only |
| `npm run build` | Production Next.js build |
| `npm start` | Start production Next.js server |
| `npm run start:backend` | Start production Express server |
| `npm run lint` | Run ESLint |

### Database setup

Run the PostgreSQL schema against your database:

```bash
psql $DATABASE_URL -f backend/schema.sql
```

Additional migrations are in `backend/migrations/` and `backend/scripts/`.

---

## Environment Variables

Create a `.env.local` file at the project root. Both Next.js and Express load it.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DATABASE_PUBLIC_URL` | No | Public PostgreSQL URL (Railway) |
| `JWT_SECRET` or `NEXTAUTH_SECRET` | Yes | Token signing secret |
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (`http://127.0.0.1:8080` locally) |
| `R2_ACCOUNT_ID` | Yes | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET_NAME` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | Public URL for R2 objects |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `STRIPE_PRICE_CREATOR` | For subscriptions | Stripe price ID for Creator tier |
| `STRIPE_PRICE_PRO` | For subscriptions | Stripe price ID for Studio tier |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | For OAuth | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | For OAuth | GitHub OAuth client secret |
| `SENDGRID_API_KEY` | For email | SendGrid API key |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | For email | SMTP fallback settings |
| `NEXT_PUBLIC_APP_URL` | No | App base URL for redirects |

---

## Project Structure

```
BlueprintCAD/
├── app/                    # Next.js App Router pages and API route proxies
│   ├── api/                # Proxies to Express backend
│   ├── dashboard/          # Dashboard and analytics
│   ├── explore/            # Design discovery
│   ├── marketplace/        # Paid listings
│   ├── project/[id]/       # Project detail + 3D viewer
│   ├── upload/             # CAD upload wizard
│   ├── quote/              # Manufacturing quote tool
│   ├── folders/            # Folder management
│   ├── profile/            # User profiles
│   ├── messages/           # Direct messaging
│   ├── forum/              # Community forum
│   ├── storefront/         # Storefront editor
│   ├── checkout/           # Stripe checkout
│   ├── subscription/       # Plan management
│   ├── settings/           # User settings
│   ├── support/            # Help center
│   ├── docs/               # Documentation
│   ├── admin/              # Admin tools
│   └── context/            # Auth, theme providers
├── frontend/
│   └── components/         # Shared UI (CADViewer, layout, modals)
├── backend/
│   ├── server.js           # Express entry point
│   ├── routes/             # API route handlers
│   ├── lib/                # Auth, DB, R2, Stripe, email, costing
│   ├── schema.sql          # PostgreSQL schema
│   └── migrations/         # SQL migrations
├── lib/                    # Shared utilities (API client, CAD formats, themes)
├── db/                     # Legacy SQLite schema and migrations
├── components/             # App-level components (password gate, banners)
├── public/                 # Static assets
└── vercel.json             # Vercel → Railway API rewrites
```

---

## Routes & Pages

### Public

| Route | Description |
|-------|-------------|
| `/` | Coming-soon / waitlist page |
| `/coming-soon` | Waitlist signup with feature highlights |
| `/landingpage`, `/landingpage2` | Alternate marketing pages |
| `/login`, `/register` | Authentication |
| `/forgot-password`, `/reset-password`, `/forgot-username` | Account recovery |
| `/verify-email`, `/auth/*` | Email verification flows |
| `/contact`, `/privacy` | Contact and privacy policy |
| `/share/[token]` | Public share link viewer |
| `/[username]/store` | Public creator storefront |
| `/profile/[username]` | Public creator profile |
| `/docs`, `/docs/[slug]` | Documentation |

### Authenticated App

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview, stats, storage, trending |
| `/dashboard/analytics` | Per-project performance charts |
| `/explore` | Browse and search public designs |
| `/marketplace` | Paid asset marketplace |
| `/project/[id]` | Project detail with 3D preview |
| `/upload` | CAD upload wizard |
| `/quote` | Manufacturing quote tool |
| `/folders`, `/folders/[id]` | Folder management and detail |
| `/messages` | DMs, channels, storefront messaging |
| `/notifications` | Notification center |
| `/forum`, `/forum/[id]` | Community discussions |
| `/storefront` | Storefront editor |
| `/checkout`, `/orders`, `/order` | Purchase flows |
| `/subscription` | Plan comparison and management |
| `/analytics` | Seller analytics dashboard |
| `/settings` | Profile, security, billing, appearance |
| `/transfer-requests` | Ownership transfer inbox |
| `/support`, `/issues` | Help center and bug reports |
| `/admin`, `/admin/email-campaigns` | Admin tools |

---

## API Overview

The Express backend (`backend/server.js`) serves all `/api/*` endpoints. Key route groups:

| Prefix | Capabilities |
|--------|-------------|
| `/api/auth` | Register, login, logout, email verification, password setup |
| `/api/auth/oauth` | Google and GitHub OAuth |
| `/api/cad` | CAD file upload and listing |
| `/api/projects` | CRUD, likes, views, downloads, rename |
| `/api/folders` | Folder/project creation |
| `/api/files`, `/api/thumbnails` | R2 file and thumbnail serving |
| `/api/users` | Profile CRUD, avatar/banner |
| `/api/dashboard`, `/api/stats` | Dashboard data and storage stats |
| `/api/analytics` | Seller revenue, views, downloads |
| `/api/subscriptions`, `/api/stripe` | Tier checks, checkout, webhooks |
| `/api/storefront` | Storefront CRUD |
| `/api/forum` | Threads, replies, contributors |
| `/api/waitlist`, `/api/contact` | Waitlist and contact form |
| `/api/email-campaigns` | Admin email campaigns |

Next.js API routes in `app/api/` proxy select endpoints to Express during local development.

---

## Development Status

BlueprintCAD is actively developed. Some UI features exist as components but are not yet wired to pages, and some backend endpoints are stubs or pending migration from legacy SQLite schemas to PostgreSQL:

| Area | Status |
|------|--------|
| 3D viewer, upload, explore, marketplace | Functional |
| Auth (email + OAuth), profiles, settings | Functional |
| Forum, storefronts, subscriptions (Stripe) | Functional |
| Seller analytics, dashboard stats | Functional |
| Quote tool UI | Functional; backend estimate/analyze routes may fall back to client-side heuristics |
| Folder team collaboration UI | Built; some folder API endpoints return stubs |
| Comments system (`CommentSystem.tsx`) | Component built, not connected to pages |
| Version history UI | Component built, not connected to pages |
| Messaging UI | Built; no real-time WebSocket layer |
| Marketplace order API | Schema exists; Express order routes not yet implemented |
| Share link CRUD API | Partial; token-based viewing works via projects route |

---

## License

See repository for license details.
