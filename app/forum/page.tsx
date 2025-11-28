/**
 * Forum Page - Reddit/Discord Hybrid
 * Community discussions with categories and filtering
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, Tabs, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/components/SubscriptionGate';
import UpgradeModal from '@/components/UpgradeModal';
import {
  MessageSquare,
  Plus,
  TrendingUp,
  Clock,
  Star,
  Pin,
  Lock,
  Eye,
  User,
  Crown,
  Search,
  Shield,
  Users,
  ThumbsUp,
  BookOpen,
  X,
} from 'lucide-react';

interface Thread {
  id: number | string;
  title: string;
  content: string;
  username?: string;
  author?: {
    username: string;
    avatar: string;
    role: 'admin' | 'moderator' | 'member';
  };
  category: string;
  reply_count?: number;
  replies?: number;
  views: number;
  likes?: number;
  last_activity?: string;
  lastActivity?: string;
  is_pinned?: boolean;
  isPinned?: boolean;
  is_locked?: boolean;
  isLocked?: boolean;
  tags?: string[];
  created_at?: string;
  replies_data?: any[];
}

export default function ForumPage() {
  const router = useRouter();
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [activeSort, setActiveSort] = useState('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryStats, setCategoryStats] = useState<any>({
    all: 0,
    general: 0,
    electronics: 0,
    mechanical: 0,
    '3d-printing': 0,
    help: 0,
  });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThread, setNewThread] = useState({
    title: '',
    content: '',
    category: 'general',
  });
  const [creating, setCreating] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');

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

  useEffect(() => {
    fetchCategoryStats();
    fetchThreads();
  }, [selectedCategory, activeSort, searchQuery]);

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch('/api/forum/stats');
      if (res.ok) {
        const stats = await res.json();
        setCategoryStats(stats);
      }
    } catch (error) {
      console.error('Error fetching forum stats:', error);
    }
  };

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('sort', activeSort === 'hot' ? 'latest' : activeSort);

      const res = await fetch(`/api/forum/threads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Transform API data to match our Thread interface
        const transformedThreads = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          content: t.content,
          username: t.username,
          author: {
            username: t.username || 'unknown',
            avatar: t.profile_picture || '',
            role: 'member' as const,
          },
          category: t.category || 'general',
          reply_count: t.reply_count || 0,
          replies: t.reply_count || 0,
          views: t.views || 0,
          likes: t.likes || 0,
          last_activity: t.last_activity,
          lastActivity: formatTimeAgo(t.last_activity || t.created_at),
          is_pinned: t.is_pinned || false,
          isPinned: t.is_pinned || false,
          is_locked: t.is_locked || false,
          isLocked: t.is_locked || false,
          tags: [],
          created_at: t.created_at,
        }));
        setThreads(transformedThreads);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    // Check subscription before creating thread
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const canPost = await fetch(`/api/subscriptions/can-action?feature=canPostForums`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const postCheck = await canPost.json();
        
        if (!postCheck.allowed) {
          setShowUpgradeModal(true);
          setUpgradeTier(postCheck.requiredTier || 'pro');
          return;
        }
      } catch (err) {
        console.error('Error checking post permission:', err);
      }
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newThread),
      });

      if (res.ok) {
        const thread = await res.json();
        setShowCreateModal(false);
        setNewThread({ title: '', content: '', category: 'general' });
        fetchThreads();
        fetchCategoryStats();
        // Navigate to the new thread
        router.push(`/forum/${thread.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Failed to create thread');
    } finally {
      setCreating(false);
    }
  };

  const handleThreadClick = async (thread: Thread) => {
    // If clicking the same thread, just refresh it
    const shouldRefresh = selectedThread?.id === thread.id;

    // Fetch full thread details with replies
    try {
      const res = await fetch(`/api/forum/${thread.id}`);
      if (res.ok) {
        const fullThread = await res.json();
        // Transform to match our Thread interface
        const transformedThread: Thread = {
          id: fullThread.id,
          title: fullThread.title,
          content: fullThread.content,
          username: fullThread.username,
          author: {
            username: fullThread.username || 'unknown',
            avatar: fullThread.profile_picture || '',
            role: 'member' as const,
          },
          category: fullThread.category || 'general',
          reply_count: fullThread.replies?.length || 0,
          replies: fullThread.replies?.length || 0,
          views: fullThread.views || 0,
          likes: fullThread.likes || 0,
          last_activity: fullThread.last_activity,
          lastActivity: formatTimeAgo(fullThread.last_activity || fullThread.created_at),
          is_pinned: fullThread.is_pinned || false,
          isPinned: fullThread.is_pinned || false,
          is_locked: fullThread.is_locked || false,
          isLocked: fullThread.is_locked || false,
          tags: [],
          created_at: fullThread.created_at,
          // Store replies for display
          replies_data: fullThread.replies || [],
        };
        setSelectedThread(transformedThread);
      } else {
        // If fetch fails, just use the thread we have
        setSelectedThread(thread);
      }
    } catch (error) {
      console.error('Error fetching thread details:', error);
      // If fetch fails, just use the thread we have
      setSelectedThread(thread);
    }
  };

  const handlePostReply = async (threadId: number | string) => {
    if (!replyContent.trim()) {
      alert('Please enter a reply');
      return;
    }

    setSubmittingReply(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/forum/${threadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        setReplyContent('');
        // Refresh the thread to get updated replies
        if (selectedThread) {
          await handleThreadClick(selectedThread);
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Topics', count: categoryStats.all },
    { id: 'general', name: 'General Discussion', count: categoryStats.general },
    { id: 'electronics', name: 'Electronics', count: categoryStats.electronics },
    { id: 'mechanical', name: 'Mechanical Design', count: categoryStats.mechanical },
    { id: '3d-printing', name: '3D Printing', count: categoryStats['3d-printing'] },
    { id: 'help', name: 'Help & Support', count: categoryStats.help },
  ];

  // Separate pinned threads
  const pinnedThreads = threads.filter(t => t.isPinned || t.is_pinned);
  const regularThreads = threads.filter(t => !t.isPinned && !t.is_pinned);

  const topContributors: any[] = [];

  const rules = [
    'Be respectful and constructive',
    'No spam or self-promotion',
    'Stay on topic',
    'Use appropriate categories',
    'Search before posting',
  ];

  return (
    <>
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader 
            title="Community Forum"
            actions={
              <Button 
                variant="primary" 
                icon={<Plus size={18} />}
                onClick={() => setShowCreateModal(true)}
              >
                New Thread
              </Button>
            }
          />
          
          <PanelContent>
            {/* Search & Categories */}
            <div className="mb-6 px-4 md:px-8 lg:px-12 pt-4 md:pt-8">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: DS.colors.text.tertiary }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discussions..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary
                  }}
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="px-4 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: selectedCategory === category.id
                        ? DS.colors.primary.blue
                        : DS.colors.background.card,
                      color: selectedCategory === category.id
                        ? '#ffffff'
                        : DS.colors.text.secondary,
                      border: `1px solid ${selectedCategory === category.id ? DS.colors.primary.blue : DS.colors.border.default}`,
                    }}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>

              {/* Sort Tabs */}
              <Tabs
                tabs={[
                  { id: 'hot', label: 'Hot', icon: <TrendingUp size={16} /> },
                  { id: 'new', label: 'New', icon: <Clock size={16} /> },
                  { id: 'top', label: 'Top', icon: <Star size={16} /> },
                ]}
                activeTab={activeSort}
                onTabChange={setActiveSort}
              />
            </div>

            {/* Pinned Threads */}
            {pinnedThreads.length > 0 && (
              <div className="mb-6 px-4 md:px-8 lg:px-12">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: DS.colors.text.secondary }}>
                  <Pin size={16} />
                  Pinned Threads
                </h3>
                <div className="space-y-3">
                  {pinnedThreads.map((thread) => (
                    <Card
                      key={thread.id}
                      hover
                      padding="md"
                      onClick={() => router.push(`/forum/${thread.id}`)}
                      style={{
                        cursor: 'pointer',
                      }}
                    >
                      <ThreadCard thread={thread} />
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Threads */}
            <div className="space-y-3 px-4 md:px-8 lg:px-12">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : regularThreads.length > 0 ? (
                regularThreads.map((thread) => (
                  <Card
                    key={thread.id}
                    hover
                    padding="md"
                    onClick={() => router.push(`/forum/${thread.id}`)}
                    style={{
                      cursor: 'pointer',
                    }}
                  >
                    <ThreadCard thread={thread} />
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={<MessageSquare size={48} />}
                  title="No threads found"
                  description="Try adjusting your filters or be the first to start a discussion"
                  action={
                    <Button 
                      variant="primary" 
                      icon={<Plus size={18} />}
                      onClick={() => setShowCreateModal(true)}
                    >
                      Create Thread
                    </Button>
                  }
                />
              )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        selectedThread ? (
          <RightPanel>
            <PanelHeader 
              title={selectedThread.title}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedThread(null)}
                >
                  ✕
                </Button>
              }
            />
            <PanelContent className="overflow-y-auto">
              <div className="space-y-6">
                {/* Thread Header */}
                <div className="flex items-center gap-2 mb-4">
                  {(selectedThread.isPinned || selectedThread.is_pinned) && (
                    <Badge variant="warning" size="sm">
                      <Pin size={12} className="mr-1" />
                      Pinned
                    </Badge>
                  )}
                  {(selectedThread.isLocked || selectedThread.is_locked) && (
                    <Badge variant="default" size="sm">
                      <Lock size={12} className="mr-1" />
                      Locked
                    </Badge>
                  )}
                  <Badge variant="default" size="sm">{selectedThread.category}</Badge>
                </div>

                {/* Thread Content */}
                <Card padding="md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: DS.colors.text.primary }}>
                          @{selectedThread.author?.username || selectedThread.username || 'unknown'}
                        </span>
                        {selectedThread.author?.role === 'admin' && (
                          <Crown size={14} style={{ color: DS.colors.accent.warning }} />
                        )}
                        {selectedThread.author?.role === 'moderator' && (
                          <Shield size={14} style={{ color: DS.colors.primary.blue }} />
                        )}
                      </div>
                      <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                        {selectedThread.created_at ? formatTimeAgo(selectedThread.created_at) : 'Just now'}
                      </span>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none" style={{ color: DS.colors.text.secondary }}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedThread.content}</p>
                  </div>
                </Card>

                {/* Replies */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                    <MessageSquare size={18} />
                    Replies ({selectedThread.replies_data?.length || selectedThread.replies || 0})
                  </h3>
                  <div className="space-y-4">
                    {selectedThread.replies_data && selectedThread.replies_data.length > 0 ? (
                      selectedThread.replies_data.map((reply: any) => (
                        <Card key={reply.id} padding="md">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm" style={{ color: DS.colors.text.primary }}>
                                  @{reply.username || 'unknown'}
                                </span>
                              </div>
                              <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                {reply.created_at ? formatTimeAgo(reply.created_at) : 'Just now'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap" style={{ color: DS.colors.text.secondary }}>
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
                {!(selectedThread.isLocked || selectedThread.is_locked) && (
                  <Card padding="md">
                    <h3 className="font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      Post a Reply
                    </h3>
                    <div className="space-y-3">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        rows={4}
                        className="w-full px-4 py-2 border rounded-none"
                        style={{
                          backgroundColor: DS.colors.background.panel,
                          borderColor: DS.colors.border.default,
                          color: DS.colors.text.primary,
                        }}
                      />
                      <Button
                        variant="primary"
                        onClick={() => handlePostReply(selectedThread.id)}
                        disabled={submittingReply || !replyContent.trim()}
                        fullWidth
                      >
                        {submittingReply ? 'Posting...' : 'Post Reply'}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </PanelContent>
          </RightPanel>
        ) : (
          <RightPanel>
            <PanelHeader title="Forum Info" />
            <PanelContent>
              <style dangerouslySetInnerHTML={{__html: `
                .forum-right-panel input,
                .forum-right-panel textarea {
                  border-radius: 0 !important;
                }
                .forum-right-panel > div[class*="rounded-lg"] {
                  border-radius: 0 !important;
                }
              `}} />
              <div className="space-y-6 forum-right-panel">
                {/* Rules */}
                <Card padding="md" style={{ borderRadius: 0 }}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                    <BookOpen size={18} />
                    Forum Rules
                  </h3>
                  <ol className="space-y-2">
                    {rules.map((rule, index) => (
                      <li key={index} className="text-sm flex gap-2" style={{ color: DS.colors.text.secondary }}>
                        <span className="font-semibold" style={{ color: DS.colors.primary.blue }}>
                          {index + 1}.
                        </span>
                        {rule}
                      </li>
                    ))}
                  </ol>
                </Card>

                {/* Moderators */}
                <Card padding="md" style={{ borderRadius: 0 }}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                    <Shield size={18} />
                    Moderators
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                      <span className="text-sm" style={{ color: DS.colors.text.primary }}>
                        @admin
                      </span>
                      <Crown size={14} style={{ color: DS.colors.accent.warning }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                      <span className="text-sm" style={{ color: DS.colors.text.primary }}>
                        @cadmaster
                      </span>
                      <Shield size={14} style={{ color: DS.colors.primary.blue }} />
                    </div>
                  </div>
                </Card>

                {/* Top Contributors */}
                <Card padding="md" style={{ borderRadius: 0 }}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                    <Users size={18} />
                    Top Contributors
                  </h3>
                  <div className="space-y-3">
                    {topContributors.map((contributor, index) => (
                      <div key={contributor.username} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: DS.colors.text.secondary }}>
                            #{index + 1}
                          </span>
                          <span className="text-sm" style={{ color: DS.colors.text.primary }}>
                            @{contributor.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: DS.colors.text.secondary }}>
                          <span>{contributor.posts} posts</span>
                          <Badge variant="default" size="sm">{contributor.reputation}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </PanelContent>
          </RightPanel>
        )
      }
    />

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-2xl mx-4"
            style={{ backgroundColor: DS.colors.background.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{ borderColor: DS.colors.border.default }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                  Create New Thread
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-opacity-50 rounded"
                  style={{ color: DS.colors.text.secondary }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  placeholder="Enter thread title..."
                  className="w-full px-4 py-2 border rounded-none"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Category *
                </label>
                <select
                  value={newThread.category}
                  onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-none"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                >
                  <option value="general">General Discussion</option>
                  <option value="electronics">Electronics</option>
                  <option value="mechanical">Mechanical Design</option>
                  <option value="3d-printing">3D Printing</option>
                  <option value="help">Help & Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Content *
                </label>
                <textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="Write your post content here..."
                  rows={8}
                  className="w-full px-4 py-2 border rounded-none"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateThread}
                  disabled={creating || !newThread.title.trim() || !newThread.content.trim()}
                  icon={creating ? undefined : <Plus size={18} />}
                >
                  {creating ? 'Creating...' : 'Create Thread'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
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

  const authorUsername = thread.author?.username || thread.username || 'unknown';
  const replies = thread.replies || thread.reply_count || 0;
  const lastActivity = thread.lastActivity || (thread.last_activity ? formatTimeAgo(thread.last_activity) : 'Just now');
  const isPinned = thread.isPinned || thread.is_pinned || false;
  const isLocked = thread.isLocked || thread.is_locked || false;

  const profilePicture = thread.author?.avatar || '';
  
  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div 
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
        style={{ 
          backgroundColor: profilePicture ? 'transparent' : DS.colors.primary.blue,
          color: '#ffffff'
        }}
      >
        {profilePicture ? (
          <img
            src={`/api/users/profile-picture/${profilePicture}`}
            alt={authorUsername}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.backgroundColor = DS.colors.primary.blue;
                parent.textContent = authorUsername.substring(0, 2).toUpperCase();
              }
            }}
          />
        ) : (
          authorUsername.substring(0, 2).toUpperCase()
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-2">
          {isPinned && <Pin size={16} style={{ color: DS.colors.accent.warning, marginTop: '2px' }} />}
          {isLocked && <Lock size={16} style={{ color: DS.colors.text.secondary, marginTop: '2px' }} />}
          <h3 className="font-semibold flex-1" style={{ color: DS.colors.text.primary }}>
            {thread.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm flex items-center gap-1" style={{ color: DS.colors.text.secondary }}>
            <User size={14} />
            @{authorUsername}
          </span>
          {thread.author?.role === 'admin' && <Crown size={14} style={{ color: DS.colors.accent.warning }} />}
          {thread.author?.role === 'moderator' && <Shield size={14} style={{ color: DS.colors.primary.blue }} />}
          <Badge variant="default" size="sm">{thread.category || 'general'}</Badge>
        </div>

        <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.secondary }}>
          <span className="flex items-center gap-1">
            <MessageSquare size={14} />
            {replies}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {thread.views || 0}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp size={14} />
            {thread.likes || 0}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {lastActivity}
          </span>
        </div>
      </div>
    </div>
  );
}
