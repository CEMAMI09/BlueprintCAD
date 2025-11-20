# Blueprint - 3D Model Sharing Platform

A Next.js-based platform for sharing, discovering, and collaborating on 3D models and CAD files.

## Features

- 🔐 **Authentication**: Email/password + Google/GitHub OAuth
- 📁 **Project Management**: Upload and organize 3D models
- 👥 **Social Features**: Follow users, like projects, comment
- 🔒 **Privacy Controls**: Public/private profiles and projects
- 📂 **Team Collaboration**: Shared folders with role-based access
- 💬 **Forum**: Community discussions
- 📊 **3D Viewer**: Interactive preview for STL, OBJ, FBX, GLTF, and more
- 💰 **Marketplace**: Buy and sell 3D models
- 📐 **AI Features**: Cost estimation and printability analysis

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- SQLite3

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
node scripts/add-oauth-support.js

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Setup

See [OAuth Setup Guide](./docs/OAUTH_SETUP.md) for complete configuration details.

Required variables:
```bash
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

Optional OAuth providers:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
