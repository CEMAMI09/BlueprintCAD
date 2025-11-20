# Forge - Hardware Collaboration Platform Setup

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Installation Steps

1. **Install Dependencies**
```bash
   npm install
```

2. **Install Additional Required Packages**
```bash
   npm install sqlite sqlite3 bcryptjs jsonwebtoken formidable
   npm install -D autoprefixer postcss tailwindcss
```

3. **Create Environment File**
```bash
   cp .env.example .env.local
```
   
   Edit `.env.local` and set your own JWT_SECRET:
```
   JWT_SECRET=your-unique-secret-key-here
```

4. **Create Uploads Directory**
```bash
   mkdir -p public/uploads
```

5. **Initialize Database**
   The database will be automatically created on first run with the schema defined in `/lib/db.js`

6. **Run Development Server**
```bash
   npm run dev
```

7. **Open Browser**
   Navigate to `http://localhost:3000`

## Project Structure
```
forge/
├── pages/              # Next.js pages and API routes
│   ├── api/           # Backend API endpoints
│   ├── project/       # Dynamic project pages
│   ├── profile/       # Dynamic profile pages
│   └── *.js           # Main pages
├── components/        # React components
├── lib/              # Utility functions and database
├── styles/           # Global styles
├── public/           # Static assets
│   └── uploads/      # User uploaded files
└── forge.db          # SQLite database (auto-created)
```

## Features

### Implemented
- ✅ User registration and login
- ✅ JWT-based authentication
- ✅ File upload for CAD designs
- ✅ AI cost estimation (mock)
- ✅ Project browsing and search
- ✅ Project details with comments
- ✅ User profiles
- ✅ Like/follow functionality
- ✅ Marketplace filtering
- ✅ Responsive dark UI

### Coming Soon
- Community forum
- Real AI integration (Gemini/OpenAI)
- Payment processing (Stripe)
- 3D file preview
- Real-time notifications

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Projects
- GET `/api/projects` - List all public projects
- POST `/api/projects` - Create new project (auth required)
- GET `/api/projects/[id]` - Get project details
- PUT `/api/projects/[id]` - Update project (auth required)
- DELETE `/api/projects/[id]` - Delete project (auth required)
- POST `/api/projects/estimate` - Get AI cost estimate

### Users
- GET `/api/users/[username]` - Get user profile
- POST `/api/users/[username]/follow` - Follow/unfollow user

### Comments
- GET `/api/projects/[id]/comments` - Get project comments
- POST `/api/projects/[id]/comments` - Add comment (auth required)

## Development Tips

1. **Database Reset**: Delete `forge.db` to reset database
2. **Test Users**: Create multiple accounts to test social features
3. **File Uploads**: Supported formats: .stl, .obj, .scad, .step, .iges, .dwg, .dxf
4. **Authentication**: Token stored in localStorage
5. **CORS**: Add CORS headers if building separate frontend

## Production Deployment

### Environment Variables
```env
JWT_SECRET=strong-random-secret
DATABASE_PATH=/var/data/forge.db
NODE_ENV=production
```

### Build
```bash
npm run build
npm start
```

### Recommended Hosting
- Vercel (frontend + API routes)
- Railway (full stack with persistent storage)
- DigitalOcean App Platform
- AWS EC2 with RDS

## Troubleshooting

**Database locked error**
- Close other connections or delete `.db-journal` file

**Upload fails**
- Check `public/uploads` directory exists and has write permissions
- Verify file size is under 50MB

**Authentication issues**
- Clear localStorage and login again
- Check JWT_SECRET is set in `.env.local`

**Module not found**
- Run `npm install` again
- Delete `node_modules` and reinstall

## License
MIT