'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Order {
  id: number;
  order_number: string;
  amount: number;
  currency: string;
  status: string;
  payment_status: string;
  download_token: string | null;
  download_count: number;
  download_limit: number;
  expires_at: string;
  created_at: string;
  project: {
    id: number;
    title: string;
    thumbnail: string | null;
  };
  buyer?: {
    username: string;
    profile_picture: string | null;
  };
  seller?: {
    username: string;
    profile_picture: string | null;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales' | 'manufacturing'>('purchases');
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [manufacturingOrders, setManufacturingOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalManufacturingOrders: 0,
    totalSpent: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login?redirect=/orders');
      return;
    }

    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
        setSales(data.sales || []);
        setManufacturingOrders(data.manufacturingOrders || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (token: string, projectTitle: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/download?token=${token}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectTitle}.stl`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        fetchOrders(); // Refresh to update download count
      } else {
        const data = await res.json();
        alert(data.message || 'Download failed');
      }
    } catch (error) {
      alert('Failed to download file');
    }
  };

  const handleRefund = async (orderNumber: string) => {
    if (!confirm('Are you sure you want to request a refund?')) return;

    const reason = prompt('Reason for refund (optional):');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/my-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, reason: reason || 'Buyer requested refund' }),
      });

      if (res.ok) {
        alert('Refund processed successfully');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.message || 'Refund failed');
      }
    } catch (error) {
      alert('Failed to process refund');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const orders = activeTab === 'purchases' ? purchases : activeTab === 'sales' ? sales : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-400 mb-8">View your purchase and sales history</p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Purchases</p>
            <p className="text-2xl font-bold text-blue-500">{stats.totalPurchases}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Spent</p>
            <p className="text-2xl font-bold text-red-500">${typeof stats.totalSpent === 'string' ? stats.totalSpent : stats.totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Sales</p>
            <p className="text-2xl font-bold text-green-500">{stats.totalSales}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Earnings</p>
            <p className="text-2xl font-bold text-green-500">${typeof stats.totalEarnings === 'string' ? stats.totalEarnings : stats.totalEarnings.toFixed(2)}</p>
          </div>
          {stats.totalManufacturingOrders > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Manufacturing Orders</p>
              <p className="text-2xl font-bold text-blue-500">{stats.totalManufacturingOrders}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'purchases'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Purchases ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'sales'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sales ({sales.length})
          </button>
          {manufacturingOrders.length > 0 && (
            <button
              onClick={() => setActiveTab('manufacturing')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'manufacturing'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Manufacturing ({manufacturingOrders.length})
            </button>
          )}
        </div>

        {/* Orders List */}
        {activeTab === 'manufacturing' ? (
          manufacturingOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-4">
                You haven't placed any manufacturing orders yet
              </p>
              <Link
                href="/quote"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Get a Quote
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {manufacturingOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{order.file_name}</h3>
                          <p className="text-sm text-gray-400">Order #{order.order_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-500 mb-1">{order.estimated_cost}</p>
                          <p className="text-sm text-gray-400">Estimated Cost</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-400">Status</p>
                          <p className="font-medium capitalize">{order.status}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Material</p>
                          <p className="font-medium">{order.material || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Delivery</p>
                          <p className="font-medium">{order.delivery_time || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Order Date</p>
                          <p className="font-medium">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      
                      {order.dimensions && (
                        <div className="text-sm text-gray-400">
                          <p>Dimensions: {order.dimensions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">
              {activeTab === 'purchases' 
                ? "You haven't made any purchases yet" 
                : "You haven't made any sales yet"}
            </p>
            <Link
              href="/explore"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Explore Projects
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Thumbnail */}
                  <Link href={`/project/${order.project.id}`}>
                    <div className="w-full md:w-32 h-32 bg-zinc-950 rounded-lg overflow-hidden flex-shrink-0">
                      {order.project.thumbnail ? (
                        <img
                          src={order.project.thumbnail}
                          alt={order.project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          No Image
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Order Details */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row justify-between mb-3">
                      <div>
                        <Link
                          href={`/project/${order.project.id}`}
                          className="text-xl font-bold hover:text-blue-500 transition-colors"
                        >
                          {order.project.title}
                        </Link>
                        <p className="text-sm text-gray-400 mt-1">
                          Order #{order.order_number}
                        </p>
                        {activeTab === 'purchases' && order.seller && (
                          <Link
                            href={`/profile/${order.seller.username}`}
                            className="text-sm text-gray-400 hover:text-blue-500"
                          >
                            by {order.seller.username}
                          </Link>
                        )}
                        {activeTab === 'sales' && order.buyer && (
                          <Link
                            href={`/profile/${order.buyer.username}`}
                            className="text-sm text-gray-400 hover:text-blue-500"
                          >
                            bought by {order.buyer.username}
                          </Link>
                        )}
                      </div>
                      <div className="text-right mt-2 md:mt-0">
                        <p className="text-2xl font-bold text-green-500">
                          ${order.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          order.status === 'completed'
                            ? 'bg-green-500/20 text-green-500'
                            : order.status === 'refunded'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {activeTab === 'purchases' && order.download_token && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-500">
                          {order.download_count}/{order.download_limit} downloads
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {activeTab === 'purchases' && order.status === 'completed' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDownload(order.download_token!, order.project.title)}
                          disabled={
                            !order.download_token ||
                            order.download_count >= order.download_limit ||
                            isExpired(order.expires_at)
                          }
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        >
                          {order.download_count >= order.download_limit
                            ? 'Download Limit Reached'
                            : isExpired(order.expires_at)
                            ? 'Download Expired'
                            : 'Download File'}
                        </button>
                        <button
                          onClick={() => handleRefund(order.order_number)}
                          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                        >
                          Request Refund
                        </button>
                      </div>
                    )}

                    {activeTab === 'sales' && order.status === 'completed' && (
                      <button
                        onClick={() => handleRefund(order.order_number)}
                        className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                      >
                        Issue Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
