# Backend Cleanup Summary

## ✅ COMPLETED

### 1. Converted Lib Files to CommonJS
- ✅ `backend/lib/auth.js` - Converted to CommonJS
- ✅ `backend/lib/verification-middleware.js` - Converted to CommonJS  
- ✅ `backend/lib/email-verification.js` - Converted to CommonJS

### 2. Created Express Route Structure
- ✅ `backend/routes/auth.js` - Authentication routes (register, login)
- ✅ `backend/routes/cad.js` - CAD file routes
- ✅ `backend/server.js` - Updated Express server with proper CORS and error handling
- ✅ Deleted old `backend/routes.js` (dynamic loading - replaced with explicit routes)

## 🗑️ FILES TO DELETE (73+ files)

**ALL files in `backend/api/**` must be deleted** - they are Next.js API routes, not Express routes.

### Complete List:
```
backend/api/cad/list.js
backend/api/cad/files/upload.js
backend/api/cad/files/index.ts
backend/api/comments/[commentId]/reactions.ts
backend/api/comments/on/[entityType]/[entityId].ts
backend/api/dashboard/activity.js
backend/api/dashboard/stats.js
backend/api/dashboard/storage.js
backend/api/dashboard/trending.js
backend/api/files/[file].ts
backend/api/folders/[id]/activity.ts
backend/api/folders/[id]/breadcrumb.ts
backend/api/folders/[id]/comments.ts
backend/api/folders/[id]/index.ts
backend/api/folders/[id]/members.ts
backend/api/folders/[id]/members/[memberId].ts
backend/api/folders/[id]/members/[memberId]/role.ts
backend/api/folders/[id]/move-folder.ts
backend/api/folders/[id]/rename.ts
backend/api/folders/index.ts
backend/api/folders/move.ts
backend/api/folders/tree.ts
backend/api/forum/[id].ts
backend/api/forum/stats.js
backend/api/forum/threads.ts
backend/api/invitations/[id].ts
backend/api/invitations/index.ts
backend/api/issues/[id]/update.js
backend/api/issues/list.js
backend/api/issues/submit.js
backend/api/licenses/types.js
backend/api/manufacturing-orders/create.js
backend/api/messages.ts
backend/api/messages/[username].ts
backend/api/notifications.ts
backend/api/orders/checkout.js
backend/api/orders/confirm.js
backend/api/orders/download.js
backend/api/orders/my-orders.js
backend/api/orders/refund.js
backend/api/ownership-transfer/[requestId].ts
backend/api/ownership-transfer/index.ts
backend/api/projects/[id]/comments.js
backend/api/projects/[id]/index.js
backend/api/projects/[id]/like.js
backend/api/projects/[id]/restore-version.ts
backend/api/projects/[id]/upload-version.ts
backend/api/projects/[id]/versions.ts
backend/api/projects/[id]/rename.ts
backend/api/projects/estimate.js
backend/api/projects/index.js
backend/api/projects/move.ts
backend/api/projects/starred.js
backend/api/quote/analyze.js
backend/api/rename-move-history/[entityType]/[entityId].ts
backend/api/stats.js
backend/api/storefront/[username].js
backend/api/thumbnails/[file].ts
backend/api/thumbnails/generate.ts
backend/api/upload.js
backend/api/users/banner/[file].ts
backend/api/users/check-pending.js
backend/api/users/follow.js
backend/api/users/follow-request.js
backend/api/users/follow-requests.js
backend/api/users/profile-picture/[file].ts
backend/api/users/profile.ts
backend/api/users/search.ts
backend/api/users/update-privacy.js
backend/api/users/[username]/follow.js
backend/api/users/[username]/followers.js
backend/api/users/[username]/following.js
backend/api/users/[username]/index.js
```

**Why delete?** These files:
- Use `export default async function handler(req, res)` (Next.js pattern)
- Use `req.query` for path parameters (should be `req.params` in Express)
- Use ESM imports (`import`) instead of CommonJS (`require`)
- Have wrong relative paths like `../../../db/db`
- Use Next.js config exports (`export const config`)
- Use Next.js types (`NextApiRequest`, `NextApiResponse`)

## 🔄 FILES TO CONVERT (Remaining lib files)

These lib files still need ESM → CommonJS conversion:
- `backend/lib/folder-utils.js`
- `backend/lib/cad-formats.js`
- `backend/lib/email-templates.js`
- `backend/lib/email.js`
- `backend/lib/file-metadata-utils.js`
- `backend/lib/generateThumbnail.js`
- `backend/lib/print-cost-config.js`
- `backend/lib/print-cost-estimator.js`
- `backend/lib/print-cost-validator.js`
- `backend/lib/privacy-utils.js`
- `backend/lib/rate-limit.js`
- `backend/lib/stl-printability.js`
- `backend/lib/stl-utils.js`
- `backend/lib/stripe-utils.js`
- `backend/lib/thumbnailGenerator.js`
- `backend/lib/thumbnailGeneratorSimple.js`
- `backend/lib/activity-logger.js` (check if ESM)

## 📝 CONVERSION PATTERN

### Converting Lib Files (ESM → CommonJS)

**Before:**
```javascript
import { getDb } from '../../db/db';
export async function myFunction() { }
```

**After:**
```javascript
const { getDb } = require('../../db/db');
async function myFunction() { }
module.exports = { myFunction };
```

### Converting API Routes (Next.js → Express)

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
  const { id } = req.params; // Note: req.query → req.params
  // ...
});

module.exports = router;
```

## 🎯 NEXT STEPS

1. **Delete all `backend/api/**` files** (73+ files)
2. **Convert remaining lib files** to CommonJS
3. **Create Express routes** in `backend/routes/` for:
   - Projects
   - Users
   - Folders
   - Upload
   - Orders
   - Messages
   - Notifications
   - Forum
   - Issues
   - etc.
4. **Update `backend/server.js`** to mount all routes
5. **Test** that backend boots with `node backend/server.js`

## 📁 FINAL STRUCTURE

```
backend/
  lib/              # CommonJS utilities
  routes/           # Express route files
    auth.js
    cad.js
    projects.js
    users.js
    folders.js
    upload.js
    orders.js
    messages.js
    notifications.js
    forum.js
    issues.js
    etc.
  server.js         # Express app entry point
  scripts/          # Migration scripts (keep as-is)
```

## ✅ VERIFICATION CHECKLIST

- [ ] All `backend/api/**` files deleted
- [ ] All `backend/lib/**` files converted to CommonJS
- [ ] All Express routes created in `backend/routes/`
- [ ] `backend/server.js` mounts all routes
- [ ] Backend boots with `node backend/server.js`
- [ ] No ESM imports in backend
- [ ] No Next.js patterns (`export default handler`, `req.query` for paths)
- [ ] All import paths fixed (relative to backend root)
- [ ] CORS configured correctly
- [ ] Error handling in place

