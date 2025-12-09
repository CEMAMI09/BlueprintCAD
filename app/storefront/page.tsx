'use client';

import { useState, useEffect } from 'react';
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
  Save,
  Eye,
} from 'lucide-react';

export default function StorefrontPage() {
  const [storefront, setStorefront] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    bannerImage: null as File | null,
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    accentColor: '#10b981',
    logo: null as File | null,
    customDomain: '',
    featuredProjects: [] as number[],
  });

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchStorefront();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/subscriptions/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchStorefront = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/storefront', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setStorefront(data);
        if (data) {
          setFormData({
            storeName: data.store_name || '',
            description: data.description || '',
            bannerImage: null,
            primaryColor: data.primary_color || '#3b82f6',
            secondaryColor: data.secondary_color || '#8b5cf6',
            accentColor: data.accent_color || '#10b981',
            logo: null,
            customDomain: data.custom_domain || '',
            featuredProjects: data.featured_projects || [],
          });
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
      
      if (formData.bannerImage) {
        formDataToSend.append('banner_image', formData.bannerImage);
      }
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      const res = await fetch('/api/storefront', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });

      if (res.ok) {
        const data = await res.json();
        setStorefront(data);
        alert('Storefront updated successfully!');
      } else {
        alert('Failed to update storefront');
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
            <PanelHeader title="Storefront Customization" />
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
                title="Storefront Customization"
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
                      icon={<Save size={18} />}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                }
              />
              <PanelContent className="!pt-12 !pb-12">
                <div className="max-w-4xl mx-auto space-y-6 px-6" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                  {preview ? (
                    <Card padding="lg">
                      <div className="space-y-4">
                        <div 
                          className="w-full h-48 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: formData.primaryColor }}
                        >
                          {formData.bannerImage ? (
                            <img 
                              src={URL.createObjectURL(formData.bannerImage)} 
                              alt="Banner" 
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <p style={{ color: 'white' }}>Banner Preview</p>
                          )}
                        </div>
                        <div className="text-center">
                          {formData.logo && (
                            <img 
                              src={URL.createObjectURL(formData.logo)} 
                              alt="Logo" 
                              className="w-24 h-24 mx-auto rounded-full mb-4"
                            />
                          )}
                          <h2 className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                            {formData.storeName || 'Your Store Name'}
                          </h2>
                          <p className="mt-2" style={{ color: DS.colors.text.secondary }}>
                            {formData.description || 'Store description'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
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
                              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
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
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="Tell customers about your store..."
                            />
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
                                if (file) setFormData({ ...formData, logo: file });
                              }}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
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
                                if (file) setFormData({ ...formData, bannerImage: file });
                              }}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
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
                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                className="w-16 h-10 rounded border"
                                style={{ borderColor: DS.colors.border.default }}
                              />
                              <input
                                type="text"
                                value={formData.primaryColor}
                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
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
                                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                className="w-16 h-10 rounded border"
                                style={{ borderColor: DS.colors.border.default }}
                              />
                              <input
                                type="text"
                                value={formData.secondaryColor}
                                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
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
                                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                                className="w-16 h-10 rounded border"
                                style={{ borderColor: DS.colors.border.default }}
                              />
                              <input
                                type="text"
                                value={formData.accentColor}
                                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
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

                      {userSubscription?.tier === 'enterprise' && (
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
                              onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
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
                  )}
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
          currentTier={userSubscription?.tier || 'free'}
          featureName="storefrontCustomization"
          message="Storefront customization requires Creator subscription or higher"
        />
      )}
    </>
  );
}

