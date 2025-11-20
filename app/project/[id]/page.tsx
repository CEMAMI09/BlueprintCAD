'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '../../../components/Layout';
import ThreeDViewer from '../../../components/ThreeDViewer';
import RenameModal from '../../../components/RenameModal';
import HistoryModal from '../../../components/HistoryModal';
import CommentSystem from '../../../components/CommentSystem';
import ConfirmationModal from '../../../components/ConfirmationModal';
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
  const [liked, setLiked] = useState(false);
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
      fetchLikeState();
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

  const fetchLikeState = async () => {
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

  const handleLike = async () => {
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
        setActionError(err.error || `Failed to like (status ${res.status})`);
      }
    } catch (err) {
      console.error('Failed to like:', err);
      setActionError('Network error while liking.');
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
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          {fetchError && (
            <p className="text-red-400 mb-4">{fetchError}</p>
          )}
          <Link href="/explore" className="text-blue-400 hover:text-blue-300">
            Back to Explore
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/explore" className="text-gray-400 hover:text-white mb-4 inline-flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explore
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
              <div className="flex items-center gap-4 text-gray-400">
                <Link href={`/profile/${project.username}`} className="hover:text-white">
                  by {project.username}
                </Link>
                <span>•</span>
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {project.for_sale && (
              <div className="text-2xl font-bold text-emerald-400">
                ${project.price}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Preview */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Auto-loading 3D Viewer for all CAD file types */}
              {project.file_type ? (
                <ThreeDViewer
                  fileUrl={`/api/files/${project.file_path}`}
                  fileName={`${project.title}.${project.file_type}`}
                  fileType={project.file_type}
                  preset="detail"
                />
              ) : project.thumbnail_path ? (
                <div className="aspect-video bg-gray-800 relative">
                  <img
                    src={`/uploads/${project.thumbnail_path}`}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-800 flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-gray-300 whitespace-pre-wrap">
                {project.description || 'No description provided.'}
              </p>
            </div>

            {/* Comments */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
              {actionError && (
                <div className="p-3 text-sm rounded-md bg-red-500/10 border border-red-500/30 text-red-400">
                  {actionError}
                </div>
              )}
              <button
                onClick={handleLike}
                className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  liked 
                    ? 'bg-pink-600 hover:bg-pink-700' 
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {project.likes || 0} Likes
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
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
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
                  className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    hasPurchased
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                  }`}
                >
                  {hasPurchased ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename File
                  </button>

                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    View History
                  </button>

                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">File Type:</span>
                  <span className="ml-2 text-white">.{project.file_type}</span>
                </div>
                <div>
                  <span className="text-gray-400">Views:</span>
                  <span className="ml-2 text-white">{project.views || 0}</span>
                </div>
                {project.canViewCostData && project.ai_estimate && (
                  <div>
                    <span className="text-gray-400">Est. Cost:</span>
                    <span className="ml-2 text-emerald-400 font-medium">{project.ai_estimate}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Uploaded:</span>
                  <span className="ml-2 text-white">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Dimensions & Specifications - Show based on permissions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">Specifications</h3>
              <div className="space-y-3 text-sm">
                {project.dimensions ? (
                  <div>
                    <span className="text-gray-400">Dimensions:</span>
                    <span className="ml-2 text-white font-medium">{project.dimensions}</span>
                  </div>
                ) : project.canViewCostData ? (
                  <div>
                    <span className="text-gray-400">Dimensions:</span>
                    <span className="ml-2 text-gray-500 italic">Not yet analyzed</span>
                  </div>
                ) : null}
                {project.scale_percentage && project.scale_percentage !== 100 ? (
                  <div>
                    <span className="text-gray-400">Scale:</span>
                    <span className="ml-2 text-white">{project.scale_percentage}%</span>
                  </div>
                ) : project.canViewCostData ? (
                  <div>
                    <span className="text-gray-400">Scale:</span>
                    <span className="ml-2 text-white">100% (Original)</span>
                  </div>
                ) : null}
                {project.canViewCostData && project.weight_grams ? (
                  <div>
                    <span className="text-gray-400">Weight:</span>
                    <span className="ml-2 text-white">
                      {project.weight_grams.toFixed(1)}g ({(project.weight_grams / 28.3495).toFixed(2)} oz)
                    </span>
                  </div>
                ) : project.canViewCostData ? (
                  <div>
                    <span className="text-gray-400">Weight:</span>
                    <span className="ml-2 text-gray-500 italic">Not yet calculated</span>
                  </div>
                ) : null}
                {project.canViewCostData && project.print_time_hours ? (
                  <div>
                    <span className="text-gray-400">Print Time:</span>
                    <span className="ml-2 text-white">
                      {Math.floor(project.print_time_hours)}h {Math.round((project.print_time_hours % 1) * 60)}m
                    </span>
                  </div>
                ) : project.canViewCostData ? (
                  <div>
                    <span className="text-gray-400">Print Time:</span>
                    <span className="ml-2 text-gray-500 italic">Not yet estimated</span>
                  </div>
                ) : null}
                {!project.canViewCostData && (
                  <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <p className="text-xs text-gray-400">
                      🔒 Cost and manufacturing data visible to owner and team members only
                    </p>
                  </div>
                )}
              </div>
              {project.canViewCostData && (!project.dimensions || !project.weight_grams || !project.print_time_hours) && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">
                    💡 <strong>Missing specifications?</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    Upload a new version or use the <Link href="/quote" className="text-blue-400 hover:text-blue-300">estimate tool</Link> to calculate dimensions, weight, and print time.
                  </p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-400">
                  📁 File Type: <span className="text-white">.{project.file_type?.toUpperCase()}</span>
                </p>
              </div>
            </div>

            {/* Tags */}
            {project.tags && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.split(',').map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-lg">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {project && (
        <>
          <RenameModal
            isOpen={isRenameModalOpen}
            onClose={() => setIsRenameModalOpen(false)}
            onSubmit={handleRename}
            currentName={project.title}
            entityType="project"
          />

          <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            entityType="project"
            entityId={Number(id)}
            entityName={project.title}
          />

          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDelete}
            title="Delete Project"
            message={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
            confirmText="Delete"
            confirmColor="red"
            loading={isDeleting}
          />
        </>
      )}
    </Layout>
  );
}