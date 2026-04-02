/**
 * Maps API project rows to Explore / storefront design cards.
 */

export interface Design {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  authorProfilePicture?: string | null;
  authorSubscriptionTier?: string | null;
  thumbnail: string;
  thumbnailUrl?: string | null;
  stars: number;
  downloads: number;
  views: number;
  price: number | null;
  tags: string[];
  createdAt: string;
  description: string;
  files: number;
  comments: number;
  liked: boolean;
  fileUrl?: string | null;
  fileType?: string | null;
}

export function mapProjectsToDesigns(projects: unknown[]): Design[] {
  return projects.map((raw: any) => {
    let thumbnailUrl: string | null = null;
    if (raw.thumbnail_path) {
      const thumbnailPath = String(raw.thumbnail_path);
      thumbnailUrl = `/api/thumbnails/${encodeURIComponent(thumbnailPath)}?t=${Date.now()}`;
    }
    return {
      id: raw.id.toString(),
      title: raw.title || raw.name,
      author: raw.username,
      authorAvatar: raw.username?.substring(0, 2).toUpperCase() || 'UN',
      authorProfilePicture: raw.profile_picture || null,
      authorSubscriptionTier: raw.subscription_tier || null,
      thumbnail: thumbnailUrl || '📦',
      thumbnailUrl,
      stars: raw.likes || 0,
      downloads: raw.downloads || 0,
      views: raw.views || 0,
      price: raw.for_sale ? (raw.price || 0) : null,
      tags: (() => {
        if (!raw.tags) return [];
        if (Array.isArray(raw.tags)) return raw.tags;
        if (typeof raw.tags === 'string') {
          return raw.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
        }
        return [];
      })(),
      createdAt: raw.created_at,
      description: raw.description || '',
      files: raw.file_count || 0,
      comments: raw.comment_count || 0,
      liked: false,
      fileUrl:
        raw.file_path &&
        raw.file_type &&
        ['stl', 'obj', 'fbx', 'gltf', 'glb', 'ply', 'dae', 'collada'].includes(
          raw.file_type.toLowerCase().replace('.', '')
        )
          ? `/api/files/${encodeURIComponent(String(raw.file_path))}`
          : null,
      fileType: raw.file_type
        ? raw.file_type.startsWith('.')
          ? raw.file_type
          : `.${raw.file_type}`
        : null,
    };
  });
}
