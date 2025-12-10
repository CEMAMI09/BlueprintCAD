'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams?.get('session_id');
    
    if (!sessionId) {
      router.push('/subscription');
      return;
    }

    // Verify session and get tier info
    // The webhook should have already processed this, but we can verify
    fetchSubscriptionStatus();
  }, [searchParams, router]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setTier(data.tier);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Processing..." />
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p style={{ color: DS.colors.text.secondary }}>Verifying subscription...</p>
                </div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Subscription Activated" />
          <PanelContent>
            <div className="max-w-2xl mx-auto py-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} className="text-white" />
                </div>
                
                <h1 className="text-3xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Welcome to {tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Premium'}!
                </h1>
                
                <p className="text-lg mb-8" style={{ color: DS.colors.text.secondary }}>
                  Your subscription has been successfully activated. You now have access to all premium features.
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 mb-8" style={{ border: `1px solid ${DS.colors.border.default}` }}>
                <h2 className="text-xl font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                  What's Next?
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.primary.blue }} />
                    <span style={{ color: DS.colors.text.secondary }}>
                      Upload unlimited projects and create private designs
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.primary.blue }} />
                    <span style={{ color: DS.colors.text.secondary }}>
                      Start selling your designs on the marketplace
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.primary.blue }} />
                    <span style={{ color: DS.colors.text.secondary }}>
                      Access advanced features like analytics and API access
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.primary.blue }} />
                    <span style={{ color: DS.colors.text.secondary }}>
                      Invite team members and collaborate on projects
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <Link href="/dashboard">
                  <Button variant="primary">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button variant="secondary">
                    Explore Designs
                  </Button>
                </Link>
                <Link href="/subscription">
                  <Button variant="secondary">
                    Manage Subscription
                  </Button>
                </Link>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}

