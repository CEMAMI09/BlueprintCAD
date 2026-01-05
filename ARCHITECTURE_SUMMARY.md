# BlueprintCAD - Architecture Summary (Presentation Ready)

## 🎯 Platform Overview
**BlueprintCAD** is a modern, cloud-native platform for 3D CAD file management, collaboration, and marketplace.

---

## 🏛️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│                    (Web Browsers)                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS
                            │
        ┌───────────────────▼───────────────────┐
        │      VERCEL (Frontend)               │
        │  ┌──────────────────────────────┐   │
        │  │  Next.js 13 + React 18       │   │
        │  │  TypeScript + Tailwind CSS   │   │
        │  │  Three.js (3D Viewer)        │   │
        │  └──────────────────────────────┘   │
        └───────────────────┬──────────────────┘
                            │
                            │ REST API
                            │ (CORS Enabled)
        ┌───────────────────▼──────────────────┐
        │     RAILWAY (Backend API)             │
        │  ┌──────────────────────────────┐    │
        │  │  Express.js + Node.js        │    │
        │  │  JWT Authentication          │    │
        │  │  File Processing              │    │
        │  └──────────────────────────────┘    │
        └───┬──────────┬──────────┬─────────────┘
            │          │          │
    ┌───────▼──┐ ┌─────▼────┐ ┌───▼──────────┐
    │PostgreSQL│ │Cloudflare│ │  SMTP Email  │
    │ (Railway)│ │    R2    │ │  (Nodemailer)│
    │          │ │  Storage │ │              │
    └──────────┘ └──────────┘ └──────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 13** (App Router) + **React 18**
- **TypeScript** + **Tailwind CSS**
- **Three.js** (3D rendering)
- **Recharts** (Analytics)

### Backend
- **Express.js** + **Node.js**
- **JWT** Authentication
- **PostgreSQL** Database
- **Cloudflare R2** Storage

### Services
- **Stripe** (Payments)
- **OAuth** (Google, GitHub)
- **SMTP** (Email)

---

## 📦 Core Features

### 1. **User Management**
- Email/Password + OAuth authentication
- Email verification
- Profile management
- Subscription tiers

### 2. **File Management**
- CAD file upload (STL, OBJ, etc.)
- Automatic thumbnail generation
- Version control
- Folder organization

### 3. **Collaboration**
- Team folders
- Role-based permissions
- Activity tracking
- Comments & annotations

### 4. **Marketplace**
- Buy/sell 3D models
- Stripe payment integration
- Licensing options
- Seller analytics

### 5. **Social Features**
- User profiles
- Follow/unfollow
- Project likes
- Messaging & channels

### 6. **Analytics**
- Revenue tracking
- Download statistics
- View analytics
- Conversion rates

---

## 🗄️ Data Architecture

### Database (PostgreSQL)
- **Users**: Accounts, profiles, subscriptions
- **Projects**: 3D models, metadata
- **Folders**: Hierarchical organization
- **Orders**: Marketplace transactions
- **Channels**: Messaging system

### Storage (Cloudflare R2)
- **CAD Files**: Original 3D models
- **Thumbnails**: Auto-generated previews
- **User Assets**: Profile pictures, banners

---

## 🔐 Security

- ✅ JWT token authentication
- ✅ Email verification
- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ Rate limiting
- ✅ SQL injection prevention
- ✅ File upload validation

---

## 💰 Subscription Tiers

| Tier | Storage | Max Files | Price |
|------|---------|-----------|-------|
| **Free** | 1 GB | 5 | $0 |
| **Pro** | 10 GB | 25 | $15/mo |
| **Studio** | 200 GB | Unlimited | $49/mo |
| **Enterprise** | Unlimited | Unlimited | $199/mo |

---

## 🚀 Deployment

- **Frontend**: Vercel (Serverless)
- **Backend**: Railway (Node.js)
- **Database**: Railway PostgreSQL
- **Storage**: Cloudflare R2 (Global CDN)
- **Domain**: blueprintcad.io

---

## 📊 API Endpoints (Key)

```
Authentication:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me

Projects:
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id
  PUT    /api/projects/:id

Files:
  GET  /api/files/:path
  POST /api/upload

Analytics:
  GET /api/analytics/seller
```

---

## 🔄 Key Workflows

### File Upload
```
Upload → Validate → R2 Storage → Thumbnail → Database → Success
```

### Purchase Flow
```
Browse → Select → Checkout → Stripe → Order → Download
```

### Collaboration
```
Create Folder → Invite → Set Permissions → Collaborate
```

---

## 📈 Scalability

- ✅ **Database**: Connection pooling
- ✅ **Storage**: Unlimited R2 capacity
- ✅ **CDN**: Global Cloudflare network
- ✅ **Auto-scaling**: Railway/Vercel
- ✅ **Caching**: Browser + CDN

---

## 🎨 Design Principles

1. **Decoupled Architecture**: Frontend/Backend separation
2. **RESTful APIs**: Standard HTTP methods
3. **Type Safety**: TypeScript on frontend
4. **Responsive Design**: Mobile-first approach
5. **Performance**: Optimized 3D rendering
6. **Security First**: Multiple layers of protection

---

## 📝 Development

- **Language**: TypeScript (Frontend), JavaScript (Backend)
- **Package Manager**: npm
- **Version Control**: Git
- **CI/CD**: Vercel + Railway auto-deploy

---

**For detailed architecture, see `ARCHITECTURE.md`**

