'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Package,
  Clock,
  Weight,
  Scale,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface ManufacturingOrder {
  fileName: string;
  manufacturingOption: string;
  estimatedCost: string;
  deliveryTime: string;
  material: string;
  scalePercentage: number;
  dimensions: string | null;
  weight: number;
  printTime: number;
  aiEstimate: string;
  breakdown: string | null;
  price: number;
}

export default function OrderPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orderData, setOrderData] = useState<ManufacturingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login?redirect=/order');
      return;
    }
    setUser(JSON.parse(userData));

    // Get order data from sessionStorage
    const storedOrder = sessionStorage.getItem('manufacturingOrder');
    if (!storedOrder) {
      setError('No order data found. Please start from the quote page.');
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedOrder);
      setOrderData(parsed);
    } catch (err) {
      setError('Invalid order data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handlePlaceOrder = async () => {
    if (!orderData || !user) return;

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/manufacturing-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: orderData.fileName,
          manufacturingOption: orderData.manufacturingOption,
          estimatedCost: orderData.estimatedCost,
          deliveryTime: orderData.deliveryTime,
          material: orderData.material,
          scalePercentage: orderData.scalePercentage,
          dimensions: orderData.dimensions,
          weight: orderData.weight,
          printTime: orderData.printTime,
          aiEstimate: orderData.aiEstimate,
          breakdown: orderData.breakdown
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create order');
      }

      const data = await res.json();
      sessionStorage.removeItem('manufacturingOrder');
      
      // Redirect to thank you page
      router.push(`/order/thank-you?orderNumber=${data.orderNumber || 'pending'}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
      setProcessing(false);
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
        rightPanel={
          <RightPanel>
            <PanelHeader title="Order Information" />
            <PanelContent>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.text.secondary }}>
                    What happens next:
                  </h4>
                  <ul className="space-y-2 text-sm" style={{ color: DS.colors.text.primary }}>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                      <span>Order confirmation email sent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                      <span>Our team reviews your order</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                      <span>Payment processing (if required)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                      <span>Manufacturing begins</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                      <span>Shipping notification</span>
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

  if (error && !orderData) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader 
              title="Error" 
              actions={
                <Link href="/quote" style={{ color: DS.colors.primary.blue }}>
                  &larr; Back to Quote
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
                  <Button
                    variant="primary"
                    onClick={() => router.push('/quote')}
                    className="w-full"
                    icon={<ArrowRight size={18} />}
                  >
                    Go to Quote Page
                  </Button>
                </Card>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!orderData) return null;

  const parsedDimensions = orderData.dimensions ? JSON.parse(orderData.dimensions) : null;
  const parsedEstimate = orderData.aiEstimate ? JSON.parse(orderData.aiEstimate) : null;

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
                {/* Left Column - Order Details */}
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
                          {orderData.fileName}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                          Manufacturing Service
                        </p>
                        <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                          {orderData.manufacturingOption}
                        </p>
                      </div>

                      {parsedDimensions && (
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Dimensions
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {parsedDimensions.x.toFixed(2)} × {parsedDimensions.y.toFixed(2)} × {parsedDimensions.z.toFixed(2)} mm
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Material
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {orderData.material}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Scale
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {orderData.scalePercentage}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Weight
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {orderData.weight > 0 ? `${orderData.weight.toFixed(1)}g` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            Print Time
                          </p>
                          <p className="font-medium" style={{ color: DS.colors.text.primary }}>
                            {orderData.printTime > 0 
                              ? `${Math.floor(orderData.printTime)}h ${Math.round((orderData.printTime % 1) * 60)}m`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Pricing & Actions */}
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
                          {orderData.estimatedCost}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: DS.colors.text.secondary }}>Delivery Time</span>
                        <div className="flex items-center gap-1" style={{ color: DS.colors.text.primary }}>
                          <Clock size={14} />
                          <span>{orderData.deliveryTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: DS.colors.text.secondary }}>Quality Guarantee</span>
                        <div className="flex items-center gap-1" style={{ color: DS.colors.accent.success }}>
                          <CheckCircle size={14} />
                          <span>Included</span>
                        </div>
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

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlaceOrder();
                      }}
                      disabled={processing}
                      className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        backgroundColor: DS.colors.primary.blue, 
                        color: '#fff',
                        border: 'none',
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!processing) {
                          e.currentTarget.style.opacity = '0.9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!processing) {
                          e.currentTarget.style.opacity = '1';
                        }
                      }}
                    >
                      <ShoppingCart size={18} />
                      {processing ? 'Processing...' : 'Place Order'}
                    </button>

                    <p className="text-xs mt-2 text-center" style={{ color: DS.colors.text.tertiary }}>
                      Your order will be reviewed and you'll receive a confirmation email
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Order Information" />
          <PanelContent>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.text.secondary }}>
                  What happens next:
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: DS.colors.text.primary }}>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Order confirmation email sent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Our team reviews your order</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Payment processing (if required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Manufacturing begins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: DS.colors.accent.success }} />
                    <span>Shipping notification</span>
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

