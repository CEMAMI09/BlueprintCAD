'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import Link from 'next/link';

export default function CheckoutSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [orderType, setOrderType] = useState<'digital' | 'manufacturing'>('digital');

  useEffect(() => {
    if (!searchParams) return;
    
    const number = searchParams.get('orderNumber');
    const type = searchParams.get('type') as 'digital' | 'manufacturing';
    
    if (!number) {
      router.push('/explore');
      return;
    }

    setOrderNumber(number);
    setOrderType(type || 'digital');
  }, [searchParams, router]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold mb-2">
              {orderType === 'digital' ? 'Purchase Complete!' : 'Order Request Submitted!'}
            </h1>
            
            <p className="text-gray-400 mb-8">
              {orderType === 'digital' 
                ? 'Your payment was successful and your download is ready.'
                : 'Your manufacturing order request has been received.'}
            </p>

            {/* Order Info */}
            <div className="bg-black border border-gray-800 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm text-gray-400">Order Number</span>
              </div>
              <p className="text-2xl font-mono font-bold text-white">{orderNumber}</p>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-400 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {orderType === 'digital' ? 'What\'s Next?' : 'What Happens Now?'}
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {orderType === 'digital' ? (
                  <>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>A purchase confirmation email has been sent to your inbox</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>You can download your file up to 3 times within 1 year</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>View your purchase history and downloads in the Orders page</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Our manufacturing team will review your request within 24 hours</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>We'll contact you via email to confirm specifications and pricing</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Payment will be arranged after you approve the final quote</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/orders"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-center"
              >
                {orderType === 'digital' ? 'Download Now' : 'View Order Status'}
              </Link>
              <Link
                href="/explore"
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-center"
              >
                Continue Shopping
              </Link>
            </div>

            {/* Support Link */}
            <p className="text-sm text-gray-500 mt-6">
              Questions? <Link href="/support" className="text-blue-400 hover:text-blue-300">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
