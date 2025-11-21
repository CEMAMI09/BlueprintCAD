'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout';
import Link from 'next/link';

interface Reply {
  id: number;
  content: string;
  username: string;
  created_at: string;
}

interface Thread {
  id: number;
  title: string;
  content: string;
  username: string;
  user_id: number;
  category: string;
  views: number;
  is_pinned: number;
  is_locked: number;
  created_at: string;
  replies: Reply[];
}

export default function ThreadDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchThread();
    }
  }, [id]);

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/forum/${id}`);
      if (res.ok) {
        const data = await res.json();
        setThread(data);
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!replyContent.trim()) {
      setError('Please enter a reply');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const res = await fetch(`/api/forum/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: replyContent })
      });

      if (res.ok) {
        setReplyContent('');
        fetchThread();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to post reply');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/forum/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        router.push('/forum');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete thread');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!thread) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Thread Not Found</h1>
          <Link href="/forum" className="text-blue-400 hover:text-blue-300">
            Back to Forum
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Back Button */}
        <Link href="/forum" className="text-gray-400 hover:text-white mb-4 inline-flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Forum
        </Link>

        {/* Thread Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {thread.is_pinned === 1 && (
                  <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded">PINNED</span>
                )}
                {thread.is_locked === 1 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">LOCKED</span>
                )}
                {thread.category && (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">{thread.category}</span>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-3">{thread.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <Link href={`/profile/${thread.username}`} className="hover:text-white">
                  by {thread.username}
                </Link>
                <span>•</span>
                <span>{formatDate(thread.created_at)}</span>
                <span>•</span>
                <span>{thread.views} views</span>
                <span>•</span>
                <span>{thread.replies.length} replies</span>
              </div>
            </div>
            {user?.userId === thread.user_id && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
              >
                Delete
              </button>
            )}
          </div>

          {/* Thread Content */}
          <div className="prose prose-invert max-w-none mt-6">
            <p className="text-gray-300 whitespace-pre-wrap">{thread.content}</p>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          {thread.replies.map((reply) => (
            <div key={reply.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <Link href={`/profile/${reply.username}`} className="font-medium text-blue-400 hover:text-blue-300">
                  {reply.username}
                </Link>
                <span className="text-sm text-gray-500">{formatDate(reply.created_at)}</span>
              </div>
              <p className="text-gray-300 whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        {thread.is_locked !== 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Post a Reply</h2>
            {user ? (
              <form onSubmit={handleReply}>
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                )}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
                  placeholder="Write your reply..."
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You must be logged in to reply</p>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        )}

        {thread.is_locked === 1 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
            </svg>
            <p className="text-gray-400">This thread is locked. No new replies can be posted.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
