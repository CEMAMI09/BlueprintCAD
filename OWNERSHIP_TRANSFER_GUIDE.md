# Ownership Transfer System - Testing Guide

## Overview
The ownership transfer system allows project and folder owners to transfer ownership to another user with a confirmation workflow.

## Features Implemented

### Database
- ✅ `ownership_transfer_requests` table (pending, accepted, rejected, cancelled)
- ✅ `ownership_transfer_history` table (permanent audit trail)
- ✅ `owner_id` column added to folders table
- ✅ Indexes for performance

### API Endpoints
- ✅ `POST /api/ownership-transfer` - Create transfer request
- ✅ `GET /api/ownership-transfer?type=incoming` - View incoming requests
- ✅ `GET /api/ownership-transfer?type=outgoing` - View sent requests
- ✅ `POST /api/ownership-transfer/[requestId]` with `action: accept` - Accept transfer
- ✅ `POST /api/ownership-transfer/[requestId]` with `action: reject` - Reject transfer
- ✅ `POST /api/ownership-transfer/[requestId]` with `action: cancel` - Cancel by sender

### UI Components
- ✅ `TransferOwnershipModal` - Initiate transfer with confirmation
- ✅ `TransferRequestsList` - View and manage requests (incoming/outgoing tabs)
- ✅ `/transfer-requests` page - Dedicated page for transfer management
- ✅ Transfer button on project detail pages (owner only)
- ✅ Transfer button on folder detail pages (owner only)
- ✅ Navbar link to transfer requests page

### Nested Transfer Logic
- ✅ Folder transfers include all subfolders recursively
- ✅ All projects in transferred folders are transferred
- ✅ History created for each transferred entity
- ✅ Existing folder members preserved

### Notification System
- ✅ Recipient notified when transfer requested
- ✅ Sender notified when transfer accepted
- ✅ Sender notified when transfer rejected

## Testing Steps

### 1. Initiate Transfer (Project Owner)
1. Login as user A
2. Navigate to a project you own
3. Click "Transfer Ownership" button (amber colored)
4. Enter username of user B
5. Add optional message
6. Click "Continue"
7. Review confirmation warning
8. Click "Confirm Transfer"
9. Verify success message

### 2. View Incoming Requests (Recipient)
1. Login as user B
2. Click transfer icon in navbar (swap arrows)
3. View pending request in "Incoming" tab
4. Should see project/folder name, sender username, message

### 3. Accept Transfer
1. As user B, click "Accept" on request
2. Verify ownership transferred
3. Navigate to the project/folder
4. Verify user B is now owner
5. Verify user A received notification

### 4. Transfer Folder with Nested Content
1. Login as user A
2. Create folder with:
   - Subfolder 1
   - Subfolder 2 (inside Subfolder 1)
   - Project 1 (in root folder)
   - Project 2 (in Subfolder 1)
   - Project 3 (in Subfolder 2)
3. Transfer root folder to user B
4. Accept as user B
5. Verify all nested folders and projects transferred
6. Check ownership_transfer_history for all items

### 5. Reject Transfer
1. As user A, initiate transfer to user B
2. As user B, view incoming requests
3. Click "Reject"
4. Verify request status changes
5. Verify user A receives rejection notification
6. Verify ownership unchanged

### 6. Cancel Transfer
1. As user A, initiate transfer to user B
2. View "Outgoing" tab in transfer requests
3. Click "Cancel Request"
4. Verify request cancelled
5. As user B, verify request no longer in incoming

## Expected Behavior

### Transfer Request Creation
- ✅ Only owner can initiate transfer
- ✅ Cannot transfer to self
- ✅ Cannot have multiple pending requests for same entity
- ✅ Validates recipient username exists
- ✅ Creates notification for recipient

### Transfer Acceptance
- ✅ Only recipient can accept
- ✅ Must be pending status
- ✅ Updates ownership immediately
- ✅ Creates history record
- ✅ For folders: recursively transfers all nested content
- ✅ Preserves existing folder members and roles
- ✅ Notifies sender of acceptance

### Transfer Rejection
- ✅ Only recipient can reject
- ✅ Must be pending status
- ✅ Ownership unchanged
- ✅ Notifies sender of rejection

### Transfer Cancellation
- ✅ Only sender can cancel
- ✅ Must be pending status
- ✅ No notification sent

## Database Queries for Verification

```sql
-- View all transfer requests
SELECT * FROM ownership_transfer_requests;

-- View transfer history
SELECT * FROM ownership_transfer_history;

-- Check project ownership
SELECT id, title, user_id FROM projects WHERE id = ?;

-- Check folder ownership
SELECT id, name, owner_id, user_id FROM folders WHERE id = ?;

-- View notifications
SELECT * FROM notifications WHERE type LIKE '%transfer%' ORDER BY created_at DESC;
```

## API Testing with curl

```bash
# Create transfer request
curl -X POST http://localhost:3000/api/ownership-transfer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "project",
    "entity_id": 1,
    "to_username": "recipient_username",
    "message": "Please accept this transfer"
  }'

# Get incoming requests
curl http://localhost:3000/api/ownership-transfer?type=incoming \
  -H "Authorization: Bearer YOUR_TOKEN"

# Accept transfer
curl -X POST http://localhost:3000/api/ownership-transfer/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'

# Reject transfer
curl -X POST http://localhost:3000/api/ownership-transfer/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reject"}'

# Cancel transfer
curl -X POST http://localhost:3000/api/ownership-transfer/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "cancel"}'
```

## Known Limitations
- Transfer cannot be undone once accepted (by design)
- Billing responsibility transfer mentioned in requirements not implemented (no billing system in codebase)
- No real-time notifications (requires WebSocket or polling)

## Future Enhancements
- Add transfer request expiration (auto-reject after X days)
- Batch transfer for multiple items
- Transfer templates for common scenarios
- Email notifications for transfers
- Transfer approval by multiple users (for enterprise)
