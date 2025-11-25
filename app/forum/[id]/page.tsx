'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft,
  MessageSquare,
  Eye,
  ThumbsUp,
  Clock,
  Pin,
  Lock,
  User,
  Crown,
  Shield,
  Trash2,
} from 'lucide-react';

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
  profile_picture?: string | null;
  user_id: number;
  category: string;
  views: number;
  is_pinned: number;
  is_locked: number;
  created_at: string;
  replies: Reply[];
}

interface Reply {
  id: number;
  content: string;
  username: string;
  profile_picture?: string | null;
  created_at: string;
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

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!thread) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>
                  Thread Not Found
                </h1>
                <Link href="/forum" style={{ color: DS.colors.primary.blue }}>
                  Back to Forum
                </Link>
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
          <PanelHeader 
            title={
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ArrowLeft size={18} />}
                  onClick={() => router.push('/forum')}
                />
                <span>{thread.title}</span>
              </div>
            }
            actions={
              user?.userId === thread.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={18} />}
                  onClick={handleDelete}
                  style={{ color: DS.colors.accent.error }}
                >
                  Delete
                </Button>
              )
            }
          />
          <PanelContent>
            <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 py-6">
              {/* Thread Header */}
              <Card padding="lg" className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  {thread.is_pinned === 1 && (
                    <Badge variant="warning" size="sm">
                      <Pin size={12} className="mr-1" />
                      Pinned
                    </Badge>
                  )}
                  {thread.is_locked === 1 && (
                    <Badge variant="default" size="sm">
                      <Lock size={12} className="mr-1" />
                      Locked
                    </Badge>
                  )}
                  {thread.category && (
                    <Badge variant="default" size="sm">{thread.category}</Badge>
                  )}
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ 
                      backgroundColor: thread.profile_picture ? 'transparent' : DS.colors.primary.blue,
                      color: '#ffffff'
                    }}
                  >
                    {thread.profile_picture ? (
                      <img
                        src={`/api/users/profile-picture/${thread.profile_picture}`}
                        alt={thread.username}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.style.backgroundColor = DS.colors.primary.blue;
                            parent.textContent = thread.username.substring(0, 2).toUpperCase();
                          }
                        }}
                      />
                    ) : (
                      thread.username.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/profile/${thread.username}`}
                        className="font-semibold text-sm hover:underline"
                        style={{ color: DS.colors.primary.blue }}
                      >
                        @{thread.username}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(thread.created_at)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {thread.views} views
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {thread.replies.length} replies
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thread Content */}
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: DS.colors.text.secondary }}>
                    {thread.content}
                  </p>
                </div>
              </Card>

              {/* Replies */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                  <MessageSquare size={18} />
                  Replies ({thread.replies.length})
                </h2>
                <div className="space-y-4">
                  {thread.replies.length > 0 ? (
                    thread.replies.map((reply) => (
                      <Card key={reply.id} padding="md">
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ 
                              backgroundColor: reply.profile_picture ? 'transparent' : DS.colors.primary.blue,
                              color: '#ffffff'
                            }}
                          >
                            {reply.profile_picture ? (
                              <img
                                src={`/api/users/profile-picture/${reply.profile_picture}`}
                                alt={reply.username}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.style.backgroundColor = DS.colors.primary.blue;
                                    parent.textContent = reply.username.substring(0, 2).toUpperCase();
                                  }
                                }}
                              />
                            ) : (
                              reply.username.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link 
                                href={`/profile/${reply.username}`}
                                className="font-semibold text-sm hover:underline"
                                style={{ color: DS.colors.primary.blue }}
                              >
                                @{reply.username}
                              </Link>
                            </div>
                            <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                              {formatTimeAgo(reply.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: DS.colors.text.secondary }}>
                          {reply.content}
                        </p>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8" style={{ color: DS.colors.text.tertiary }}>
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No replies yet. Be the first to reply!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reply Form */}
              {thread.is_locked !== 1 && (
                <Card padding="lg">
                  <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                    Post a Reply
                  </h2>
                  {user ? (
                    <form onSubmit={handleReply}>
                      {error && (
                        <div 
                          className="p-3 mb-4 rounded-lg text-sm"
                          style={{ 
                            backgroundColor: DS.colors.accent.error + '22',
                            borderColor: DS.colors.accent.error + '44',
                            color: DS.colors.accent.error 
                          }}
                        >
                          {error}
                        </div>
                      )}
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={6}
                        placeholder="Write your reply..."
                        className="w-full px-4 py-3 border rounded-lg mb-4"
                        style={{
                          backgroundColor: DS.colors.background.panel,
                          borderColor: DS.colors.border.default,
                          color: DS.colors.text.primary,
                        }}
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={submitting || !replyContent.trim()}
                      >
                        {submitting ? 'Posting...' : 'Post Reply'}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <p className="mb-4" style={{ color: DS.colors.text.secondary }}>
                        You must be logged in to reply
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => router.push('/login')}
                      >
                        Login
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {thread.is_locked === 1 && (
                <Card padding="lg">
                  <div className="text-center py-8">
                    <Lock size={48} className="mx-auto mb-3 opacity-50" style={{ color: DS.colors.text.tertiary }} />
                    <p style={{ color: DS.colors.text.secondary }}>
                      This thread is locked. No new replies can be posted.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Thread Info" />
          <PanelContent>
            <div className="space-y-4">
              <Card padding="md" style={{ borderRadius: 0 }}>
                <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                  Statistics
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: DS.colors.text.secondary }}>Views</span>
                    <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                      {thread.views}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: DS.colors.text.secondary }}>Replies</span>
                    <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                      {thread.replies.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: DS.colors.text.secondary }}>Category</span>
                    <Badge variant="default" size="sm">{thread.category}</Badge>
                  </div>
                </div>
              </Card>

              <Card padding="md" style={{ borderRadius: 0 }}>
                <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                  Author
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                  <Link 
                    href={`/profile/${thread.username}`}
                    className="font-semibold text-sm hover:underline"
                    style={{ color: DS.colors.primary.blue }}
                  >
                    @{thread.username}
                  </Link>
                </div>
              </Card>
            </div>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
