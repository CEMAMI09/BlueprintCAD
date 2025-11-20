# Forge TypeScript Setup

## Installation

1. **Install all dependencies**
```bash
   npm install
```

2. **Set up environment variables**
   Create `.env.local`:
```env
   JWT_SECRET=your-secret-key-here
   AIzaSyBdVvN9nP9Bc0t2AvaJLAYGsBz1-CjR9Sw
```

3. **Create uploads directory**
```bash
   mkdir -p public/uploads
```

4. **Run development server**
```bash
   npm run dev
```

## Features Implemented

✅ **3D Preview**: Drag/rotate/zoom STL files  
✅ **Real AI Estimates**: Powered by Google Gemini  
✅ **Manufacturing Options**: Compare pricing from different sources  
✅ **Cost Breakdown**: Detailed material/labor/time costs  
✅ **TypeScript**: Full type safety  

## How It Works

1. **Upload STL file** - Drag and drop or click to upload
2. **3D Preview loads** - Interactive Three.js viewer
3. **AI analyzes file** - Gemini AI examines the CAD file
4. **Get estimate** - Detailed cost breakdown with manufacturing options
5. **Choose option** - Select Forge Manufacturing or other options

## Manufacturing Options

- **Forge Manufacturing** (Recommended): We manufacture it for you
- **Local Services**: Find 3D printing services near you
- **DIY**: Cost estimate if you make it yourself

Enjoy! 🚀