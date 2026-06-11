export const SUPPORT_EMAIL = 'info.blueprintcad@gmail.com';

export interface DocSection {
  heading?: string;
  body: string;
  bullets?: string[];
}

export interface DocArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  sections: DocSection[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  docSlug?: string;
  keywords?: string[];
}

export const docArticles: DocArticle[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Create an account, upload your first design, and explore BlueprintCAD.',
    category: 'Getting Started',
    sections: [
      {
        body: 'BlueprintCAD is a web platform for CAD creators. You can host 3D projects, share interactive previews, discover work in the community, sell designs on the Marketplace, and request manufacturing quotes — all from one place.',
      },
      {
        heading: 'Step 1 — Create your account',
        body: 'Head to the Register page and sign up with your email address. After registering you will need to verify your email:',
        bullets: [
          'Check your inbox for a verification link, or enter the 6-digit code if prompted.',
          'If you don\'t see the email, check spam and use the resend option on the verification notice page.',
          'Once verified, log in from the Login page. OAuth sign-in is also available if configured.',
        ],
      },
      {
        heading: 'Step 2 — Upload your first project',
        body: 'From the Dashboard or Upload page, select a CAD file from your computer and give the project a name:',
        bullets: [
          'STL, OBJ, GLB, GLTF, and FBX files preview directly in the browser.',
          'Add a description and tags so others can find your work on Explore.',
          'Choose Public visibility to share with the community, or Private to keep it to yourself.',
          'After upload, open the project page to view the interactive 3D preview.',
        ],
      },
      {
        heading: 'Step 3 — Organize with folders',
        body: 'Use Folders in the sidebar to group related projects (e.g. by client, product line, or version). Drag projects into folders from the Folders page. Free tier accounts have a limited number of folders and private projects; upgrading unlocks more.',
      },
      {
        heading: 'Step 4 — Explore the platform',
        body: 'Here are the main areas to visit once you are set up:',
        bullets: [
          'Dashboard — overview of your projects, storage usage, and recent activity.',
          'Explore — browse and search public designs from other creators.',
          'Marketplace — buy and sell CAD files.',
          'Forum — community discussions and help threads.',
          'Quote Tool — get manufacturing cost estimates for 3D-printable models.',
          'Profile — your public creator page at /profile/[your-username].',
        ],
      },
      {
        heading: 'Need help?',
        body: 'Visit the Support page for FAQs, browse this documentation hub, ask on the Forum, or email us at info.blueprintcad@gmail.com.',
      },
    ],
  },
  {
    slug: 'file-formats',
    title: 'Supported File Formats',
    description: 'Which CAD formats BlueprintCAD accepts and how they are handled.',
    category: 'Getting Started',
    sections: [
      {
        body: 'BlueprintCAD accepts a wide range of 3D mesh and CAD exchange formats. How each format is handled depends on whether the browser-based viewer can render it natively.',
      },
      {
        heading: 'Fully viewable formats',
        body: 'These formats support interactive 3D preview, rotation, zoom, and dimension extraction:',
        bullets: [
          'STL (.stl) — most common 3D printing format. Binary and ASCII supported.',
          'OBJ (.obj) — Wavefront OBJ mesh format.',
          'GLB / GLTF (.glb, .gltf) — modern, compact 3D format. Recommended for web preview.',
          'FBX (.fbx) — Autodesk interchange format.',
        ],
      },
      {
        heading: 'Upload-only formats (no in-browser preview)',
        body: 'These can be uploaded, stored, and shared, but require conversion for in-browser viewing:',
        bullets: [
          'STEP / STP (.step, .stp) — ISO 10303 CAD exchange.',
          'IGES / IGS (.iges, .igs) — legacy CAD exchange.',
          'DWG (.dwg) — AutoCAD binary drawings.',
          'DXF (.dxf) — AutoCAD drawing exchange.',
        ],
      },
      {
        heading: 'Recommended workflow',
        body: 'For the best experience on BlueprintCAD:',
        bullets: [
          'Export from your CAD software as STL or GLB for 3D printing and preview.',
          'Keep file sizes under 50 MB when possible for faster uploads.',
          'Check your storage usage on the Dashboard — limits depend on your subscription tier.',
          'If a preview fails, re-export with default mesh settings or try a different format.',
        ],
      },
      {
        heading: 'Printability analysis',
        body: 'For STL uploads, BlueprintCAD can analyze wall thickness, bounding dimensions, and other printability factors. This is especially useful in the Quote Tool before requesting a manufacturing estimate.',
      },
    ],
  },
  {
    slug: 'sharing',
    title: 'Sharing Your Designs',
    description: 'Share projects publicly, privately, or via secure links.',
    category: 'Getting Started',
    sections: [
      {
        body: 'BlueprintCAD gives you several ways to control who sees your work and what they can do with it.',
      },
      {
        heading: 'Public vs private projects',
        body: 'When uploading or editing a project, set visibility to:',
        bullets: [
          'Public — appears on Explore, your profile, and can be discovered via search.',
          'Private — visible only to you. Free tier accounts have a limited number of private projects.',
        ],
      },
      {
        heading: 'Share links',
        body: 'From any project page, open the Share option to generate a token-based link:',
        bullets: [
          'Anyone with the link can view the project without needing an account.',
          'You can restrict links to view-only or allow downloads depending on your settings.',
          'Revoke or regenerate links at any time from the project page.',
        ],
      },
      {
        heading: 'Your public profile',
        body: 'Your profile at /profile/[username] showcases your published work, follower count, and bio. Update your avatar, banner, and description from Settings to make a strong first impression.',
      },
      {
        heading: 'Creator storefront',
        body: 'On Creator and Studio tiers you can build a branded storefront at /storefront. Your public store lives at /[username]/store and displays your marketplace listings with custom branding, colors, and featured projects.',
      },
      {
        heading: 'Social sharing',
        body: 'Use the share modal on Explore or project pages to copy a link or share directly. Public projects can also be starred and liked by other users, increasing visibility in trending feeds.',
      },
    ],
  },
  {
    slug: 'selling',
    title: 'Selling on the Marketplace',
    description: 'List designs for sale and manage your creator storefront.',
    category: 'Marketplace',
    sections: [
      {
        body: 'BlueprintCAD lets you monetize your CAD work by listing designs on the Marketplace. Buyers purchase through secure checkout and receive file access per your listing terms.',
      },
      {
        heading: 'Listing a design for sale',
        body: 'To sell a design:',
        bullets: [
          'Upload and publish the project you want to sell.',
          'Open the Marketplace listing flow and set a title, description, price, and category.',
          'Clearly describe what the buyer receives (file formats, versions, support).',
          'Publish the listing — it will appear on the Marketplace and your storefront.',
        ],
      },
      {
        heading: 'Pricing your work',
        body: 'Consider the complexity, exclusivity, and included formats when setting a price. You can offer multiple file formats in a single listing. Check what similar designs sell for on the Marketplace for reference.',
      },
      {
        heading: 'Storefront customization',
        body: 'Creator and Studio tiers can customize their storefront:',
        bullets: [
          'Set store name, description, banner, and logo.',
          'Choose brand colors and industry focus.',
          'Feature specific projects on your store homepage.',
          'Your store is live at /[username]/store.',
        ],
      },
      {
        heading: 'Platform fees',
        body: 'BlueprintCAD charges a platform fee on each sale. The fee percentage depends on your subscription tier — Free tier sellers pay a higher fee, while Creator and Studio tiers pay less. See the Subscription page for current rates.',
      },
      {
        heading: 'Orders and fulfillment',
        body: 'When a buyer purchases your design:',
        bullets: [
          'They receive download access to the files per your listing.',
          'The order appears in your Orders page.',
          'Creator tier and above can view sales analytics on the Analytics page.',
          'Connect your payout details in Settings > Billing to receive earnings.',
        ],
      },
    ],
  },
  {
    slug: 'payments',
    title: 'Payments & Pricing',
    description: 'Subscriptions, checkout, and how payments work.',
    category: 'Marketplace',
    sections: [
      {
        body: 'BlueprintCAD uses Stripe for secure payment processing. This covers both subscription billing and marketplace purchases.',
      },
      {
        heading: 'Subscription tiers',
        body: 'Three tiers are available:',
        bullets: [
          'Free — limited private projects, folders, and storage (~0.5 GB). Selling allowed with higher platform fee.',
          'Creator — unlimited private projects and folders, ~50 GB storage, lower platform fee, storefront customization, sales analytics, and licensing options.',
          'Studio — ~200 GB storage, team features, API access, shared storefront, and advanced analytics.',
        ],
      },
      {
        heading: 'Upgrading your plan',
        body: 'Visit the Subscription page or Settings > Billing to compare tiers and upgrade. Changes take effect according to your billing cycle. You can manage or cancel your subscription from the same page.',
      },
      {
        heading: 'Buying designs on the Marketplace',
        body: 'When you purchase a design:',
        bullets: [
          'Add the listing to your cart and proceed to Checkout.',
          'Pay securely via Stripe.',
          'After payment, download the files from your Orders page.',
          'Usage rights are defined by the seller\'s listing description.',
        ],
      },
      {
        heading: 'Seller payouts',
        body: 'To receive earnings from marketplace sales, connect your payment details in Settings under Billing. Payouts are processed according to your account configuration and Stripe\'s payout schedule.',
      },
      {
        heading: 'Quote tool limits',
        body: 'The Quote Tool provides manufacturing cost estimates. Saved quotes and monthly request limits depend on your tier — Free accounts have the fewest, Creator and Studio tiers allow more.',
      },
    ],
  },
  {
    slug: 'licensing',
    title: 'Licensing Options',
    description: 'How licensing works when you sell or share designs.',
    category: 'Marketplace',
    sections: [
      {
        body: 'When you sell or share CAD files, it is important to be clear about what buyers and viewers are allowed to do with your work.',
      },
      {
        heading: 'License on purchase',
        body: 'When a buyer purchases a design on the Marketplace, they receive a license to use the files according to the terms you state in your listing. Always clearly describe:',
        bullets: [
          'Permitted uses — personal, commercial, or both.',
          'Whether modification and redistribution are allowed.',
          'How many seats or installations are covered.',
          'Whether attribution is required.',
        ],
      },
      {
        heading: 'Creator tier licensing features',
        body: 'Creator and Studio tiers unlock advanced licensing options for marketplace listings, allowing you to define usage rights more precisely when creating a listing.',
      },
      {
        heading: 'Public sharing is not a license',
        body: 'Publishing a project publicly on Explore does not automatically grant commercial rights to viewers. Anyone who needs a commercial license should purchase through the Marketplace where your terms apply.',
      },
      {
        heading: 'Best practices',
        body: 'Include license terms in your project description and listing. If you offer multiple license tiers (e.g. personal vs commercial), state the price for each. When in doubt, be explicit — it protects both you and your buyers.',
      },
    ],
  },
  {
    slug: 'account-billing',
    title: 'Account & Billing',
    description: 'Manage your profile, password, notifications, and subscription.',
    category: 'Account',
    sections: [
      {
        body: 'Your account settings control your profile, security, notifications, and subscription. Access everything from Settings in the sidebar.',
      },
      {
        heading: 'Profile settings',
        body: 'Update your account from Settings > Profile:',
        bullets: [
          'Username — your public URL is /profile/[username].',
          'Avatar and banner images.',
          'Bio and social links.',
          'Email address (verification may be required after changes).',
        ],
      },
      {
        heading: 'Password and security',
        body: 'Manage security from Settings > Security:',
        bullets: [
          'Change your password at any time.',
          'Use Forgot Password on the login page if you are locked out.',
          'Use Forgot Username if you cannot remember your username.',
          'Keep email verification enabled for account recovery.',
        ],
      },
      {
        heading: 'Notification preferences',
        body: 'Configure alerts in Settings > Notifications:',
        bullets: [
          'Email notifications — on/off for account and activity emails.',
          'Comments on your designs.',
          'New followers.',
          'Marketplace updates and sales.',
        ],
      },
      {
        heading: 'Subscription and billing',
        body: 'View your current plan, compare tiers, upgrade, or manage payment methods from Settings > Billing or the Subscription page. Invoices and billing history are available through Stripe\'s customer portal when connected.',
      },
      {
        heading: 'Deleting your account',
        body: 'If you need to delete your account or export your data, contact us at info.blueprintcad@gmail.com and we will assist you.',
      },
    ],
  },
  {
    slug: 'quote-tool',
    title: 'Using the Quote Tool',
    description: 'Get manufacturing estimates for your 3D models.',
    category: 'Tools',
    sections: [
      {
        body: 'The Quote Tool helps you move from a digital model to a physical part by providing manufacturing cost estimates and printability analysis.',
      },
      {
        heading: 'Getting started',
        body: 'Open Quote Tool from the sidebar navigation. Upload an STL or other supported mesh file to begin:',
        bullets: [
          'The tool displays your model in a 3D preview.',
          'Bounding dimensions and volume are calculated automatically.',
          'Select material and quantity options for the estimate.',
        ],
      },
      {
        heading: 'Printability analysis',
        body: 'Before quoting, the tool checks for common 3D printing problems:',
        bullets: [
          'Very thin walls that may not print reliably.',
          'Extremely small features below printer resolution.',
          'Models with very few triangles (possibly corrupt or incomplete).',
          'Review all flagged issues before submitting a quote request.',
        ],
      },
      {
        heading: 'Understanding the estimate',
        body: 'The estimate includes material cost, print time factors, and quantity pricing where applicable. Estimates are indicative — final pricing may vary based on material availability and manufacturing partner requirements.',
      },
      {
        heading: 'Saving quotes',
        body: 'You can save quotes for later reference. Limits depend on your subscription tier:',
        bullets: [
          'Free — limited saved quotes per month.',
          'Creator — higher saved quote limit.',
          'Studio — highest limits and additional manufacturing features.',
        ],
      },
      {
        heading: 'Tips for accurate quotes',
        body: 'Export your model at the correct scale (millimeters recommended). Ensure the mesh is watertight with no holes or non-manifold edges. Remove internal geometry you do not need printed to reduce cost.',
      },
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    id: 'create-first-design',
    question: 'How do I create my first CAD design?',
    answer:
      'BlueprintCAD hosts and shares designs you create in external CAD software. Register an account, go to Upload, and add your file (STL, OBJ, GLB, or FBX work best for preview). Name your project, set visibility, and it will appear on your Dashboard.',
    category: 'Getting Started',
    docSlug: 'getting-started',
    keywords: ['upload', 'first', 'project', 'new'],
  },
  {
    id: 'file-formats',
    question: 'What file formats are supported?',
    answer:
      'STL, OBJ, GLB, GLTF, and FBX support in-browser 3D preview. STEP, IGES, DWG, and DXF can be uploaded and stored but need conversion for preview. Export to STL or GLB from your CAD tool for the best experience.',
    category: 'Getting Started',
    docSlug: 'file-formats',
    keywords: ['stl', 'obj', 'step', 'formats', 'upload'],
  },
  {
    id: 'share-designs',
    question: 'How do I share my designs?',
    answer:
      'Set a project to Public to show it on Explore and your profile, or generate a Share Link from the project page for token-based access. You can restrict links to view-only or allow downloads.',
    category: 'Getting Started',
    docSlug: 'sharing',
    keywords: ['share', 'link', 'public', 'private'],
  },
  {
    id: 'sell-designs',
    question: 'How do I sell my designs?',
    answer:
      'List a published project on the Marketplace with a price and description. Customize your storefront on Creator or Studio tiers. Buyers purchase through checkout and you receive payouts per your tier fee structure.',
    category: 'Marketplace',
    docSlug: 'selling',
    keywords: ['sell', 'marketplace', 'storefront', 'list'],
  },
  {
    id: 'payments-pricing',
    question: 'How do payments and pricing work?',
    answer:
      'BlueprintCAD offers Free, Creator, and Studio subscription tiers with different storage and feature limits. Marketplace purchases use secure checkout. Sellers connect billing in Settings to receive payouts.',
    category: 'Marketplace',
    docSlug: 'payments',
    keywords: ['payment', 'subscription', 'tier', 'price', 'billing'],
  },
  {
    id: 'licensing',
    question: 'What licensing options are available?',
    answer:
      'When selling on the Marketplace, define usage rights in your listing description. Creator and Studio tiers unlock advanced licensing options. Public sharing does not grant commercial rights—direct buyers to purchase for licensed use.',
    category: 'Marketplace',
    docSlug: 'licensing',
    keywords: ['license', 'commercial', 'rights'],
  },
  {
    id: 'reset-password',
    question: 'How do I reset my password?',
    answer:
      'Click Forgot Password on the login page and enter your email. You will receive a reset link. If you forgot your username, use the Forgot Username page. For other account issues, email us at info.blueprintcad@gmail.com.',
    category: 'Account',
    docSlug: 'account-billing',
    keywords: ['password', 'login', 'username', 'reset'],
  },
  {
    id: 'storage-limits',
    question: 'What are my storage limits?',
    answer:
      'Storage depends on your tier: Free accounts get about 0.5 GB, Creator about 50 GB, and Studio about 200 GB. Check your current usage on the Dashboard. Upgrade from Settings or the Subscription page if you need more space.',
    category: 'Account',
    docSlug: 'account-billing',
    keywords: ['storage', 'limit', 'space', 'gb'],
  },
  {
    id: 'quote-tool',
    question: 'How does the Quote Tool work?',
    answer:
      'Upload a 3D model to the Quote Tool to get manufacturing estimates and printability analysis. The tool flags thin walls and other issues. Saved quote limits vary by subscription tier.',
    category: 'Tools',
    docSlug: 'quote-tool',
    keywords: ['quote', 'manufacturing', 'print', 'estimate'],
  },
  {
    id: 'report-bug',
    question: 'How do I report a bug or issue?',
    answer:
      'Use the Issue Reporter at /issues to submit bugs with details and optional screenshots. You can track submitted issues when logged in. For urgent matters, email info.blueprintcad@gmail.com.',
    category: 'Support',
    keywords: ['bug', 'issue', 'report', 'problem', 'error'],
  },
  {
    id: 'forum-help',
    question: 'Can I get help from the community?',
    answer:
      'Yes. Visit the Community Forum to ask questions, share tips, and connect with other creators. Search existing threads before posting—your question may already be answered.',
    category: 'Support',
    keywords: ['forum', 'community', 'help', 'discussion'],
  },
  {
    id: 'contact-support',
    question: 'How do I contact support directly?',
    answer:
      'Email us at info.blueprintcad@gmail.com. We typically respond within 24 hours on business days (Mon–Fri, 9am–6pm EST). Include your username and steps to reproduce any issue.',
    category: 'Support',
    keywords: ['email', 'contact', 'support', 'help'],
  },
];

export function getDocBySlug(slug: string): DocArticle | undefined {
  return docArticles.find((doc) => doc.slug === slug);
}

export function searchSupportContent(query: string): {
  faqs: FaqItem[];
  docs: DocArticle[];
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { faqs: faqItems, docs: docArticles };
  }

  const faqs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q))
  );

  const docs = docArticles.filter(
    (doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.sections.some(
        (s) =>
          s.body.toLowerCase().includes(q) ||
          s.heading?.toLowerCase().includes(q) ||
          s.bullets?.some((b) => b.toLowerCase().includes(q))
      )
  );

  return { faqs, docs };
}

export const faqCategories = [...new Set(faqItems.map((f) => f.category))];

export const docCategories = [...new Set(docArticles.map((d) => d.category))];

export const popularArticles = [
  { title: 'Getting Started Guide', slug: 'getting-started' },
  { title: 'Supported File Formats', slug: 'file-formats' },
  { title: 'Sharing Your Designs', slug: 'sharing' },
  { title: 'Payments & Pricing', slug: 'payments' },
];
