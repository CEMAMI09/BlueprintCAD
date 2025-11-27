
'use client';

import { ThreePanelLayout, CenterPanel, RightPanel, PanelHeader, PanelContent } from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import FolderContextSidebar from '@/frontend/components/FolderContextSidebar';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ThreeDViewer from '@/frontend/components/ThreeDViewer';
import RenameModal from '@/frontend/components/RenameModal';
import HistoryModal from '@/components/HistoryModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import Link from 'next/link';
import { MapPin, Link as LinkIcon, Github, Instagram, Youtube, Copy, Check } from 'lucide-react';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import TierBadge from '@/frontend/components/TierBadge';
import ShareLinkModal from '@/frontend/components/ShareLinkModal';


interface Project {
  id: string;
  title: string;
  description: string;
  username: string;
  created_at: string;
  file_path: string;
  file_type: string;
  views: number;
  likes: number;
  downloads?: number;
  for_sale: boolean;
  price?: number;
  ai_estimate?: string;
  tags?: string;
  thumbnail_path?: string;
  dimensions?: string;
  scale_percentage?: number;
  weight_grams?: number;
  print_time_hours?: number;
  canViewCostData?: boolean;
  isOwner?: boolean;
  is_public?: number | boolean;
  folder_id?: number | null;
  shareLinkAccess?: boolean;
  shareLinkData?: {
    download_blocked: boolean;
    view_only: boolean;
  } | null;
  // Metadata fields
  file_size_bytes?: number | null;
  bounding_box_width?: number | null;
  bounding_box_height?: number | null;
  bounding_box_depth?: number | null;
  file_format?: string | null;
  upload_timestamp?: string | null;
  file_checksum?: string | null;
  branch_count?: number | null;
}

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = (params?.id || '') as string;
  const [project, setProject] = useState<Project | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false); // Using "liked" for starred state
  const [actionError, setActionError] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null);
  const [checksumCopied, setChecksumCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Check if user came from a folder page
  // Only true if explicitly set to 'folder', false otherwise (including undefined/null)
  const fromFolder = searchParams?.get('from') === 'folder';
  
  const copyChecksum = async () => {
    if (project?.file_checksum) {
      try {
        await navigator.clipboard.writeText(project.file_checksum);
        setChecksumCopied(true);
        setTimeout(() => setChecksumCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy checksum:', err);
      }
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchLikeState(); // Fetches starred state
      checkPurchaseStatus();
    }
  }, [id]);

  useEffect(() => {
    if (project?.folder_id) {
      fetchCurrentBranch();
    }
  }, [project?.folder_id, id]);

  const fetchCurrentBranch = async () => {
    if (!project?.folder_id) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${id}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const masterBranch = data.branches?.find((b: any) => b.is_master === 1);
        if (masterBranch) {
          setCurrentBranchId(masterBranch.id);
        }
      }
    } catch (error) {
      console.error('Error fetching current branch:', error);
    }
  };

  useEffect(() => {
    // Always fetch author profile - we'll decide which sidebar to show based on fromFolder
    if (project?.username) {
      fetchAuthorProfile();
    }
  }, [project?.username]);

  const checkPurchaseStatus = async () => {
    try {
      const res = await fetch('/api/orders/my-orders?type=purchases');
      if (res.ok) {
        const data = await res.json();
        const purchased = data.purchases?.some((order: any) => 
          order.project.id === parseInt(id) && 
          order.payment_status === 'succeeded' &&
          order.status !== 'refunded'
        );
        setHasPurchased(purchased);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchAuthorProfile = async () => {
    if (!project?.username) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/users/${project.username}`, { 
        headers,
        cache: 'no-store' 
      });
      if (res.ok) {
        const data = await res.json();
        setAuthorProfile(data);
      }
    } catch (error) {
      console.error('Error fetching author profile:', error);
    }
  };

  const fetchLikeState = async () => { // Fetches starred state
    try {
      const res = await fetch(`/api/projects/${id}/like`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(!!data.liked);
        setProject(p => p ? { ...p, likes: data.likes ?? p.likes } : p);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchProject = async () => {
    try {
      const shareToken = searchParams?.get('share') || sessionStorage.getItem('shareToken');
      const url = `/api/projects/${id}${shareToken ? `?share=${shareToken}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Debug: log share link data
        const shareToken = searchParams?.get('share') || sessionStorage.getItem('shareToken');
        console.log('[Project] Share link debug:', {
          shareToken: shareToken,
          shareLinkAccess: data.shareLinkAccess,
          shareLinkData: data.shareLinkData,
          download_blocked: data.shareLinkData?.download_blocked,
          isOwner: data.isOwner,
          username: data.username,
          shouldHideDownload: !!(data.shareLinkAccess && data.shareLinkData?.download_blocked)
        });
        setProject(data);
          // Debug: log project file info for 3D viewer
          // eslint-disable-next-line no-console
          console.log('[Project] Project loaded:', { 
            id: data.id, 
            file_path: data.file_path, 
            file_type: data.file_type, 
            thumbnail_path: data.thumbnail_path,
            hasThumbnail: !!data.thumbnail_path,
            thumbnailUrl: data.thumbnail_path ? `/api/thumbnails/${data.thumbnail_path.replace('thumbnails/', '')}` : null,
            fileUrl: data.file_path ? `/api/files/${encodeURIComponent(data.file_path)}` : null,
            metadata: {
              file_size_bytes: data.file_size_bytes,
              bounding_box: data.bounding_box_width ? `${data.bounding_box_width}x${data.bounding_box_height}x${data.bounding_box_depth}` : null,
              file_format: data.file_format,
              checksum: data.file_checksum ? data.file_checksum.substring(0, 16) + '...' : null,
              branch_count: data.branch_count
            }
          });
          
          if (!data.thumbnail_path) {
            console.warn('[Project] WARNING: Project loaded without thumbnail_path!');
          }
          
          // If no thumbnail but file exists, check again after a delay
          if (!data.thumbnail_path && data.file_path) {
            console.log('[Project] No thumbnail found, will check again in 2 seconds...');
            setTimeout(async () => {
              try {
                const retryRes = await fetch(`/api/projects/${id}`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                  }
                });
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  console.log('[Project] Retry - thumbnail_path:', retryData.thumbnail_path);
                  if (retryData.thumbnail_path) {
                    setProject(retryData);
                  }
                }
              } catch (err) {
                console.error('[Project] Retry failed:', err);
              }
            }, 2000);
          }
        setFetchError('');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setFetchError(errorData.error || `Failed to load project (${res.status})`);
        console.error('Project fetch failed', { status: res.status, error: errorData });
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setFetchError('Network error while loading project');
    } finally {
      setLoading(false);
    }
  };


  const handleLike = async () => { // Handles star/unstar
    if (!user) {
      try {
        if (typeof window !== 'undefined') {
          setTimeout(() => router.push('/login'), 0);
        }
      } catch (err) {
        console.error('Navigation error:', err);
        window.location.href = '/login';
      }
      return;
    }

    try {
      setActionError('');
      const res = await fetch(`/api/projects/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(!!data.liked);
        setProject(project => project ? { ...project, likes: data.likes ?? project.likes } : null);
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error || `Failed to star (status ${res.status})`);
      }
    } catch (err) {
      console.error('Failed to star:', err);
      setActionError('Network error while starring.');
    }
  };


  const handleDownload = async () => {
    if (!project?.file_path) return;
    
    // Check if download is blocked via share link
    if (project?.shareLinkData?.download_blocked) {
      setActionError('Downloads are disabled for this share link');
      return;
    }
    
    // Check if design is for sale and user hasn't purchased it
    if (project.for_sale && project.username !== user?.username && !hasPurchased) {
      setActionError('You must purchase this design before downloading.');
      // Go directly to checkout
      sessionStorage.setItem('checkoutData', JSON.stringify({
        type: 'digital',
        projectId: parseInt(id),
        projectTitle: project.title,
        price: project.price
      }));
      router.push('/checkout');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch the file from the download endpoint
      const res = await fetch(`/api/projects/${id}/download`, { headers });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Download failed' }));
        setActionError(error.error || 'Failed to download file');
        return;
      }
      
      // Get the blob and create download link
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = project.file_path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Refresh project data to get updated download count
      fetchProject();
    } catch (error) {
      console.error('Download error:', error);
      setActionError('Failed to download file');
    }
  };

  const handleRename = async (newTitle: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (res.ok) {
        fetchProject();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to rename project');
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setActionError('');

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        try {
          if (typeof window !== 'undefined' && user?.username) {
            setTimeout(() => router.push(`/profile/${user.username}`), 0);
          }
        } catch (err) {
          console.error('Navigation error:', err);
          if (user?.username) {
            window.location.href = `/profile/${user.username}`;
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error || 'Failed to delete project');
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      setActionError('Network error while deleting project');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Loading..." />
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin"
                  style={{ borderColor: DS.colors.border.default, borderTopColor: DS.colors.primary.blue }}></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!project) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Project Not Found" />
            <PanelContent>
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>Project Not Found</h1>
                {fetchError && (
                  <p className="mb-4" style={{ color: DS.colors.accent.error }}>{fetchError}</p>
                )}
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <>
      <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title={project.title}
            actions={
              <div className="flex items-center gap-4">
                {project.is_public && (
                  <Link href="/explore" className="hover:underline" style={{ color: DS.colors.primary.blue }}>
                    &larr; Back to Explore
                  </Link>
                )}
                {project.for_sale && project.price && project.price > 0 && (
                  <span className="text-2xl font-bold" style={{ color: DS.colors.accent.success }}>
                    ${project.price}
                  </span>
                )}
              </div>
            }
          />
          <PanelContent>
            <div className="px-4 md:px-10 py-8">
              <div className="grid md:grid-cols-3 gap-6">
              {/* Left Column - Preview */}
              <div className="md:col-span-2 space-y-6">
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl overflow-hidden">
                  {/* Auto-loading 3D Viewer for all CAD file types */}
                  {(() => {
                    if (project.file_type && project.file_path) {
                      const fileType = project.file_type.toLowerCase().replace('.', '');
                      const viewableTypes = ['stl', 'obj', 'fbx', 'gltf', 'glb', 'ply', 'dae', 'collada'];
                      if (viewableTypes.includes(fileType)) {
                        return (
                          <div style={{ width: '100%', margin: 0, padding: 0 }}>
                            <ThreeDViewer
                              fileUrl={`/api/files/${encodeURIComponent(project.file_path)}`}
                              fileName={`${project.title}${project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}`}
                              fileType={project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}
                              preset="detail"
                            />
                          </div>
                        );
                      }
                    }
                    // Fallback to thumbnail if 3D viewer not available
                    if (project.thumbnail_path) {
                      return (
                        <div className="aspect-video relative" style={{ background: DS.colors.background.panel }}>
                          <img
                            src={(() => {
                              const thumbnailPath = String(project.thumbnail_path);
                              const filename = thumbnailPath.includes('/') 
                                ? thumbnailPath.split('/').pop() || thumbnailPath
                                : thumbnailPath;
                              return `/api/thumbnails/${encodeURIComponent(filename)}`;
                            })()}
                            alt={project.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const container = img.parentElement;
                              if (container && !container.querySelector('.thumbnail-fallback')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'thumbnail-fallback flex items-center justify-center w-full h-full';
                                fallback.innerHTML = '<span class="text-4xl">📦</span>';
                                container.appendChild(fallback);
                              }
                            }}
                          />
                        </div>
                      );
                    }
                    // Final fallback
                    return (
                      <div className="aspect-video flex items-center justify-center" style={{ background: DS.colors.background.panel }}>
                        <svg className="w-24 h-24" style={{ color: DS.colors.text.tertiary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    );
                  })()}
                </div>
                {/* Description */}
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>Description</h2>
                  <p className="whitespace-pre-wrap" style={{ color: DS.colors.text.secondary }}>
                    {project.description || 'No description provided.'}
                  </p>
                </div>
              </div>
              {/* Right Column - Details & Actions */}
              <div className="space-y-6">
                {/* Actions */}
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6 space-y-3">
                  {actionError && (
                    <div className="p-3 text-sm rounded-md" style={{ background: DS.colors.accent.error + '20', border: `1px solid ${DS.colors.accent.error}40`, color: DS.colors.accent.error }}>
                      {actionError}
                    </div>
                  )}
                  <button
                    onClick={handleLike}
                    className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    style={liked 
                      ? { background: DS.colors.primary.blue, color: '#fff', fontWeight: '600' }
                      : { background: DS.colors.background.panel, color: DS.colors.text.primary }
                    }
                  >
                    <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {project.likes ? `${project.likes} Stars` : 'Star'}
                  </button>
                  {/* Download button - hide if downloads are blocked via share link (for both owners and non-owners) */}
                  {(!project.for_sale || project.username === user?.username || hasPurchased) && 
                   !(project.shareLinkData && project.shareLinkData.download_blocked) ? (
                    <button
                      onClick={handleDownload}
                      className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      style={{ background: 'transparent', border: '1px solid #fff', color: '#fff' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  ) : null}
                  {project.for_sale && project.username !== user?.username && (
                    <button
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                          return;
                        }
                        if (hasPurchased) {
                          router.push('/orders');
                          return;
                        }
                        // Go directly to checkout
                        sessionStorage.setItem('checkoutData', JSON.stringify({
                          type: 'digital',
                          projectId: parseInt(id),
                          projectTitle: project.title,
                          price: project.price
                        }));
                        router.push('/checkout');
                      }}
                      className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      style={{ background: DS.colors.primary.blue, color: '#fff' }}
                    >
                      {hasPurchased ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          View in Orders
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Purchase for ${project.price?.toFixed(2)}
                        </>
                      )}
                    </button>
                  )}
                  {/* Share button - hide if accessed via share link */}
                  {!project.shareLinkAccess && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      style={{ background: DS.colors.primary.blue, color: '#fff' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                  )}
                  {/* Owner actions */}
                  {user?.username === project.username && (
                    <>
                      <button
                        onClick={() => setIsRenameModalOpen(true)}
                        className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                        style={{ background: DS.colors.accent.purple, color: '#fff' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Rename File
                      </button>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                        style={{ background: DS.colors.accent.error, color: '#fff' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Project
                      </button>
                    </>
                  )}
                </div>
                {/* Details */}
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
                  <h3 className="font-bold mb-4" style={{ color: DS.colors.text.primary }}>Details</h3>
                  
                  {/* File Metadata */}
                  {(project.file_size_bytes || project.bounding_box_width || project.bounding_box_height || project.bounding_box_depth || project.file_format || project.file_checksum || (project.branch_count !== null && project.branch_count !== undefined)) && (
                    <div className="mb-6 pb-6 border-b" style={{ borderColor: DS.colors.border.default }}>
                      <h4 className="font-semibold text-sm mb-3" style={{ color: DS.colors.text.secondary }}>File Metadata</h4>
                      <div className="space-y-2 text-sm">
                        {project.file_size_bytes && (
                          <div className="flex items-center justify-between">
                            <span style={{ color: DS.colors.text.secondary }}>File Size</span>
                            <span style={{ color: DS.colors.text.primary }}>
                              {project.file_size_bytes < 1024 
                                ? `${project.file_size_bytes} B`
                                : project.file_size_bytes < 1024 * 1024
                                ? `${(project.file_size_bytes / 1024).toFixed(2)} KB`
                                : `${(project.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`}
                            </span>
                          </div>
                        )}
                        {project.file_format && (
                          <div className="flex items-center justify-between">
                            <span style={{ color: DS.colors.text.secondary }}>Format</span>
                            <span style={{ color: DS.colors.text.primary }} className="uppercase">{project.file_format}</span>
                          </div>
                        )}
                        {(project.bounding_box_width || project.bounding_box_height || project.bounding_box_depth) && (
                          <div className="flex items-center justify-between">
                            <span style={{ color: DS.colors.text.secondary }}>Dimensions</span>
                            <span style={{ color: DS.colors.text.primary }}>
                              {project.bounding_box_width?.toFixed(2) || '?'} × {project.bounding_box_height?.toFixed(2) || '?'} × {project.bounding_box_depth?.toFixed(2) || '?'} mm
                            </span>
                          </div>
                        )}
                        {project.upload_timestamp && (
                          <div className="flex items-center justify-between">
                            <span style={{ color: DS.colors.text.secondary }}>Uploaded</span>
                            <span style={{ color: DS.colors.text.primary }}>
                              {new Date(project.upload_timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {project.file_checksum && (
                          <div className="flex items-center justify-between gap-2">
                            <span style={{ color: DS.colors.text.secondary }}>Checksum</span>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span style={{ color: DS.colors.text.primary }} className="font-mono text-xs truncate flex-1" title={project.file_checksum}>
                                {project.file_checksum.substring(0, 16)}...
                              </span>
                              <button
                                onClick={copyChecksum}
                                className="p-1.5 rounded hover:bg-gray-700 transition-colors flex-shrink-0"
                                title="Copy full checksum"
                              >
                                {checksumCopied ? (
                                  <Check size={14} style={{ color: DS.colors.accent.success }} />
                                ) : (
                                  <Copy size={14} style={{ color: DS.colors.text.secondary }} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        {project.branch_count !== null && project.branch_count !== undefined && project.branch_count > 0 && (
                          <div className="flex items-center justify-between">
                            <span style={{ color: DS.colors.text.secondary }}>Branches</span>
                            <span style={{ color: DS.colors.text.primary }}>{project.branch_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3 text-sm">
                    <div>
                      <span style={{ color: DS.colors.text.secondary }}>File Type:</span>
                      <span className="ml-2" style={{ color: DS.colors.text.primary }}>.{project.file_type}</span>
                    </div>
                    <div>
                      <span style={{ color: DS.colors.text.secondary }}>Views:</span>
                      <span className="ml-2" style={{ color: DS.colors.text.primary }}>{project.views || 0}</span>
                    </div>
                    <div>
                      <span style={{ color: DS.colors.text.secondary }}>Downloads:</span>
                      <span className="ml-2" style={{ color: DS.colors.text.primary }}>{project.downloads || 0}</span>
                    </div>
                    {project.canViewCostData && project.ai_estimate && (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Est. Cost:</span>
                        <span className="ml-2" style={{ color: DS.colors.accent.success, fontWeight: 500 }}>{project.ai_estimate}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: DS.colors.text.secondary }}>Uploaded:</span>
                      <span className="ml-2" style={{ color: DS.colors.text.primary }}>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Tags */}
                {project.tags && (
                  <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
                    <h3 className="font-bold mb-3" style={{ color: DS.colors.text.primary }}>Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.split(',').map((tag, i) => (
                        <span key={i} className="px-3 py-1 rounded-lg text-sm" style={{ background: DS.colors.background.panel, color: DS.colors.text.secondary }}>
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        // Show folder context ONLY if explicitly coming from a folder page
        // Otherwise, always show author profile (even for projects in folders)
        (project?.folder_id && fromFolder) ? (
          <RightPanel>
            <PanelHeader title="Folder Context" />
            <PanelContent>
              <FolderContextSidebar
                projectId={id}
                folderId={project.folder_id}
                branchId={currentBranchId}
                isRootFolder={false}
              />
            </PanelContent>
          </RightPanel>
        ) : (
          // Show author profile when:
          // - Not coming from folder, OR
          // - Project not in folder, OR
          // - Author profile is available
          authorProfile ? (
          <div className="p-6 space-y-6">
            {/* Author Profile */}
            <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
              <h3 className="font-bold mb-4" style={{ color: DS.colors.text.primary }}>Designer</h3>
              <Link href={`/profile/${authorProfile.username}`} className="block">
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 border-2"
                    style={{ 
                      backgroundColor: authorProfile.profile_picture ? 'transparent' : DS.colors.primary.blue, 
                      color: '#ffffff',
                      borderColor: DS.colors.border.default
                    }}
                  >
                    {authorProfile.profile_picture ? (
                      <img
                        src={`/api/users/profile-picture/${authorProfile.profile_picture}`}
                        alt={authorProfile.username}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.style.backgroundColor = DS.colors.primary.blue;
                            parent.textContent = authorProfile.username.substring(0, 2).toUpperCase();
                          }
                        }}
                      />
                    ) : (
                      authorProfile.username.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg truncate" style={{ color: DS.colors.text.primary }}>
                        {authorProfile.display_name || authorProfile.username}
                      </h4>
                      <TierBadge tier={authorProfile.subscription_tier} size="sm" />
                    </div>
                    <p className="text-sm truncate" style={{ color: DS.colors.text.secondary }}>
                      @{authorProfile.username}
                    </p>
                  </div>
                </div>
              </Link>
              
              {authorProfile.bio && (
                <p className="text-sm mb-4 line-clamp-3" style={{ color: DS.colors.text.secondary }}>
                  {authorProfile.bio}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs mb-4" style={{ color: DS.colors.text.tertiary }}>
                {authorProfile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    {authorProfile.location}
                  </div>
                )}
                {authorProfile.website && (
                  <a 
                    href={authorProfile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline"
                    style={{ color: DS.colors.primary.blue }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon size={14} />
                    Website
                  </a>
                )}
              </div>

              {/* Social Links */}
              {authorProfile.social_links && typeof authorProfile.social_links === 'object' && (
                <div className="flex items-center gap-3 mb-4">
                  {authorProfile.social_links.github && (
                    <a
                      href={`https://github.com/${authorProfile.social_links.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition"
                      style={{ color: DS.colors.text.secondary }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Github size={20} />
                    </a>
                  )}
                  {authorProfile.social_links.twitter && (
                    <a
                      href={`https://x.com/${authorProfile.social_links.twitter.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//, '').replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition"
                      style={{ color: DS.colors.text.secondary }}
                      onClick={(e) => e.stopPropagation()}
                      title="X (Twitter)"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {authorProfile.social_links.instagram && (
                    <a
                      href={`https://instagram.com/${authorProfile.social_links.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition"
                      style={{ color: DS.colors.text.secondary }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {authorProfile.social_links.youtube && (
                    <a
                      href={`https://youtube.com/@${authorProfile.social_links.youtube.replace(/^https?:\/\/(www\.)?youtube\.com\/(@|channel\/)/, '').replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition"
                      style={{ color: DS.colors.text.secondary }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Youtube size={20} />
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: DS.colors.text.primary }}>
                    {authorProfile.followers || 0}
                  </div>
                  <div className="text-xs" style={{ color: DS.colors.text.secondary }}>Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: DS.colors.text.primary }}>
                    {authorProfile.totalStars || 0}
                  </div>
                  <div className="text-xs" style={{ color: DS.colors.text.secondary }}>Stars</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: DS.colors.text.primary }}>
                    {authorProfile.following || 0}
                  </div>
                  <div className="text-xs" style={{ color: DS.colors.text.secondary }}>Following</div>
                </div>
              </div>

              <Link href={`/profile/${authorProfile.username}`}>
                <button
                  className="w-full mt-4 py-2 rounded-lg font-medium transition"
                  style={{ 
                    background: DS.colors.primary.blue, 
                    color: '#fff' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = DS.colors.primary.blueHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = DS.colors.primary.blue;
                  }}
                >
                  View Profile
                </button>
              </Link>
            </div>
          </div>
          ) : (
            // Loading or no author profile yet
            <RightPanel>
              <PanelHeader title="Designer" />
              <PanelContent>
                <div className="p-6 text-center" style={{ color: DS.colors.text.secondary }}>
                  Loading...
                </div>
              </PanelContent>
            </RightPanel>
          )
        )
      }
      />
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onSubmit={handleRename}
        currentName={project?.title || ''}
        entityType="project"
        title="Rename File"
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
        loading={isDeleting}
      />
      {project && (
        <ShareLinkModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          entityType="project"
          entityId={Number(project.id)}
          entityName={project.title}
          isPublic={project.is_public === 1}
        />
      )}
    </>
  );
}