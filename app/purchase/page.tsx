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
  CreditCard,
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

type PurchaseType = 'design' | 'manufacturing' | 'subscription';

export default function PurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseType = searchParams.get('type') as PurchaseType || 'design';
  const projectId = searchParams.get('id');

  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [manufacturingOrder, setManufacturingOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push(`/login?redirect=/purchase?type=${purchaseType}${projectId ? `&id=${projectId}` : ''}`);
      return;
    }

    if (purchaseType === 'design' && projectId) {
      fetchProject();
      checkPurchaseStatus();
    } else if (purchaseType === 'manufacturing') {
      // Check for manufacturing order in sessionStorage
      const storedOrder = sessionStorage.getItem('manufacturingOrder');
      if (storedOrder) {
        try {
          const parsed = JSON.parse(storedOrder);
          setManufacturingOrder(parsed);
        } catch (err) {
          setError('Invalid order data');
        }
      } else {
        setError('No order data found. Please start from the quote page.');
      }
      setLoading(false);
    } else if (purchaseType === 'subscription') {
      // Future: Handle subscription purchases
      setLoading(false);
    } else {
      setError('Invalid purchase type or missing required parameters');
      setLoading(false);
    }
  }, [purchaseType, projectId, router]);

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

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
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
      const res = await fetch(`/api/orders/my-orders?type=purchases`);
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

  const handlePurchase = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (purchaseType === 'design' && project) {
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
        // Calculate total with 5% platform fee
        const basePrice = project.price || 0;
        const platformFee = basePrice * 0.05;
        const totalPrice = basePrice + platformFee;

        // Store checkout data and redirect to checkout page
        sessionStorage.setItem('checkoutData', JSON.stringify({
          type: 'digital',
          projectId: project.id,
          projectTitle: project.title,
          price: totalPrice, // Use total price with platform fee
          basePrice: basePrice,
          platformFee: platformFee
        }));
        router.push('/checkout');
      } catch (err: any) {
        setError(err.message || 'Failed to initiate purchase');
        setProcessing(false);
      }
    } else if (purchaseType === 'manufacturing' && manufacturingOrder) {
      router.push('/order');
    } else if (purchaseType === 'subscription') {
      // Future: Handle subscription purchase
      setError('Subscription purchases coming soon');
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
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: DS.colors.primary.blue }}></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (error && !project && !manufacturingOrder) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader 
              title="Error" 
              actions={
                <Link href="/explore" style={{ color: DS.colors.primary.blue }}>
                  &larr; Back
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
                </Card>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  // Render based on purchase type
  if (purchaseType === 'design' && project) {
    const isOwner = user?.username === project.username;
    const canBuyDigital = project.for_sale && !isOwner && !hasPurchased;

    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader
              title="Purchase Design"
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
                              <div style={{ minHeight: '600px', width: '100%' }}>
                                <ThreeDViewer
                                  fileUrl={`/api/files/${encodeURIComponent(project.file_path)}`}
                                  fileName={`${project.title}${project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}`}
                                  fileType={project.file_type.startsWith('.') ? project.file_type : `.${project.file_type}`}
                                  preset="detail"
                                />
                              </div>
                            );
                          }
                          return null;
                        })()
                      ) : null}
                      {project.thumbnail_path && !project.file_path && (
                        <div className="aspect-video relative" style={{ background: DS.colors.background.panel }}>
                          <img
                            src={String(project.thumbnail_path)}
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
                            {(() => {
                              const basePrice = project.price || 0;
                              const platformFee = basePrice * 0.05;
                              const totalPrice = basePrice + platformFee;
                              return (
                                <>
                                  <div className="mb-6">
                                    <div className="space-y-3 mb-4">
                                      <div className="flex items-center justify-between text-sm">
                                        <span style={{ color: DS.colors.text.secondary }}>Design Price</span>
                                        <span style={{ color: DS.colors.text.primary }}>${basePrice.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-sm">
                                        <span style={{ color: DS.colors.text.secondary }}>Platform Fee (5%)</span>
                                        <span style={{ color: DS.colors.text.primary }}>${platformFee.toFixed(2)}</span>
                                      </div>
                                      <div className="border-t pt-3" style={{ borderColor: DS.colors.border.default }}>
                                        <div className="flex items-center justify-between">
                                          <span className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>Total</span>
                                          <span className="text-2xl font-bold" style={{ color: DS.colors.accent.success }}>
                                            ${totalPrice.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
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
                                    onClick={handlePurchase}
                                    disabled={processing || !canBuyDigital}
                                    className="w-full"
                                    icon={<CreditCard size={18} />}
                                  >
                                    {processing ? 'Processing...' : `Purchase for $${totalPrice.toFixed(2)}`}
                                  </Button>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </Card>
                    )}
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
                      <span>Lifetime access and updates</span>
                    </li>
                  </ul>
                </div>
              </div>
            </PanelContent>
          </RightPanel>
        }
      />
    );
  }

  // Manufacturing order purchase
  if (purchaseType === 'manufacturing' && manufacturingOrder) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader
              title="Place Manufacturing Order"
              actions={
                <Link href="/quote" style={{ color: DS.colors.primary.blue }}>
                  &larr; Back to Quote
                </Link>
              }
            />
            <PanelContent>
              <div className="px-4 md:px-10 py-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <Card padding="lg">
                      <div className="flex items-center gap-3 mb-4">
                        <Package size={24} style={{ color: DS.colors.primary.blue }} />
                        <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                          Order Summary
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            File Name
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {manufacturingOrder.fileName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Manufacturing Service
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {manufacturingOrder.manufacturingOption}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Material
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {manufacturingOrder.material}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                  <div className="space-y-6">
                    <Card padding="lg">
                      <div className="flex items-center gap-3 mb-4">
                        <ShoppingCart size={24} style={{ color: DS.colors.accent.success }} />
                        <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                          Pricing
                        </h3>
                      </div>
                      <div
                        className="p-6 rounded-lg mb-4"
                        style={{
                          background: `linear-gradient(135deg, ${DS.colors.accent.success}20, ${DS.colors.primary.blue}20)`,
                          border: `1px solid ${DS.colors.accent.success}40`
                        }}
                      >
                        <div className="text-center">
                          <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                            Estimated Total
                          </p>
                          <p className="text-4xl font-bold" style={{ color: DS.colors.accent.success }}>
                            {manufacturingOrder.estimatedCost}
                          </p>
                        </div>
                      </div>
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
                        onClick={() => router.push('/order')}
                        disabled={processing}
                        className="w-full"
                        icon={<ShoppingCart size={18} />}
                      >
                        {processing ? 'Processing...' : 'Place Order'}
                      </Button>
                    </Card>
                  </div>
                </div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  // Subscription purchase (future)
  if (purchaseType === 'subscription') {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Subscription Plans" />
            <PanelContent>
              <div className="px-4 md:px-10 py-8">
                <Card padding="lg">
                  <p style={{ color: DS.colors.text.secondary }}>
                    Subscription plans coming soon!
                  </p>
                </Card>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return null;
}

