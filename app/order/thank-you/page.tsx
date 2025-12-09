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
import { Card, Button } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function OrderThankYouPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get('orderNumber') || null;
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUsername(user.username);
    }
  }, []);

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Order Request Submitted" />
          <PanelContent>
            <div className="px-4 md:px-10 py-8">
              <Card padding="lg">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: DS.colors.accent.success + '20' }}
                    >
                      <CheckCircle
                        size={48}
                        style={{ color: DS.colors.accent.success }}
                      />
                    </div>
                  </div>
                  
                  <h2
                    className="text-2xl font-bold mb-4"
                    style={{ color: DS.colors.text.primary }}
                  >
                    Thank You!
                  </h2>
                  
                  <p
                    className="text-lg mb-2"
                    style={{ color: DS.colors.text.secondary }}
                  >
                    Your order request has been sent.
                  </p>
                  
                  <p
                    className="text-base mb-6"
                    style={{ color: DS.colors.text.secondary }}
                  >
                    We will reach out to you within 1-2 days.
                  </p>

                  {orderNumber && orderNumber !== 'pending' && (
                    <div
                      className="mb-6 p-4 rounded-lg"
                      style={{ background: DS.colors.background.panel }}
                    >
                      <p
                        className="text-sm mb-1"
                        style={{ color: DS.colors.text.tertiary }}
                      >
                        Order Number
                      </p>
                      <p
                        className="text-lg font-semibold"
                        style={{ color: DS.colors.text.primary }}
                      >
                        {orderNumber}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 justify-center">
                    {username ? (
                      <Button
                        variant="secondary"
                        onClick={() => router.push(`/profile/${username}?tab=orders`)}
                        icon={<ArrowLeft size={18} />}
                      >
                        View Orders
                      </Button>
                    ) : null}
                    <Button
                      variant="primary"
                      onClick={() => router.push('/explore')}
                      style={{ background: DS.colors.primary.blue, color: '#fff' }}
                    >
                      Continue Browsing
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}

