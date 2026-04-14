# BlueprintCAD

BlueprintCAD is a web platform for **CAD creators**: host 3D projects, share interactive previews, discover work in a community feed, sell designs, and connect to **manufacturing quotes**—without juggling disconnected file shares, generic marketplaces, and enterprise-only collaboration tools.

This document summarizes what BlueprintCAD is and the features implemented in this codebase (the Forge app).

---

## Product positioning

- **Single source of truth** for 3D work: projects, previews, and storefront presence stay aligned across sessions and devices.
- **Creator-first**: discovery, profiles, marketplace listings, and per-creator **storefronts** with branding and featured work.
- **Commerce + manufacturing**: sell digital goods with tiered platform fees; use the **quote flow** and related tooling to move from design toward physical parts where supported.

---

## Accounts and access

| Capability | Notes |
|------------|--------|
| **Registration & login** | Email/password; session via JWT/cookies. |
| **Email verification** | Link + optional 6-digit code; resend with rate limits. |
| **Password reset / username reminder** | Standard recovery flows. |
| **OAuth** | OAuth callback route exists for linked sign-in flows. |
| **Profiles** | Public profile by username; avatar/banner support; followers/following. |
| **Tiers** | Subscription tiers drive limits and features (see **Plans** below). |

---

## Core product areas

### Dashboard

- GitHub-style **dashboard**: KPIs (projects, files/versions, views), **storage usage** vs tier limits, **recent activity**, and **trending** designs.
- Entry point for returning creators.

### Projects & 3D viewing

- **Upload** CAD assets; associate with **folders** and visibility (public/private subject to tier limits).
- **Project detail** pages: **interactive 3D preview** (viewer integration), metadata (format, bounds, weight, print-oriented fields where present), views/likes, **starred** designs, **rename**, **history**, **delete** (owner).
- **Share links**: token-based sharing with options such as view-only or download restrictions where implemented.
- **Branches / versioning**: APIs and UI hooks exist for branches and timelines; treat advanced versioning as **in active development** where not fully surfaced in UI.

### Explore

- **Discover** public designs: grid/list, filters (e.g. trending), **search** across designs and **users**.
- **Share** designs via share modal.
- Tier-gated actions show **upgrade** prompts where applicable.

### Marketplace

- **Browse** purchasable listings: categories, pricing, sorting, seller info, ratings/reviews-style presentation.
- **Purchase** path integrates with checkout and orders (see Commerce).

### Creator storefront

- **Storefront builder** (`/storefront`): store name, description, banner/logo, colors, industry focus, featured projects.
- **Public store** at `/{username}/store`: branded presentation of the creator’s catalog and profile context.
- Higher tiers unlock **customization** and **team/shared** storefront concepts per subscription rules.

### Quote tool & manufacturing

- **Quote** experience for manufacturing estimates (including flows that reference **Blueprint Manufacturing** and instant/AI-style estimates where configured).
- **Buy** flows tied to printing/manufacturing where the product supports it.
- Tier limits apply (e.g. saved quotes, quote request counts on Free).

### Folders

- **Folder tree** and **folder context** for organizing projects; navigation between folder views and project detail.

### Community

- **Forum**: threaded discussions at `/forum`.
- **Messages**: direct messaging between users; unread counts in navigation.
- **Notifications**: in-app notifications with unread badges.

### Commerce & subscriptions

- **Checkout** and **orders**; **subscription** management and success pages.
- **Stripe** (or configured provider) for payments where integrated.
- **Platform fee** and seller capabilities depend on tier (e.g. Free vs Creator vs Studio).

### Analytics

- **Seller analytics** API and UI surfaces (e.g. `/dashboard/analytics`, `/analytics`) for creators tracking performance over time ranges.

### Admin & operations

- **Admin** area for operational tasks (e.g. email campaigns, administration).
- **Support** page for user help.
- **Contact**, **Privacy** (and related legal) pages as shipped.

### Tools (navigation)

The main marketing navbar may link to **Assembly**, **Drawing**, and **BOM** editors and the **Get Quote** tool. **Quote** is implemented; dedicated editor routes may be **planned or partial**—confirm in-app before promising specific editor UX.

---

## Plans (subscription tiers)

Canonical tier keys in the backend: **free**, **creator**, **studio** (with legacy aliases normalized to these).

High-level differences:

| Area | Free | Creator | Studio |
|------|------|---------|--------|
| **Private projects** | Limited count | Unlimited | Unlimited |
| **Folders** | Limited count | Unlimited | Unlimited |
| **Storage** | ~0.5 GB | ~50 GB | ~200 GB |
| **Selling** | Allowed with higher platform fee | Lower fee; storefront customization; licensing; sales analytics; featured listing; manufacturing orders | Team features; API access; collaboration; shared storefront; more seats |
| **Analytics** | None / minimal | Sales-focused | Advanced |
| **API access** | No | No | Yes |
| **Team** | — | — | Team members, roles, shared storefront (per feature flags) |

Exact numbers and flags live in `backend/lib/subscriptionFeatures.js` and should be treated as the source of truth if this doc drifts.

---

## Technical notes (for contributors)

- **Frontend**: Next.js app routes under `app/`; shared UI in `components/` and `frontend/components/`.
- **Backend**: Express API under `backend/` with PostgreSQL; file storage and thumbnails as configured (e.g. R2/S3-style keys for assets).
- **Email**: Transactional email via SendGrid API (preferred) or SMTP; verification and password flows depend on correct env configuration.

---

## Roadmap language

Marketing copy on the public **coming-soon** home may describe future or aspirational capabilities (e.g. deeper real-time collaboration). This file aims to reflect **what the repository is built to support today**; when in doubt, verify against routes and `backend/lib/subscriptionFeatures.js`.

---

*Last updated to match the Forge / BlueprintCAD codebase structure and subscription configuration.*
