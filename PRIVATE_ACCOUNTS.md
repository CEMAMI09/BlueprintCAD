# Private Account Feature Implementation

## Overview
Added support for private accounts where users can control who sees their profile, projects, and activity.

## Database Changes
- **Column Added**: `profile_private` (INTEGER, DEFAULT 0) to `users` table
- Default value 0 = public account
- Value 1 = private account

## Core Components

### 1. Privacy Utility Library (`lib/privacy-utils.js`)
Centralized privacy checking functions:

- **`isProfileVisible(targetUsername, viewerUsername)`**
  - Returns: `{ visible, isFollowing, isOwner, targetUser }`
  - Logic:
    - Public profiles: Always visible
    - Private profiles: Visible only to owner and followers
    - Not logged in: Can only see public profiles

- **`canViewProjects(targetUsername, viewerUsername)`**
  - Check if viewer can see target's projects

- **`canViewFollowers(targetUsername, viewerUsername)`**
  - Check if viewer can see target's followers/following

- **`filterProjectsByPrivacy(projects, viewerUsername)`**
  - Filter array of projects based on privacy rules

### 2. API Routes Updated

#### `/api/users/[username]` (Profile Info)
- Checks privacy before returning profile data
- Returns `{ isPrivate: true }` for blocked private profiles
- Includes `isFollowing` and `isOwner` flags

#### `/api/projects` (Project List)
- Filters projects by privacy settings
- Uses `filterProjectsByPrivacy()` to remove projects from private accounts

#### `/api/projects/[id]` (Single Project)
- Checks if project owner's account is private
- Returns 403 error if viewer doesn't have access
- Only increments views if access granted

#### `/api/users/update-privacy` (New Endpoint)
- POST endpoint to toggle privacy setting
- Requires authentication
- Body: `{ isPrivate: boolean }`

### 3. UI Components

#### Profile Page (`app/profile/[username]/page.tsx`)

**Private Account View:**
- Shows lock icon and message
- "This Account is Private" card
- Follow button for non-followers
- No projects or details visible

**Privacy Toggle in Edit Profile:**
- Toggle switch in profile edit modal
- Explanation: "When enabled, only followers can see your profile, projects, and activity"
- Updates via `/api/users/update-privacy` endpoint

**Privacy Indicator:**
- Lock icon badge next to username for private accounts
- Visible to all viewers (including non-followers)

## Privacy Rules

### What's Hidden on Private Accounts:
1. **Profile Details** - Bio, stats, avatar (except to followers/owner)
2. **Projects** - All projects filtered from listings
3. **Activity** - No project views, likes, comments visible
4. **Followers/Following Lists** - Hidden from non-followers

### What's Still Visible:
1. **Username** - Can still be searched/mentioned
2. **Private Status** - Badge shows account is private
3. **Follow Button** - Non-followers can request to follow

## Testing Checklist

- [ ] Public account → Projects visible to all
- [ ] Private account → Projects hidden from non-followers
- [ ] Private account → Profile shows "This Account is Private" message
- [ ] Owner can always see own private profile
- [ ] Followers can see private profile after following
- [ ] Privacy toggle updates database correctly
- [ ] Privacy badge displays on private profiles
- [ ] Project detail pages respect privacy (403 error)
- [ ] Explore page filters out private account projects
- [ ] Marketplace respects privacy settings

## Migration
Run: `node scripts/add-private-accounts.js`

The migration adds the `profile_private` column to existing users with default value 0 (public).

## Future Enhancements
- [ ] Follow request system (currently follows are instant)
- [ ] Block user feature
- [ ] Privacy for specific projects (public profile, some private projects)
- [ ] Privacy analytics (who viewed your profile)
