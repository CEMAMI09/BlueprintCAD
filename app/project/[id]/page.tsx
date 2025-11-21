
'use client';

import { ThreePanelLayout, CenterPanel, PanelHeader, PanelContent } from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ThreeDViewer from '@/components/ThreeDViewer';
import RenameModal from '@/components/RenameModal';
import HistoryModal from '@/components/HistoryModal';
import CommentSystem from '@/components/CommentSystem';
import ConfirmationModal from '@/components/ConfirmationModal';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  username: string;
  created_at: string;
}

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
}

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id || '') as string;
  const [project, setProject] = useState<Project | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false); // Using "liked" for starred state
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [actionError, setActionError] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchComments();
      fetchLikeState(); // Fetches starred state
      checkPurchaseStatus();
    }
  }, [id]);

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
      const res = await fetch(`/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
          // Debug: log project file info for 3D viewer
          // eslint-disable-next-line no-console
          console.log('Project loaded:', { id: data.id, file_path: data.file_path, file_type: data.file_type, fileUrl: data.file_path ? `/api/files/${data.file_path}` : null });
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

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments/on/project/${id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleLike = async () => { // Handles star/unstar
    if (!user) {
      router.push('/login');
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

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (!comment.trim()) return;

    try {
      setActionError('');
      const res = await fetch(`/api/comments/on/project/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: comment })
      });

      if (res.ok) {
        setComment('');
        fetchComments();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error || `Failed to post comment (status ${res.status})`);
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      setActionError('Network error while posting comment.');
    }
  };

  const handleDownload = () => {
    if (project?.file_path) {
      window.open(`/uploads/${project.file_path}`, '_blank');
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
        router.push(`/profile/${user?.username}`);
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
                <Link href="/explore" className="hover:underline" style={{ color: DS.colors.primary.blue }}>
                  Back to Explore
                </Link>
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
                <Link href="/explore" className="hover:underline" style={{ color: DS.colors.primary.blue }}>
                  &larr; Back to Explore
                </Link>
                {project.for_sale && (
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
                  {project.file_type && project.file_path && ['stl','obj','fbx','gltf','glb','ply','dae','collada'].includes(project.file_type.toLowerCase().replace('.', '')) ? (
                    <ThreeDViewer
                      fileUrl={`/api/files/${encodeURIComponent(project.file_path)}`}
                      fileName={`${project.title}${project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}`}
                      fileType={project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}
                      preset="detail"
                    />
                  ) : project.thumbnail_path ? (
                    <div className="aspect-video relative" style={{ background: DS.colors.background.panel }}>
                      <img
                        src={`/uploads/${project.thumbnail_path}`}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video flex items-center justify-center" style={{ background: DS.colors.background.panel }}>
                      <svg className="w-24 h-24" style={{ color: DS.colors.text.tertiary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Description */}
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>Description</h2>
                  <p className="whitespace-pre-wrap" style={{ color: DS.colors.text.secondary }}>
                    {project.description || 'No description provided.'}
                  </p>
                </div>
                {/* Comments */}
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
                  <CommentSystem
                    entityType="project"
                    entityId={parseInt(id)}
                    currentUserId={user?.id}
                    currentUsername={user?.username}
                  />
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
                    className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      liked 
                        ? 'bg-yellow-600 hover:bg-yellow-700' 
                        : ''
                    }`}
                    style={!liked ? { background: DS.colors.background.panel, color: DS.colors.text.primary } : { color: '#fff' }}
                  >
                    <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {project.likes || 0} Stars
                  </button>
                  {/* Hide download button for paid items (unless you're the owner) */}
                  {(() => {
                    const isPaid = project.for_sale && project.price && project.price > 0;
                    const isOwner = project.username === user?.username;
                    const shouldShow = !isPaid || isOwner;
                    return shouldShow;
                  })() && (
                    <button
                      onClick={handleDownload}
                      className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      style={{ background: DS.colors.primary.blue, color: '#fff' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Files
                    </button>
                  )}
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
                        // Store checkout data and redirect to checkout page
                        sessionStorage.setItem('checkoutData', JSON.stringify({
                          type: 'digital',
                          projectId: parseInt(id),
                          projectTitle: project.title,
                          price: project.price
                        }));
                        router.push('/checkout');
                      }}
                      className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2`}
                      style={hasPurchased
                        ? { background: DS.colors.primary.blue, color: '#fff' }
                        : { background: 'linear-gradient(90deg, ' + DS.colors.accent.success + ', ' + DS.colors.accent.cyan + ')', color: '#fff' }}
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
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                        style={{ background: DS.colors.background.panel, color: DS.colors.text.primary }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View History
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
                  <div className="space-y-3 text-sm">
                    <div>
                      <span style={{ color: DS.colors.text.secondary }}>File Type:</span>
                      <span className="ml-2" style={{ color: DS.colors.text.primary }}>.{project.file_type}</span>
                    </div>
                    <div>
                      <span style={{ color: DS.colors.text.secondary }}>Views:</span>
                      <span className="ml-2" style={{ color: DS.colors.text.primary }}>{project.views || 0}</span>
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
                {/* Dimensions & Specifications - Show based on permissions */}
                <div style={{ background: DS.colors.background.card, border: `1px solid ${DS.colors.border.default}` }} className="rounded-xl p-6">
                  <h3 className="font-bold mb-4" style={{ color: DS.colors.text.primary }}>Specifications</h3>
                  <div className="space-y-3 text-sm">
                    {project.dimensions ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Dimensions:</span>
                        <span className="ml-2" style={{ color: DS.colors.text.primary, fontWeight: 500 }}>{project.dimensions}</span>
                      </div>
                    ) : project.canViewCostData ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Dimensions:</span>
                        <span className="ml-2 italic" style={{ color: DS.colors.text.tertiary }}>Not yet analyzed</span>
                      </div>
                    ) : null}
                    {project.scale_percentage && project.scale_percentage !== 100 ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Scale:</span>
                        <span className="ml-2" style={{ color: DS.colors.text.primary }}>{project.scale_percentage}%</span>
                      </div>
                    ) : project.canViewCostData ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Scale:</span>
                        <span className="ml-2" style={{ color: DS.colors.text.primary }}>100% (Original)</span>
                      </div>
                    ) : null}
                    {project.canViewCostData && project.weight_grams ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Weight:</span>
                        <span className="ml-2" style={{ color: DS.colors.text.primary }}>
                          {project.weight_grams.toFixed(1)}g ({(project.weight_grams / 28.3495).toFixed(2)} oz)
                        </span>
                      </div>
                    ) : project.canViewCostData ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Weight:</span>
                        <span className="ml-2 italic" style={{ color: DS.colors.text.tertiary }}>Not yet calculated</span>
                      </div>
                    ) : null}
                    {project.canViewCostData && project.print_time_hours ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Print Time:</span>
                        <span className="ml-2" style={{ color: DS.colors.text.primary }}>
                          {Math.floor(project.print_time_hours)}h {Math.round((project.print_time_hours % 1) * 60)}m
                        </span>
                      </div>
                    ) : project.canViewCostData ? (
                      <div>
                        <span style={{ color: DS.colors.text.secondary }}>Print Time:</span>
                        <span className="ml-2 italic" style={{ color: DS.colors.text.tertiary }}>Not yet estimated</span>
                      </div>
                    ) : null}
                    {!project.canViewCostData && (
                      <div className="p-3 rounded-lg" style={{ background: DS.colors.background.panel, border: `1px solid ${DS.colors.border.default}` }}>
                        <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                          🔒 Cost and manufacturing data visible to owner and team members only
                        </p>
                      </div>
                    )}
                  </div>
                  {project.canViewCostData && (!project.dimensions || !project.weight_grams || !project.print_time_hours) && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                      <p className="text-xs mb-2" style={{ color: DS.colors.text.tertiary }}>
                        💡 <strong>Missing specifications?</strong>
                      </p>
                      <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                        Upload a new version or use the <Link href="/quote" className="hover:underline" style={{ color: DS.colors.primary.blue }}>estimate tool</Link> to calculate dimensions, weight, and print time.
                      </p>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      📁 File Type: <span style={{ color: DS.colors.text.primary }}>.{project.file_type?.toUpperCase()}</span>
                    </p>
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
    </>
  );
}