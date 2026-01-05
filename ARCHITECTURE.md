# BlueprintCAD - Complete Architecture Overview

## 🏗️ System Architecture

### High-Level Overview
BlueprintCAD is a **full-stack web application** for 3D CAD file management, collaboration, and marketplace. It follows a **decoupled architecture** with a Next.js frontend and Express.js backend, connected via RESTful APIs.

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Next.js 13 Frontend (React 18)              │  │
│  │  - App Router (Server & Client Components)          │  │
│  │  - TypeScript                                        │  │
│  │  - Tailwind CSS                                      │  │
│  │  - Three.js (3D Viewer)                             │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────────────────┘
                       │ HTTPS/REST API
                       │ (CORS Enabled)
┌──────────────────────▼────────────────────────────────────┐
│              EXPRESS.JS BACKEND API                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - Authentication (JWT)                              │  │
│  │  - File Upload/Processing                            │  │
│  │  - Business Logic                                    │  │
│  │  - API Routes                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────┬──────────────┬──────────────┬──────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────────┐
│ PostgreSQL  │ │ Cloudflare│ │  SMTP Server   │
│  Database   │ │    R2     │ │  (Nodemailer)  │
│             │ │  Storage  │ │                │
└─────────────┘ └───────────┘ └────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 13.5.6 (App Router)
- **UI Library**: React 18.2.0
- **Language**: TypeScript 5.3.2
- **Styling**: Tailwind CSS 3.3.5
- **Icons**: Lucide React 0.554.0
- **3D Rendering**: Three.js 0.181.1
- **Charts**: Recharts 3.5.0
- **State Management**: React Context API
- **HTTP Client**: Fetch API (with custom `apiFetch` wrapper)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (CommonJS)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 2.4.3
- **File Upload**: Formidable 3.5.1
- **Email**: Nodemailer 7.0.10
- **Image Processing**: Canvas 3.2.0

### Database
- **Primary**: PostgreSQL (via Railway)
- **Connection**: `pg` library 8.16.3
- **ORM**: Raw SQL queries with helper functions

### Storage
- **Object Storage**: Cloudflare R2 (S3-compatible)
- **Client**: AWS SDK v3 (@aws-sdk/client-s3)
- **Use Cases**: CAD files, thumbnails, user assets

### Third-Party Services
- **Payment Processing**: Stripe 19.3.1
- **OAuth Providers**: Google, GitHub (via OAuth 2.0)
- **Email Service**: SMTP (configurable: Gmail, SendGrid, Mailgun, AWS SES)
- **AI**: Google Generative AI (@google/generative-ai 0.1.3)

### Infrastructure
- **Frontend Hosting**: Vercel (Next.js deployment)
- **Backend Hosting**: Railway (Express.js server)
- **Database**: Railway PostgreSQL
- **CDN**: Cloudflare (via R2 public URLs)

---

## 📁 Project Structure

```
BlueprintCAD/
├── app/                          # Next.js App Router
│   ├── [username]/              # Dynamic user routes
│   ├── analytics/                # Analytics dashboard
│   ├── api/                     # Next.js API routes (legacy)
│   ├── auth/                    # Auth pages (callback, setup)
│   ├── components/              # React components
│   ├── context/                 # React Context providers
│   ├── dashboard/               # User dashboard
│   ├── explore/                 # Public project discovery
│   ├── folders/                 # Folder management
│   ├── marketplace/             # 3D asset marketplace
│   ├── messages/                # Messaging system
│   ├── project/                 # Project detail pages
│   ├── profile/                 # User profiles
│   └── upload/                  # File upload interface
│
├── backend/                      # Express.js Backend
│   ├── lib/                     # Shared utilities
│   │   ├── auth.js             # JWT authentication
│   │   ├── db.js                # PostgreSQL connection
│   │   ├── email.js             # Email sending
│   │   ├── email-verification.js # Email verification
│   │   ├── r2.js                # Cloudflare R2 client
│   │   └── ui/                  # Design system
│   ├── routes/                   # API route handlers
│   │   ├── auth.js              # Authentication
│   │   ├── oauth.js             # OAuth providers
│   │   ├── projects.js           # Project CRUD
│   │   ├── files.js              # File serving
│   │   ├── thumbnails.js         # Thumbnail generation
│   │   ├── upload.js              # File upload
│   │   ├── users.js              # User management
│   │   ├── folders.js            # Folder management
│   │   ├── analytics.js          # Analytics data
│   │   ├── dashboard.js          # Dashboard data
│   │   └── subscriptions.js      # Subscription management
│   ├── scripts/                  # Database migrations
│   └── server.js                 # Express server entry
│
├── frontend/                     # Shared frontend components
│   └── components/               # Reusable UI components
│
├── db/                          # Database schemas & migrations
│   └── migrations/              # SQL migration files
│
├── lib/                         # Shared utilities
│   └── apiClient.ts             # API fetch wrapper
│
└── storage/                      # Local file storage (dev only)
```

---

## 🔐 Authentication & Authorization

### Authentication Methods
1. **Email/Password**: Manual registration with email verification
2. **OAuth 2.0**: Google and GitHub sign-in
3. **JWT Tokens**: Stateless authentication
   - Stored in `localStorage` (frontend)
   - HttpOnly cookies (backend)
   - 7-day expiration

### Email Verification Flow
- Manual registrations require email verification
- OAuth users are auto-verified
- Rate-limited resend (3 emails per 15 minutes)
- 24-hour token expiration

### Authorization
- Role-based access control (RBAC)
- Folder-level permissions (owner, admin, editor, viewer)
- Project-level privacy controls (public/private)
- Subscription tier restrictions

---

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts, profiles, tiers
- **projects**: 3D models, CAD files, metadata
- **folders**: Hierarchical organization
- **folder_members**: Team collaboration
- **orders**: Marketplace transactions
- **subscriptions**: User subscription tiers
- **channels**: Group messaging
- **channel_messages**: Messages
- **verification_tokens**: Email verification
- **email_verification_attempts**: Rate limiting

### Key Relationships
- Users → Projects (1:N)
- Users → Folders (1:N)
- Folders → Projects (1:N)
- Folders → Folder Members (N:M)
- Users → Orders (1:N, as buyer/seller)
- Users → Channels (N:M via channel_members)

---

## 📡 API Architecture

### Backend API Routes (`/api/*`)

#### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user
- `POST /logout` - Logout
- `POST /verify-email` - Verify email token
- `POST /resend-verification` - Resend verification email
- `POST /setup-password` - Set password for OAuth users

#### OAuth (`/api/auth/oauth`)
- `GET /google` - Google OAuth initiation
- `GET /github` - GitHub OAuth initiation
- `GET /callback/:provider` - OAuth callback handler

#### Projects (`/api/projects`)
- `GET /` - List projects
- `GET /:id` - Get project details
- `POST /` - Create project
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `POST /:id/like` - Like/unlike project
- `GET /:id/branches` - Get project versions

#### Files (`/api/files`)
- `GET /:path(*)` - Serve file from R2 storage

#### Thumbnails (`/api/thumbnails`)
- `GET /:key(*)` - Serve thumbnail from R2

#### Upload (`/api/upload`)
- `POST /` - Upload CAD file to R2

#### Users (`/api/users`)
- `GET /:username` - Get user profile
- `PUT /:username` - Update profile
- `GET /:username/followers` - Get followers
- `GET /:username/following` - Get following
- `POST /:username/follow` - Follow user
- `DELETE /:username/follow` - Unfollow user

#### Folders (`/api/folders`)
- `GET /` - List user folders
- `POST /` - Create folder
- `GET /:id` - Get folder details
- `PUT /:id` - Update folder
- `DELETE /:id` - Delete folder
- `POST /:id/members` - Add member
- `DELETE /:id/members/:userId` - Remove member

#### Analytics (`/api/analytics`)
- `GET /seller?period=30` - Seller analytics (revenue, downloads, views)

#### Dashboard (`/api/dashboard`)
- `GET /activity` - User activity feed
- `GET /trending` - Trending projects

#### Subscriptions (`/api/subscriptions`)
- `GET /check` - Get user subscription tier

---

## 💾 Data Storage

### Cloudflare R2 (Object Storage)
- **Purpose**: CAD files, thumbnails, user assets
- **Structure**:
  - `users/{userId}/cad-{timestamp}.{ext}` - CAD files
  - `users/{userId}/thumbnails/{projectId}.png` - Thumbnails
  - `users/{userId}/profile/{filename}` - Profile pictures/banners
- **Access**: Private with signed URLs or public via `R2_PUBLIC_URL`

### PostgreSQL Database
- **Purpose**: Metadata, user data, relationships
- **Hosting**: Railway
- **Connection**: Connection pooling via `pg` library

---

## 🎨 Frontend Architecture

### Component Structure
- **Layout Components**: `ThreePanelLayout`, `GlobalNavSidebar`
- **UI Components**: Buttons, Cards, Badges, Modals (from `UIComponents`)
- **Feature Components**: Project cards, folder trees, 3D viewer
- **Context Providers**: `AuthContext`, `UserContext`

### State Management
- **Global State**: React Context API (`AuthContext`)
- **Local State**: React Hooks (`useState`, `useEffect`)
- **Server State**: Direct API calls with `apiFetch`
- **Persistence**: `localStorage` for user data and tokens

### Routing
- **Framework**: Next.js App Router
- **File-based routing**: `app/` directory structure
- **Dynamic routes**: `[id]`, `[username]`, `[token]`
- **API routes**: Legacy Next.js API routes in `app/api/`

---

## 🔄 Key Features & Workflows

### 1. User Registration & Authentication
```
User → Register → Email Verification → Login → JWT Token → Authenticated Session
```

### 2. File Upload Workflow
```
User Uploads CAD File → Validate → Upload to R2 → Generate Thumbnail → 
Store Metadata in DB → Return Project ID
```

### 3. Project Viewing
```
User Views Project → Check Permissions → Increment View Count → 
Load File from R2 → Render in 3D Viewer
```

### 4. Marketplace Transaction
```
Buyer → Select Project → Checkout → Stripe Payment → Order Created → 
Download Token Generated → File Access Granted
```

### 5. Collaboration Flow
```
Owner → Create Folder → Invite Members → Set Permissions → 
Members Upload/Edit → Activity Logged
```

---

## 🔒 Security Features

1. **Authentication**
   - JWT tokens with expiration
   - HttpOnly cookies for token storage
   - Password hashing with bcrypt

2. **Authorization**
   - Route-level authentication middleware
   - Resource-level permission checks
   - Subscription tier validation

3. **Data Protection**
   - CORS configuration (whitelisted origins)
   - SQL injection prevention (parameterized queries)
   - File upload validation
   - Rate limiting (email verification)

4. **Email Security**
   - Email verification tokens (24-hour expiration)
   - Rate limiting (3 attempts per 15 minutes)
   - Secure token generation (crypto.randomBytes)

---

## 📊 Subscription Tiers

| Tier | Storage | Max Files | Features |
|------|---------|-----------|----------|
| **Free** | 1 GB | 5 | Basic upload, public sharing |
| **Creator** | 50 GB | 50 | Marketplace, advanced analytics |
| **Studio** | 200 GB | Unlimited | Team collaboration, priority support |
| **Enterprise** | Unlimited | Unlimited | Custom features, SLA |

---

## 🚀 Deployment Architecture

### Frontend (Vercel)
- **Platform**: Vercel
- **Build**: `npm run build`
- **Runtime**: Next.js serverless functions
- **Environment**: `NEXT_PUBLIC_*` variables

### Backend (Railway)
- **Platform**: Railway
- **Runtime**: Node.js
- **Port**: 8080 (configurable)
- **Process**: `node backend/server.js`
- **Environment**: All backend secrets

### Database (Railway PostgreSQL)
- **Platform**: Railway
- **Type**: PostgreSQL
- **Connection**: `DATABASE_URL` environment variable
- **Migrations**: Manual SQL scripts

### Storage (Cloudflare R2)
- **Platform**: Cloudflare
- **Access**: S3-compatible API
- **CDN**: Cloudflare global network
- **Public URLs**: Via `R2_PUBLIC_URL` domain

---

## 🔌 Environment Variables

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_APP_URL=https://www.blueprintcad.io
```

### Backend (Railway)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
JWT_SECRET=your-secret-key

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-r2-domain.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@blueprintcad.io
SMTP_FROM_NAME=Blueprint

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 📈 Scalability Considerations

1. **Database**: PostgreSQL connection pooling
2. **Storage**: Cloudflare R2 (unlimited scale)
3. **CDN**: Cloudflare global network
4. **Caching**: Browser caching for static assets
5. **Rate Limiting**: Email verification, API endpoints
6. **File Processing**: Async thumbnail generation
7. **Load Balancing**: Railway/Vercel handle automatically

---

## 🧪 Development Workflow

1. **Local Development**
   - Frontend: `npm run dev` (port 3000)
   - Backend: `npm run start:backend` (port 8080)
   - Database: Local PostgreSQL or Railway connection

2. **Testing**
   - Manual testing via browser
   - API testing via Postman/curl
   - Database migrations via SQL scripts

3. **Deployment**
   - Frontend: Git push to Vercel
   - Backend: Git push to Railway
   - Database: Manual migration execution

---

## 📝 API Client Pattern

All frontend API calls use a centralized `apiFetch` utility:

```typescript
// lib/apiClient.ts
export async function apiFetch(path: string, options?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const token = localStorage.getItem('token');
  
  return fetch(`${base}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
}
```

---

## 🎯 Key Design Decisions

1. **Decoupled Architecture**: Frontend and backend are separate deployments
2. **JWT Authentication**: Stateless, scalable authentication
3. **R2 Storage**: Cost-effective object storage with CDN
4. **PostgreSQL**: Relational database for complex relationships
5. **Next.js App Router**: Modern React patterns with server components
6. **TypeScript**: Type safety on frontend
7. **Express.js**: Lightweight, flexible backend framework

---

## 📚 Additional Resources

- **Documentation**: See `README.md`
- **Database Migrations**: `backend/scripts/`
- **API Documentation**: Inline JSDoc comments
- **Design System**: `backend/lib/ui/design-system.ts`

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: BlueprintCAD Team

