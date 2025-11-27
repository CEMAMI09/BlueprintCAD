# Diff Details

Date : 2025-11-26 18:53:18

Directory /Users/user/Documents/BlueprintCAD

Total : 44 files,  2745 codes, 131 comments, 423 blanks, all 3299 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [SUBSCRIPTION\_IMPLEMENTATION\_GUIDE.md](/SUBSCRIPTION_IMPLEMENTATION_GUIDE.md) | Markdown | 376 | 0 | 70 | 446 |
| [SUBSCRIPTION\_SYSTEM\_DESIGN.md](/SUBSCRIPTION_SYSTEM_DESIGN.md) | Markdown | 287 | 0 | 61 | 348 |
| [SUBSCRIPTION\_SYSTEM\_SUMMARY.md](/SUBSCRIPTION_SYSTEM_SUMMARY.md) | Markdown | 255 | 0 | 59 | 314 |
| [app/checkout/page.tsx](/app/checkout/page.tsx) | TypeScript JSX | 20 | 1 | 1 | 22 |
| [app/components/navbar.tsx](/app/components/navbar.tsx) | TypeScript JSX | 1 | 0 | 0 | 1 |
| [app/dashboard/page.tsx](/app/dashboard/page.tsx) | TypeScript JSX | 16 | 0 | 2 | 18 |
| [app/explore/page.tsx](/app/explore/page.tsx) | TypeScript JSX | 30 | 0 | 0 | 30 |
| [app/folders/page.tsx](/app/folders/page.tsx) | TypeScript JSX | 4 | 0 | 0 | 4 |
| [app/forum/page.tsx](/app/forum/page.tsx) | TypeScript JSX | 20 | 1 | 2 | 23 |
| [app/globals.css](/app/globals.css) | PostCSS | 16 | 2 | 2 | 20 |
| [app/login/page.tsx](/app/login/page.tsx) | TypeScript JSX | 0 | 1 | 1 | 2 |
| [app/marketplace/page.tsx](/app/marketplace/page.tsx) | TypeScript JSX | 4 | 0 | 0 | 4 |
| [app/messages/page.tsx](/app/messages/page.tsx) | TypeScript JSX | 4 | 0 | 0 | 4 |
| [app/page.tsx](/app/page.tsx) | TypeScript JSX | -4 | 0 | 0 | -4 |
| [app/project/\[id\]/page.tsx](/app/project/%5Bid%5D/page.tsx) | TypeScript JSX | 27 | 0 | 0 | 27 |
| [app/quote/page.tsx](/app/quote/page.tsx) | TypeScript JSX | 4 | 0 | 0 | 4 |
| [app/register/page.tsx](/app/register/page.tsx) | TypeScript JSX | 0 | 1 | 1 | 2 |
| [app/settings/page.tsx](/app/settings/page.tsx) | TypeScript JSX | 1 | 0 | 0 | 1 |
| [app/subscription/page.tsx](/app/subscription/page.tsx) | TypeScript JSX | 337 | 3 | 23 | 363 |
| [app/upload/page.tsx](/app/upload/page.tsx) | TypeScript JSX | 31 | 1 | 1 | 33 |
| [backend/lib/subscription-utils.js](/backend/lib/subscription-utils.js) | JavaScript | 229 | 37 | 34 | 300 |
| [db/migrations/006\_add\_subscriptions.js](/db/migrations/006_add_subscriptions.js) | JavaScript | 113 | 11 | 17 | 141 |
| [frontend/components/SubscriptionGate.tsx](/frontend/components/SubscriptionGate.tsx) | TypeScript JSX | 115 | 6 | 17 | 138 |
| [frontend/components/UpgradeModal.tsx](/frontend/components/UpgradeModal.tsx) | TypeScript JSX | 197 | 0 | 16 | 213 |
| [frontend/components/ui/GlobalNavSidebar.tsx](/frontend/components/ui/GlobalNavSidebar.tsx) | TypeScript JSX | -6 | 0 | 0 | -6 |
| [lib/stripe-utils.js](/lib/stripe-utils.js) | JavaScript | 104 | 20 | 12 | 136 |
| [pages/api/comments/on/\[entityType\]/\[entityId\].ts](/pages/api/comments/on/%5BentityType%5D/%5BentityId%5D.ts) | TypeScript | 14 | 1 | 1 | 16 |
| [pages/api/folders/\[id\]/members.ts](/pages/api/folders/%5Bid%5D/members.ts) | TypeScript | 15 | 1 | 1 | 17 |
| [pages/api/folders/index.ts](/pages/api/folders/index.ts) | TypeScript | 17 | 1 | 1 | 19 |
| [pages/api/forum/threads.ts](/pages/api/forum/threads.ts) | TypeScript | 9 | 1 | 1 | 11 |
| [pages/api/manufacturing-orders/\[id\]/status.js](/pages/api/manufacturing-orders/%5Bid%5D/status.js) | JavaScript | 55 | 5 | 16 | 76 |
| [pages/api/messages.ts](/pages/api/messages.ts) | TypeScript | 11 | 1 | 1 | 13 |
| [pages/api/orders/checkout.js](/pages/api/orders/checkout.js) | JavaScript | 5 | 1 | 1 | 7 |
| [pages/api/orders/confirm.js](/pages/api/orders/confirm.js) | JavaScript | 15 | 2 | 2 | 19 |
| [pages/api/projects/\[id\]/download.js](/pages/api/projects/%5Bid%5D/download.js) | JavaScript | 28 | 4 | 2 | 34 |
| [pages/api/projects/\[id\]/index.js](/pages/api/projects/%5Bid%5D/index.js) | JavaScript | 7 | 1 | 1 | 9 |
| [pages/api/projects/\[id\]/like.js](/pages/api/projects/%5Bid%5D/like.js) | JavaScript | 7 | 2 | 2 | 11 |
| [pages/api/projects/index.js](/pages/api/projects/index.js) | JavaScript | 31 | 4 | 4 | 39 |
| [pages/api/subscriptions/can-action.js](/pages/api/subscriptions/can-action.js) | JavaScript | 23 | 1 | 8 | 32 |
| [pages/api/subscriptions/cancel.js](/pages/api/subscriptions/cancel.js) | JavaScript | 31 | 4 | 10 | 45 |
| [pages/api/subscriptions/check.js](/pages/api/subscriptions/check.js) | JavaScript | 37 | 2 | 7 | 46 |
| [pages/api/subscriptions/platform-fee.js](/pages/api/subscriptions/platform-fee.js) | JavaScript | 22 | 2 | 6 | 30 |
| [pages/api/subscriptions/upgrade.js](/pages/api/subscriptions/upgrade.js) | JavaScript | 56 | 7 | 14 | 77 |
| [pages/api/subscriptions/webhook.js](/pages/api/subscriptions/webhook.js) | JavaScript | 181 | 7 | 26 | 214 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details