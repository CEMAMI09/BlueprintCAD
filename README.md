
# BlueprintCAD Web Application

BlueprintCAD is a modern web platform for sharing, managing, and collaborating on 3D models and CAD files. Built with Next.js, it supports user authentication, project management, social features, and an interactive 3D viewer.

## Key Features
- User authentication (email, Google, GitHub)
- Upload, organize, and share 3D models
- Social and collaboration tools
- Marketplace for 3D assets
- Interactive 3D model viewer

## Getting Started
1. Install dependencies:
	```bash
	npm install
	```
2. Copy and configure your environment variables:
	```bash
	cp .env.example .env.local
	# Edit .env.local as needed
	```
3. Start the development server:
	```bash
	npm run dev
	```
4. Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
- `app/` — Main application code (pages, components, API routes)
- `public/` — Static assets
- `db/`, `storage/`, `backend/`, `frontend/`, `lib/` — Supporting code and resources

## License
See repository for license details.
