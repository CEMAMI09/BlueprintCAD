'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
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
import {
  Mail,
  Users,
  Send,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export default function EmailCampaignsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'waitlist' | 'all-users'>('waitlist');
  
  // Waitlist state
  const [waitlistStats, setWaitlistStats] = useState<any>(null);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  
  // Campaign state
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    subject: '',
    textContent: '', // Plain text - HTML will be auto-generated
    onlyNotNotified: false,
    userFilter: {
      tier: '',
      emailVerified: undefined as boolean | undefined,
    },
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const checkAdminAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin (enterprise tier or has is_admin flag)
      const userData = await apiFetch('/api/auth/me');
      const isAdminUser = userData.user?.tier === 'enterprise' || userData.user?.is_admin;
      
      if (!isAdminUser) {
        router.push('/dashboard');
        return;
      }
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'waitlist') {
        const [stats, list] = await Promise.all([
          apiFetch('/api/waitlist/stats'),
          apiFetch('/api/waitlist?limit=100'),
        ]);
        setWaitlistStats(stats);
        setWaitlist(list.waitlist || []);
      }
      
      const campaignsData = await apiFetch('/api/email-campaigns?limit=20');
      setCampaigns(campaignsData.campaigns || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.textContent) {
      alert('Please fill in subject and message content');
      return;
    }

    setSending(true);
    try {
      const endpoint = activeTab === 'waitlist' 
        ? '/api/waitlist/send-email'
        : '/api/email-campaigns/send-to-all';
      
      const payload = activeTab === 'waitlist'
        ? {
            subject: emailForm.subject,
            textContent: emailForm.textContent, // Plain text - HTML auto-generated on backend
            onlyNotNotified: emailForm.onlyNotNotified,
          }
        : {
            subject: emailForm.subject,
            textContent: emailForm.textContent, // Plain text - HTML auto-generated on backend
            userFilter: emailForm.userFilter.tier ? {
              tier: emailForm.userFilter.tier,
              emailVerified: emailForm.userFilter.emailVerified,
            } : undefined,
          };

      const result = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert(`Email campaign started! Sending to ${result.recipientCount} recipients.`);
      setShowEmailForm(false);
      setEmailForm({
        subject: '',
        textContent: '',
        onlyNotNotified: false,
        userFilter: { tier: '', emailVerified: undefined },
      });
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to send emails'}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: DS.colors.background.panel }}>
        <Loader2 size={32} className="animate-spin" style={{ color: DS.colors.primary.blue }} />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Email Campaigns" />
          <PanelContent className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b" style={{ borderColor: DS.colors.border.default }}>
              <button
                onClick={() => setActiveTab('waitlist')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'waitlist'
                    ? 'border-b-2'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  color: activeTab === 'waitlist' ? DS.colors.primary.blue : DS.colors.text.secondary,
                  borderColor: activeTab === 'waitlist' ? DS.colors.primary.blue : 'transparent',
                }}
              >
                Waiting List
              </button>
              <button
                onClick={() => setActiveTab('all-users')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'all-users'
                    ? 'border-b-2'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  color: activeTab === 'all-users' ? DS.colors.primary.blue : DS.colors.text.secondary,
                  borderColor: activeTab === 'all-users' ? DS.colors.primary.blue : 'transparent',
                }}
              >
                All Users
              </button>
            </div>

            {/* Stats */}
            {activeTab === 'waitlist' && waitlistStats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card padding="md">
                  <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Total</div>
                  <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                    {waitlistStats.total}
                  </div>
                </Card>
                <Card padding="md">
                  <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Notified</div>
                  <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                    {waitlistStats.notified}
                  </div>
                </Card>
                <Card padding="md">
                  <div className="text-sm" style={{ color: DS.colors.text.secondary }}>Not Notified</div>
                  <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                    {waitlistStats.notNotified}
                  </div>
                </Card>
                <Card padding="md">
                  <div className="text-sm" style={{ color: DS.colors.text.secondary }}>This Week</div>
                  <div className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
                    {waitlistStats.thisWeek}
                  </div>
                </Card>
              </div>
            )}

            {/* Send Email Button */}
            <div className="mb-6 flex gap-3">
              <Button
                variant="primary"
                icon={<Send size={18} />}
                onClick={() => setShowEmailForm(!showEmailForm)}
              >
                {showEmailForm ? 'Cancel' : 'Send Mass Email'}
              </Button>
              <Button
                variant="secondary"
                icon={<Mail size={18} />}
                onClick={async () => {
                  try {
                    const result = await apiFetch('/api/test-email/send', { method: 'POST' });
                    alert(`Test email sent! Check your inbox (${user?.email || 'your email'})`);
                  } catch (error: any) {
                    alert(`Test failed: ${error.message || 'Check Railway logs for details'}`);
                  }
                }}
              >
                Test Email Config
              </Button>
            </div>

            {/* Email Form */}
            {showEmailForm && (
              <Card padding="lg" className="mb-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                  Compose Email
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: DS.colors.background.card,
                        borderColor: DS.colors.border.default,
                        color: DS.colors.text.primary,
                      }}
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                      Message Content *
                    </label>
                    <textarea
                      value={emailForm.textContent}
                      onChange={(e) => setEmailForm({ ...emailForm, textContent: e.target.value })}
                      rows={12}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: DS.colors.background.card,
                        borderColor: DS.colors.border.default,
                        color: DS.colors.text.primary,
                      }}
                      placeholder="Just type your message here in plain text. HTML will be automatically generated for you.

Example:
Hi {name},

Thank you for joining the BlueprintCAD waiting list! We're excited to announce that we'll be launching very soon.

Visit: https://www.blueprintcad.io

Best regards,
The BlueprintCAD Team"
                    />
                    <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                      💡 Just type your message in plain text. HTML formatting will be automatically generated.
                      <br />
                      Use {'{name}'} or {'{username}'} for personalization, {'{email}'} for email address
                    </p>
                  </div>

                  {activeTab === 'waitlist' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="onlyNotNotified"
                        checked={emailForm.onlyNotNotified}
                        onChange={(e) => setEmailForm({ ...emailForm, onlyNotNotified: e.target.checked })}
                      />
                      <label htmlFor="onlyNotNotified" style={{ color: DS.colors.text.primary }}>
                        Only send to users who haven't been notified yet
                      </label>
                    </div>
                  )}

                  {activeTab === 'all-users' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                        Filter Users (optional)
                      </label>
                      <select
                        value={emailForm.userFilter.tier}
                        onChange={(e) => setEmailForm({
                          ...emailForm,
                          userFilter: { ...emailForm.userFilter, tier: e.target.value },
                        })}
                        className="px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: DS.colors.background.card,
                          borderColor: DS.colors.border.default,
                          color: DS.colors.text.primary,
                        }}
                      >
                        <option value="">All Tiers</option>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="studio">Studio</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleSendEmail}
                    disabled={sending || !emailForm.subject || !emailForm.textContent}
                    icon={sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  >
                    {sending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Campaigns List */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                Recent Campaigns
              </h3>
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} padding="md" hover>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                            {campaign.name}
                          </h4>
                          <span
                            className="px-2 py-1 text-xs rounded"
                            style={{
                              backgroundColor:
                                campaign.status === 'completed'
                                  ? `${DS.colors.accent.success}20`
                                  : campaign.status === 'sending'
                                  ? `${DS.colors.accent.warning}20`
                                  : `${DS.colors.text.tertiary}20`,
                              color:
                                campaign.status === 'completed'
                                  ? DS.colors.accent.success
                                  : campaign.status === 'sending'
                                  ? DS.colors.accent.warning
                                  : DS.colors.text.tertiary,
                            }}
                          >
                            {campaign.status}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                          {campaign.subject}
                        </p>
                        <div className="flex items-center gap-4 text-xs" style={{ color: DS.colors.text.tertiary }}>
                          <span>Recipients: {campaign.recipient_count}</span>
                          <span>Sent: {campaign.sent_count}</span>
                          <span>Failed: {campaign.failed_count}</span>
                          {campaign.sent_at && (
                            <span>Sent: {new Date(campaign.sent_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {campaign.status === 'completed' && (
                        <CheckCircle2 size={20} style={{ color: DS.colors.accent.success }} />
                      )}
                      {campaign.status === 'sending' && (
                        <Loader2 size={20} className="animate-spin" style={{ color: DS.colors.accent.warning }} />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}

