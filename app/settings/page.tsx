/**
 * Settings Page
 * User account and application settings
 */

'use client';

import { useState } from 'react';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, Tabs } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/lib/ui/design-system';
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Palette,
  Globe,
  Shield,
  Download,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Settings" />
          <PanelContent>
            <div className="max-w-4xl mx-auto py-6">
              {/* Tabs */}
              <Tabs
                tabs={[
                  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
                  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
                  { id: 'security', label: 'Security', icon: <Lock size={16} /> },
                  { id: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
                  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              <div className="mt-8">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Profile Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Username
                          </label>
                          <input
                            type="text"
                            defaultValue="johndoe"
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
                            Email
                          </label>
                          <input
                            type="email"
                            defaultValue="john@example.com"
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
                            Bio
                          </label>
                          <textarea
                            rows={4}
                            defaultValue="Hardware engineer and CAD enthusiast"
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                          />
                        </div>
                        <Button variant="primary">Save Changes</Button>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Notification Preferences
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Email notifications', description: 'Receive email updates about your activity' },
                          { label: 'Push notifications', description: 'Get push notifications in your browser' },
                          { label: 'Comments on your designs', description: 'Notify when someone comments' },
                          { label: 'New followers', description: 'Notify when someone follows you' },
                          { label: 'Marketplace updates', description: 'Updates about your listings' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between py-3 border-b" style={{ borderColor: DS.colors.border.default }}>
                            <div>
                              <div className="font-medium" style={{ color: DS.colors.text.primary }}>{item.label}</div>
                              <div className="text-sm" style={{ color: DS.colors.text.secondary }}>{item.description}</div>
                            </div>
                            <input type="checkbox" defaultChecked className="w-5 h-5" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Security Settings
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Change Password</h4>
                          <div className="space-y-3">
                            <input
                              type="password"
                              placeholder="Current password"
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            <input
                              type="password"
                              placeholder="New password"
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            <input
                              type="password"
                              placeholder="Confirm new password"
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            <Button variant="primary">Update Password</Button>
                          </div>
                        </div>
                        <div className="pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Two-Factor Authentication</h4>
                          <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                            Add an extra layer of security to your account
                          </p>
                          <Button variant="secondary" icon={<Shield size={18} />}>Enable 2FA</Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Billing & Subscription
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>Current Plan</h4>
                              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>Free Plan</p>
                            </div>
                            <Badge variant="primary">Active</Badge>
                          </div>
                          <Button variant="primary">Upgrade to Pro</Button>
                        </div>
                        <div className="pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Payment Method</h4>
                          <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                            No payment method on file
                          </p>
                          <Button variant="secondary" icon={<CreditCard size={18} />}>Add Payment Method</Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Appearance Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Theme
                          </label>
                          <select
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                          >
                            <option>Dark (Default)</option>
                            <option>Light</option>
                            <option>Auto</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Language
                          </label>
                          <select
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                          >
                            <option>English</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                          </select>
                        </div>
                        <Button variant="primary">Save Preferences</Button>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
