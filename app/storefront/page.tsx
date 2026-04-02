'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Button } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import {
  Store,
  Palette,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { STOREFRONT_INDUSTRIES, industryLabel } from '@/frontend/lib/storefront-industries';

/** Same-origin API (proxied to Express in app/api/storefront/route.ts) — avoids broken absolute URLs. */
const STOREFRONT_API = '/api/storefront';

export default function StorefrontPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [storefront, setStorefront] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    bannerImage: null as File | null,
    /** Saved image URLs (R2) when no new file is selected */
    bannerImageUrl: '',
    logoImageUrl: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    accentColor: '#10b981',
    logo: null as File | null,
    customDomain: '',
    featuredProjects: [] as number[],
    focusedIndustry: '',
  });

  const [bannerBlobUrl, setBannerBlobUrl] = useState<string | null>(null);
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchStorefront();
  }, []);

  useEffect(() => {
    if (!formData.bannerImage) {
      setBannerBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(formData.bannerImage);
    setBannerBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [formData.bannerImage]);

  useEffect(() => {
    if (!formData.logo) {
      setLogoBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(formData.logo);
    setLogoBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [formData.logo]);

  const fetchStorefront = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(STOREFRONT_API, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setStorefront(data);
        if (data) {
          setFormData((prev) => ({
            storeName: data.store_name ?? prev.storeName,
            description: data.description ?? prev.description,
            bannerImage: prev.bannerImage,
            logo: prev.logo,
            bannerImageUrl: data.banner_image || prev.bannerImageUrl || '',
            logoImageUrl: data.logo || prev.logoImageUrl || '',
            primaryColor: data.primary_color || prev.primaryColor || '#3b82f6',
            secondaryColor: data.secondary_color || prev.secondaryColor || '#8b5cf6',
            accentColor: data.accent_color || prev.accentColor || '#10b981',
            customDomain: data.custom_domain ?? prev.customDomain,
            featuredProjects: Array.isArray(data.featured_projects)
              ? data.featured_projects
              : prev.featuredProjects || [],
            focusedIndustry: data.focused_industry ?? prev.focusedIndustry,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching storefront:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      formDataToSend.append('store_name', formData.storeName);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('primary_color', formData.primaryColor);
      formDataToSend.append('secondary_color', formData.secondaryColor);
      formDataToSend.append('accent_color', formData.accentColor);
      formDataToSend.append('custom_domain', formData.customDomain);
      formDataToSend.append('featured_projects', JSON.stringify(formData.featuredProjects));
      formDataToSend.append('focused_industry', formData.focusedIndustry || '');
      
      if (formData.bannerImage) {
        formDataToSend.append('banner_image', formData.bannerImage);
      }
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      const res = await fetch(STOREFRONT_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setStorefront(data);
        setFormData((prev) => ({
          ...prev,
          storeName: data.store_name ?? prev.storeName,
          description: data.description ?? prev.description,
          primaryColor: data.primary_color ?? prev.primaryColor,
          secondaryColor: data.secondary_color ?? prev.secondaryColor,
          accentColor: data.accent_color ?? prev.accentColor,
          customDomain: data.custom_domain ?? prev.customDomain,
          featuredProjects: data.featured_projects ?? prev.featuredProjects,
          focusedIndustry: data.focused_industry ?? prev.focusedIndustry,
          bannerImage: null,
          logo: null,
          bannerImageUrl: data.banner_image || prev.bannerImageUrl,
          logoImageUrl: data.logo || prev.logoImageUrl,
        }));
        const uname =
          data.username ||
          authUser?.username ||
          (() => {
            try {
              const u = localStorage.getItem('user');
              if (u) return JSON.parse(u)?.username as string | undefined;
            } catch {
              /* ignore */
            }
            return undefined;
          })();
        if (uname) {
          router.push(`/${encodeURIComponent(uname)}/store`);
        } else {
          alert('Store created. Open your profile to view your storefront.');
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error('Storefront save failed:', res.status, errBody);
        alert(
          errBody.error ||
            errBody.detail ||
            `Failed to update storefront (${res.status})`
        );
      }
    } catch (error) {
      console.error('Error saving storefront:', error);
      alert('Failed to update storefront');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradePrompt = () => {
    setShowUpgradeModal(true);
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Configure your store" />
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <>
      <SubscriptionGate
        feature="storefrontCustomization"
        requiredTier="creator"
        showUpgradeModal={true}
        message="Storefront customization requires Creator subscription or higher"
      >
        <ThreePanelLayout
          leftPanel={<GlobalNavSidebar />}
          centerPanel={
            <CenterPanel>
              <PanelHeader 
                title="Configure your store"
                actions={
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setPreview(!preview)}
                      icon={<Eye size={18} />}
                    >
                      {preview ? 'Edit' : 'Preview'}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={saving}
                      icon={<Store size={18} />}
                    >
                      {saving ? 'Creating…' : 'Create store'}
                    </Button>
                  </div>
                }
              />
              <PanelContent className="!pt-12 !pb-12">
                <div className="max-w-4xl mx-auto space-y-6 px-6" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                  {/* Keep file inputs mounted — toggling display:none instead of unmounting prevents the browser from clearing chosen files. */}
                  <div className={preview ? 'hidden' : 'block space-y-6'}>
                    <>
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Basic Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Store Name
                            </label>
                            <input
                              type="text"
                              value={formData.storeName}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, storeName: e.target.value }))
                              }
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="My Design Store"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Description
                            </label>
                            <textarea
                              rows={4}
                              value={formData.description}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, description: e.target.value }))
                              }
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="Tell customers about your store..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Focused industry
                            </label>
                            <p className="text-xs mb-2" style={{ color: DS.colors.text.tertiary }}>
                              Helps visitors understand what you design and sell most.
                            </p>
                            <select
                              value={formData.focusedIndustry}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, focusedIndustry: e.target.value }))
                              }
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            >
                              {STOREFRONT_INDUSTRIES.map((opt) => (
                                <option key={opt.value || 'general'} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </Card>

                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Branding
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Logo
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setFormData((prev) => ({ ...prev, logo: file }));
                              }}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            {(logoBlobUrl || formData.logoImageUrl) && (
                              <div className="mt-2 flex items-center gap-3">
                                <img
                                  src={logoBlobUrl || formData.logoImageUrl}
                                  alt=""
                                  className="h-14 w-14 rounded-full object-cover border border-[#333]"
                                />
                                <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                  Current logo preview
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Banner Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setFormData((prev) => ({ ...prev, bannerImage: file }));
                              }}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            {(bannerBlobUrl || formData.bannerImageUrl) && (
                              <div className="mt-2">
                                <img
                                  src={bannerBlobUrl || formData.bannerImageUrl}
                                  alt=""
                                  className="max-h-28 w-full max-w-md rounded-lg object-cover border border-[#333]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>

                      <Card padding="lg">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Color Scheme
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Primary Color
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={formData.primaryColor}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                                }
                                className="w-16 h-10 rounded border"
                                style={{ borderColor: DS.colors.border.default }}
                              />
                              <input
                                type="text"
                                value={formData.primaryColor}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                                }
                                className="flex-1 px-3 py-2 rounded-lg border"
                                style={{
                                  backgroundColor: DS.colors.background.card,
                                  borderColor: DS.colors.border.default,
                                  color: DS.colors.text.primary,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Secondary Color
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={formData.secondaryColor}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                                }
                                className="w-16 h-10 rounded border"
                                style={{ borderColor: DS.colors.border.default }}
                              />
                              <input
                                type="text"
                                value={formData.secondaryColor}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                                }
                                className="flex-1 px-3 py-2 rounded-lg border"
                                style={{
                                  backgroundColor: DS.colors.background.card,
                                  borderColor: DS.colors.border.default,
                                  color: DS.colors.text.primary,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Accent Color
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={formData.accentColor}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                                }
                                className="w-16 h-10 rounded border"
                                style={{ borderColor: DS.colors.border.default }}
                              />
                              <input
                                type="text"
                                value={formData.accentColor}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                                }
                                className="flex-1 px-3 py-2 rounded-lg border"
                                style={{
                                  backgroundColor: DS.colors.background.card,
                                  borderColor: DS.colors.border.default,
                                  color: DS.colors.text.primary,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>

                      {(storefront?.tier === 'enterprise' ||
                        storefront?.tier === 'studio') && (
                        <Card padding="lg">
                          <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                            Custom Domain
                          </h3>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Domain
                            </label>
                            <input
                              type="text"
                              value={formData.customDomain}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, customDomain: e.target.value }))
                              }
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="store.yourdomain.com"
                            />
                            <p className="text-xs mt-2" style={{ color: DS.colors.text.tertiary }}>
                              Enterprise feature: Connect your custom domain
                            </p>
                          </div>
                        </Card>
                      )}
                    </>
                  </div>

                  <div className={preview ? 'block' : 'hidden'}>
                    <Card padding="lg">
                      <div className="space-y-4">
                        <div
                          className="w-full h-48 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: formData.primaryColor }}
                        >
                          {bannerBlobUrl || formData.bannerImageUrl ? (
                            <img
                              src={bannerBlobUrl || formData.bannerImageUrl}
                              alt="Banner preview"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <p style={{ color: 'white' }}>Banner Preview</p>
                          )}
                        </div>
                        <div className="text-center">
                          {(logoBlobUrl || formData.logoImageUrl) && (
                            <img
                              src={logoBlobUrl || formData.logoImageUrl}
                              alt="Logo preview"
                              className="w-24 h-24 mx-auto rounded-full mb-4 object-cover border-2 border-white/20"
                            />
                          )}
                          <h2 className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                            {formData.storeName || 'Your Store Name'}
                          </h2>
                          <p className="mt-2" style={{ color: DS.colors.text.secondary }}>
                            {formData.description || 'Store description'}
                          </p>
                          {industryLabel(formData.focusedIndustry) && (
                            <p className="mt-2 text-sm" style={{ color: DS.colors.text.tertiary }}>
                              {industryLabel(formData.focusedIndustry)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </PanelContent>
            </CenterPanel>
          }
        />
      </SubscriptionGate>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={storefront?.tier || 'free'}
          featureName="storefrontCustomization"
          message="Storefront customization requires Creator subscription or higher"
        />
      )}
    </>
  );
}

