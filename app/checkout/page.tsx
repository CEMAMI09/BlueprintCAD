'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Button } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

interface CheckoutData {
  type: 'digital' | 'manufacturing' | 'subscription';
  projectId?: number;
  projectTitle?: string;
  price?: number;
  manufacturingOption?: string;
  fileName?: string;
  material?: string;
  dimensions?: string;
  weight?: number;
  printTime?: number;
  deliveryTime?: string;
  aiEstimate?: string;
  breakdown?: any;
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stripe = useStripe();
  const elements = useElements();

  const [user, setUser] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    // Parse checkout data from URL params or sessionStorage
    const type = (searchParams?.get('type') as 'digital' | 'manufacturing' | 'subscription') || 'digital';
    const storedData = sessionStorage.getItem('checkoutData');

    if (storedData) {
      setCheckoutData(JSON.parse(storedData));
    } else if (type === 'digital') {
      const projectId = searchParams?.get('projectId') || null;
      const projectTitle = searchParams?.get('projectTitle') || null;
      const price = searchParams?.get('price') || null;
      
      if (projectId && projectTitle && price) {
        setCheckoutData({
          type: 'digital',
          projectId: parseInt(projectId),
          projectTitle,
          price: parseFloat(price)
        });
      }
    }

    setLoading(false);
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !checkoutData) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      if (checkoutData.type === 'digital') {
        // Handle digital file purchase with Stripe
        const checkoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: checkoutData.projectId,
            totalPrice: totalPrice // Use calculated total price with platform fee
          }),
        });

        if (!checkoutRes.ok) {
          const data = await checkoutRes.json();
          throw new Error(data.message || 'Failed to create checkout session');
        }

        const { clientSecret, orderNumber } = await checkoutRes.json();

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }

        if (paymentIntent?.status !== 'succeeded') {
          throw new Error('Payment was not successful');
        }

        const confirmRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber }),
        });

        if (!confirmRes.ok) {
          const data = await confirmRes.json();
          throw new Error(data.message || 'Failed to confirm order');
        }

        sessionStorage.removeItem('checkoutData');
        router.push(`/checkout/success?orderNumber=${orderNumber}&type=digital`);

      } else if (checkoutData.type === 'manufacturing') {
        // Handle manufacturing order (no payment yet, just create order)
        const orderData = {
          fileName: checkoutData.fileName,
          manufacturingOption: checkoutData.manufacturingOption,
          estimatedCost: checkoutData.price?.toString() || 'Quote Required',
          deliveryTime: checkoutData.deliveryTime,
          material: checkoutData.material,
          dimensions: checkoutData.dimensions,
          weight: checkoutData.weight,
          printTime: checkoutData.printTime,
          aiEstimate: checkoutData.aiEstimate,
          breakdown: checkoutData.breakdown
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(orderData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to create order');
        }

        const data = await res.json();
        sessionStorage.removeItem('checkoutData');
        router.push(`/checkout/success?orderNumber=${data.orderNumber}&type=manufacturing`);
      }

    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
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
      />
    );
  }

  if (!checkoutData) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Invalid Checkout Session" />
            <PanelContent>
              <div className="px-4 md:px-10 py-8">
                <Card padding="lg">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      No checkout data found
                    </h3>
                    <p className="text-sm mb-6" style={{ color: DS.colors.text.secondary }}>
                      Please start your purchase from the design page.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => router.push('/explore')}
                    >
                      Return to Explore
                    </Button>
                  </div>
                </Card>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  // Platform fee only applies to digital purchases
  let basePrice = 0;
  let platformFee = 0;
  let totalPrice = 0;
  const [platformFeeRate, setPlatformFeeRate] = useState<number>(0.05);

  useEffect(() => {
    // Fetch platform fee based on seller's subscription
    if (checkoutData?.type === 'digital' && checkoutData?.projectId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${checkoutData.projectId}`)
        .then(res => res.json())
        .then(project => {
          if (project.user_id) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/platform-fee`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
              .then(res => res.json())
              .then(data => {
                setPlatformFeeRate(data.platformFee || 0.05);
              })
              .catch(() => setPlatformFeeRate(0.05));
          }
        })
        .catch(() => setPlatformFeeRate(0.05));
    }
  }, [checkoutData]);

  if (checkoutData.type === 'digital') {
    // If basePrice is provided, use it; otherwise calculate from price (assuming price might be total)
    if ((checkoutData as any).basePrice) {
      basePrice = (checkoutData as any).basePrice;
      platformFee = (checkoutData as any).platformFee || (basePrice * platformFeeRate);
      totalPrice = basePrice + platformFee;
    } else {
      // If no basePrice, assume price is base and calculate fee
      basePrice = checkoutData.price || 0;
      platformFee = basePrice * platformFeeRate;
      totalPrice = basePrice + platformFee;
    }
  } else {
    // Manufacturing orders have no platform fee
    totalPrice = checkoutData.price || 0;
  }

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title="Checkout"
            actions={
              <button
                onClick={() => router.back()}
                style={{ color: DS.colors.primary.blue }}
                className="hover:underline"
              >
                &larr; Back
              </button>
            }
          />
          <PanelContent>
            <div className="px-4 md:px-10 py-8">
              <div className="grid lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                
                {checkoutData.type === 'digital' && (
                  <>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{checkoutData.projectTitle}</h3>
                        <p className="text-sm text-gray-400">Digital File Purchase</p>
                        <p className="text-xs text-gray-500 mt-2">
                          • Instant download after payment<br/>
                          • 3 downloads allowed<br/>
                          • Valid for 1 year
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Design Price</span>
                        <span className="text-white">${basePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Platform Fee (5%)</span>
                        <span className="text-white">${platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t border-gray-800">
                        <span>Total</span>
                        <span className="text-emerald-400">${(basePrice + platformFee).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {checkoutData.type === 'manufacturing' && (
                  <>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{checkoutData.fileName}</h3>
                        <p className="text-sm text-gray-400">Manufacturing Order</p>
                        <p className="text-xs text-blue-400 mt-1">{checkoutData.manufacturingOption}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 text-sm">
                      {checkoutData.material && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Material</span>
                          <span className="text-white">{checkoutData.material}</span>
                        </div>
                      )}
                      {checkoutData.dimensions && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Dimensions</span>
                          <span className="text-white">{checkoutData.dimensions}</span>
                        </div>
                      )}
                      {checkoutData.weight && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Weight</span>
                          <span className="text-white">{checkoutData.weight.toFixed(1)}g</span>
                        </div>
                      )}
                      {checkoutData.deliveryTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Delivery</span>
                          <span className="text-white">{checkoutData.deliveryTime}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Estimated Cost</span>
                        <span className="text-blue-400">
                          {typeof checkoutData.price === 'number' 
                            ? `$${checkoutData.price.toFixed(2)}` 
                            : 'Quote Required'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * No payment required now. Our team will contact you to confirm details and arrange payment.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-blue-400 font-medium mb-1">
                      {checkoutData.type === 'digital' ? 'Secure Payment' : 'Order Request'}
                    </p>
                    <p className="text-gray-400">
                      {checkoutData.type === 'digital' 
                        ? 'Your payment information is encrypted and secure. We never store your card details.'
                        : 'This creates an order request. No payment is processed at this time. Our team will reach out within 24 hours.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">
                  {checkoutData.type === 'digital' ? 'Payment Information' : 'Contact Information'}
                </h2>

                {checkoutData.type === 'digital' && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Card Details
                      </label>
                      <div className="p-4 bg-black border border-gray-700 rounded-lg">
                        <CardElement
                          options={{
                            style: {
                              base: {
                                fontSize: '16px',
                                color: '#ffffff',
                                '::placeholder': {
                                  color: '#6b7280',
                                },
                              },
                              invalid: {
                                color: '#ef4444',
                              },
                            },
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Test card: 4242 4242 4242 4242 | Any future expiry | Any CVC
                      </p>
                    </div>
                  </>
                )}

                {checkoutData.type === 'manufacturing' && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-400 mb-4">
                      Your contact information will be used to reach out about this order.
                    </p>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between p-3 bg-black rounded-lg">
                        <span className="text-gray-400">Email</span>
                        <span className="text-white">{user?.email || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-black rounded-lg">
                        <span className="text-gray-400">Username</span>
                        <span className="text-white">@{user?.username}</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing || (checkoutData.type === 'digital' && !stripe)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                >
                  {processing 
                    ? 'Processing...' 
                    : checkoutData.type === 'digital' 
                      ? `Pay $${(basePrice + platformFee).toFixed(2)}` 
                      : 'Submit Order Request'}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  By continuing, you agree to Blueprint's Terms of Service and Privacy Policy
                </p>
              </form>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Secure Checkout
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    SSL encrypted connection
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    PCI DSS compliant
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Money-back guarantee
                  </li>
                </ul>
              </div>
            </div>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
