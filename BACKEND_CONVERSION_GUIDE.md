# Backend Express Conversion Guide

## Classification Summary

### Files to DELETE (73+ files)
ALL files in `backend/api/**` are Next.js API routes and must be deleted. They use:
- `export default async function handler(req, res)` (Next.js pattern)
- `req.query` (Next.js routing)
- ESM imports
- Wrong relative paths

### Files to REWRITE
All `backend/lib/**` files with ESM imports need CommonJS conversion.

### Files that are CORRECT
- `backend/server.js` (needs minor fixes)
- `backend/routes.js` (needs fixes)
- `db/db.js` (already CommonJS)

## Conversion Pattern

### Step 1: Convert Lib Files (ESM → CommonJS)

**Before (ESM):**
```javascript
import { getDb } from '../../db/db';
export async function myFunction() { }
```

**After (CommonJS):**
```javascript
const { getDb } = require('../../db/db');
async function myFunction() { }
module.exports = { myFunction };
```

### Step 2: Convert API Routes (Next.js → Express)

**Before (Next.js):**
```javascript
import { getDb } from '../../../db/db';
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  // ...
}
```

**After (Express):**
```javascript
const express = require('express');
const router = express.Router();
const { getDb } = require('../../db/db');

router.get('/:id', async (req, res) => {
  const { id } = req.params; // Note: req.query → req.params for path params
  // ...
});

module.exports = router;
```

### Step 3: Fix Import Paths

All imports must use relative paths from the backend root:
- `../../../db/db` → `../../db/db` (from backend/api/*)
- `../../../backend/lib/auth` → `../lib/auth` (from backend/api/*)

## Express Route Structure

Routes should be organized as:
```
backend/
  routes/
    auth.js
    projects.js
    users.js
    folders.js
    etc.
```

Each route file exports an Express router.

