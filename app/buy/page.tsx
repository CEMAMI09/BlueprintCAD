'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import ThreeDViewer from '@/components/ThreeDViewer';
import {
  ShoppingCart,
  Package,
  DollarSign,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Scale,
  Clock,
  Weight,
  FileText,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: number;
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
  profile_picture?: string;
}

export default function BuyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('id') || null;

  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login?redirect=/buy?id=' + projectId);
      return;
    }

    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    fetchProject();
    checkPurchaseStatus();
  }, [projectId, router]);

  useEffect(() => {
    if (project?.username) {
      fetchAuthorProfile();
    }
  }, [project?.username]);

  const fetchAuthorProfile = async () => {
    if (!project?.username) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${project.username}`, { 
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

  const fetchProject = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await res.json();
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!user || !projectId) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/my-orders?type=purchases`);
      if (res.ok) {
        const orders = await res.json();
        const purchased = orders.some((order: any) => 
          order.project_id === parseInt(projectId) && order.payment_status === 'succeeded'
        );
        setHasPurchased(purchased);
      }
    } catch (err) {
      console.error('Error checking purchase status:', err);
    }
  };

  const handleBuyDigital = async () => {
    if (!project || !user) return;

    if (hasPurchased) {
      router.push('/orders');
      return;
    }

    if (project.username === user.username) {
      setError('You cannot purchase your own design');
      return;
    }

    setProcessing(true);
    try {
      // Store checkout data and redirect to checkout page
      sessionStorage.setItem('checkoutData', JSON.stringify({
        type: 'digital',
        projectId: project.id,
        projectTitle: project.title,
        price: project.price
      }));
      router.push('/checkout');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate purchase');
      setProcessing(false);
    }
  };

  const handleGetQuote = () => {
    if (!project) return;

    // Redirect to quote page with the project ID
    router.push(`/quote?projectId=${project.id}`);
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Loading..." />
            <PanelContent>
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: DS.colors.primary.blue }}></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (error && !project) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader 
              title="Error" 
              actions={
                <Link href="/explore" style={{ color: DS.colors.primary.blue }}>
                  &larr; Back to Explore
                </Link>
              }
            />
            <PanelContent>
              <div className="px-4 md:px-10 py-8">
                <Card padding="lg">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle size={24} style={{ color: DS.colors.accent.error }} />
                    <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                      {error}
                    </h3>
                  </div>
                  <p style={{ color: DS.colors.text.secondary }}>
                    The project you're looking for could not be found or you don't have permission to view it.
                  </p>
                </Card>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!project) return null;

  const isOwner = user?.username === project.username;
  const canBuyDigital = project.for_sale && !isOwner && !hasPurchased;

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="Purchase Options"
            actions={
              <Link href={`/project/${project.id}`} style={{ color: DS.colors.primary.blue }}>
                &larr; Back to Project
              </Link>
            }
          />
          <PanelContent>
            <div className="px-4 md:px-10 py-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Preview */}
                <div className="space-y-6">
                  {/* 3D Preview */}
                  <Card padding="none">
                    {project.file_type && project.file_path ? (
                      (() => {
                        const fileType = project.file_type.toLowerCase().replace('.', '');
                        const viewableTypes = ['stl', 'obj', 'fbx', 'gltf', 'glb', 'ply', 'dae', 'collada'];
                        if (viewableTypes.includes(fileType)) {
                          return (
                            <ThreeDViewer
                              fileUrl={`/api/files/${encodeURIComponent(project.file_path)}`}
                              fileName={`${project.title}${project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}`}
                              fileType={project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}
                              preset="detail"
                            />
                          );
                        }
                        return null;
                      })()
                    ) : null}
                    {project.thumbnail_path && !project.file_path && (
                      <div className="aspect-video relative" style={{ background: DS.colors.background.panel }}>
                        <img
                          src={(() => {
                            const thumbnailPath = String(project.thumbnail_path);
                            const filename = thumbnailPath.includes('/') 
                              ? thumbnailPath.split('/').pop() || thumbnailPath
                              : thumbnailPath;
                            return `/api/thumbnails/${encodeURIComponent(filename)}?t=${Date.now()}`;
                          })()}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </Card>

                  {/* Project Info */}
                  <Card padding="lg">
                    <div className="flex items-start gap-3 mb-4">
                      {authorProfile?.profile_picture ? (
                        <img
                          src={authorProfile.profile_picture}
                          alt={project.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                          style={{ background: DS.colors.primary.blue, color: '#fff' }}
                        >
                          {project.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
                          {project.title}
                        </h3>
                        <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          by <span className="font-medium">{project.username}</span>
                        </p>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm mt-4" style={{ color: DS.colors.text.secondary }}>
                        {project.description}
                      </p>
                    )}
                  </Card>
                </div>

                {/* Right Column - Purchase Options */}
                <div className="space-y-6">
                  {/* Digital Purchase Option */}
                  {project.for_sale && (
                    <Card padding="lg">
                      <div className="flex items-center gap-3 mb-4">
                        <ShoppingCart size={24} style={{ color: DS.colors.primary.blue }} />
                        <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                          Buy Digital File
                        </h3>
                      </div>
                      
                      {isOwner ? (
                        <div className="p-4 rounded-lg mb-4" style={{ background: DS.colors.background.panel }}>
                          <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            This is your own design. You already have access to the file.
                          </p>
                        </div>
                      ) : hasPurchased ? (
                        <div className="p-4 rounded-lg mb-4 flex items-center gap-2" style={{ background: DS.colors.accent.success + '20', border: `1px solid ${DS.colors.accent.success}40` }}>
                          <CheckCircle size={20} style={{ color: DS.colors.accent.success }} />
                          <p className="text-sm" style={{ color: DS.colors.accent.success }}>
                            You already own this design
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-6">
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-4xl font-bold" style={{ color: DS.colors.text.primary }}>
                                ${project.price?.toFixed(2)}
                              </span>
                              <span className="text-sm" style={{ color: DS.colors.text.tertiary }}>
                                USD
                              </span>
                            </div>
                            <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                              One-time purchase • Instant download
                            </p>
                          </div>

                          <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                              <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                              <span>Full CAD file access</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                              <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                              <span>Commercial use license</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                              <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                              <span>Lifetime access</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                              <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                              <span>Free updates</span>
                            </li>
                          </ul>

                          {error && (
                            <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: DS.colors.accent.error + '20', border: `1px solid ${DS.colors.accent.error}40` }}>
                              <AlertCircle size={18} style={{ color: DS.colors.accent.error }} />
                              <p className="text-sm" style={{ color: DS.colors.accent.error }}>
                                {error}
                              </p>
                            </div>
                          )}

                          <Button
                            variant="primary"
                            onClick={handleBuyDigital}
                            disabled={processing || !canBuyDigital}
                            className="w-full"
                            icon={<ShoppingCart size={18} />}
                          >
                            {processing ? 'Processing...' : `Purchase for $${project.price?.toFixed(2)}`}
                          </Button>
                        </>
                      )}
                    </Card>
                  )}

                  {/* Manufacturing Quote Option */}
                  <Card padding="lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Package size={24} style={{ color: DS.colors.accent.cyan }} />
                      <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                        Get Quote & Order
                      </h3>
                    </div>

                    <p className="text-sm mb-6" style={{ color: DS.colors.text.secondary }}>
                      Get an instant quote for 3D printing this design through Blueprint Manufacturing. 
                      Customize materials, scale, and quantity to get the best price.
                    </p>

                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                        <Sparkles size={16} style={{ color: DS.colors.accent.cyan }} />
                        <span>AI-powered cost estimation</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                        <Scale size={16} style={{ color: DS.colors.accent.cyan }} />
                        <span>Customize scale and materials</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                        <Clock size={16} style={{ color: DS.colors.accent.cyan }} />
                        <span>Print time estimates</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                        <Weight size={16} style={{ color: DS.colors.accent.cyan }} />
                        <span>Weight and material calculations</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                        <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                        <span>Printability analysis</span>
                      </li>
                    </ul>

                    <Button
                      variant="secondary"
                      onClick={handleGetQuote}
                      className="w-full"
                      icon={<ArrowRight size={18} />}
                    >
                      Get Quote & Order
                    </Button>
                  </Card>

                  {/* Additional Info */}
                  <Card padding="md">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Views</span>
                        <span style={{ color: DS.colors.text.primary }}>{project.views || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Stars</span>
                        <span style={{ color: DS.colors.text.primary }}>{project.likes || 0}</span>
                      </div>
                      {project.downloads !== undefined && (
                        <div className="flex items-center justify-between">
                          <span style={{ color: DS.colors.text.secondary }}>Downloads</span>
                          <span style={{ color: DS.colors.text.primary }}>{project.downloads}</span>
                        </div>
                      )}
                      {project.dimensions && (
                        <div className="flex items-center justify-between">
                          <span style={{ color: DS.colors.text.secondary }}>Dimensions</span>
                          <span style={{ color: DS.colors.text.primary }}>{project.dimensions}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Purchase Summary" />
          <PanelContent>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.text.secondary }}>
                  What you'll get:
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: DS.colors.text.primary }}>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Instant access to the CAD file</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Commercial use license included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Option to order physical prints</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.text.secondary }}>
                  Need help?
                </h4>
                <p className="text-sm mb-3" style={{ color: DS.colors.text.secondary }}>
                  Contact our support team for assistance with your purchase.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/messages')}
                  className="w-full"
                  icon={<FileText size={16} />}
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}

