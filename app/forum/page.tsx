/**
 * Forum Page - Reddit/Discord Hybrid
 * Community discussions with categories and filtering
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, Tabs, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/lib/ui/design-system';
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
} from 'lucide-react';

interface Thread {
  id: string;
  title: string;
  content: string;
  author: {
    username: string;
    avatar: string;
    role: 'admin' | 'moderator' | 'member';
  };
  category: string;
  replies: number;
  views: number;
  likes: number;
  lastActivity: string;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
}

export default function ForumPage() {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [activeSort, setActiveSort] = useState('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics', count: 1247 },
    { id: 'general', name: 'General Discussion', count: 456 },
    { id: 'electronics', name: 'Electronics', count: 289 },
    { id: 'mechanical', name: 'Mechanical Design', count: 234 },
    { id: '3d-printing', name: '3D Printing', count: 178 },
    { id: 'help', name: 'Help & Support', count: 90 },
  ];

  const threads: Thread[] = [];

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thread.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || thread.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (activeSort === 'hot') return b.likes - a.likes;
    if (activeSort === 'new') return b.id.localeCompare(a.id);
    if (activeSort === 'top') return b.replies - a.replies;
    return 0;
  });

  // Separate pinned threads
  const pinnedThreads = sortedThreads.filter(t => t.isPinned);
  const regularThreads = sortedThreads.filter(t => !t.isPinned);

  const topContributors: any[] = [];

  const rules = [
    'Be respectful and constructive',
    'No spam or self-promotion',
    'Stay on topic',
    'Use appropriate categories',
    'Search before posting',
  ];

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader 
            title="Community Forum"
            actions={
              <Button variant="primary" icon={<Plus size={18} />}>
                New Thread
              </Button>
            }
          />
          
          <PanelContent>
            {/* Search & Categories */}
            <div className="mb-6">
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
              <div className="mb-6">
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
                      onClick={() => setSelectedThread(thread)}
                      style={{
                        cursor: 'pointer',
                        borderColor: selectedThread?.id === thread.id ? DS.colors.primary.blue : DS.colors.border.default,
                      }}
                    >
                      <ThreadCard thread={thread} />
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Threads */}
            <div className="space-y-3">
              {regularThreads.length > 0 ? (
                regularThreads.map((thread) => (
                  <Card
                    key={thread.id}
                    hover
                    padding="md"
                    onClick={() => setSelectedThread(thread)}
                    style={{
                      cursor: 'pointer',
                      borderColor: selectedThread?.id === thread.id ? DS.colors.primary.blue : DS.colors.border.default,
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
                    <Button variant="primary" icon={<Plus size={18} />}>
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
              title="Thread Details"
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
            <PanelContent>
              <div className="space-y-6">
                {/* Author Info */}
                <Card padding="md">
                  <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Author
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          @{selectedThread.author.username}
                        </span>
                        {selectedThread.author.role === 'admin' && (
                          <Crown size={14} style={{ color: DS.colors.accent.warning }} />
                        )}
                        {selectedThread.author.role === 'moderator' && (
                          <Shield size={14} style={{ color: DS.colors.primary.blue }} />
                        )}
                      </div>
                      <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                        {selectedThread.author.role}
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" icon={<User size={18} />} className="w-full mt-3">
                    View Full Profile
                  </Button>
                </Card>

                {/* Thread Stats */}
                <Card padding="md">
                  <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Statistics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: DS.colors.text.secondary }}>
                        <MessageSquare size={16} />
                        Replies
                      </span>
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        {selectedThread.replies}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: DS.colors.text.secondary }}>
                        <Eye size={16} />
                        Views
                      </span>
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        {selectedThread.views}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: DS.colors.text.secondary }}>
                        <ThumbsUp size={16} />
                        Likes
                      </span>
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        {selectedThread.likes}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2" style={{ color: DS.colors.text.secondary }}>
                        <Clock size={16} />
                        Last Activity
                      </span>
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        {selectedThread.lastActivity}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Tags */}
                <Card padding="md">
                  <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedThread.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Related Threads */}
                <Card padding="md">
                  <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                    Related Threads
                  </h3>
                  <div className="space-y-3">
                    {threads.slice(0, 3).map((thread) => (
                      <div key={thread.id} className="text-sm">
                        <Link href={`/forum/${thread.id}`} className="hover:underline" style={{ color: DS.colors.primary.blue }}>
                          {thread.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1" style={{ color: DS.colors.text.secondary }}>
                          <span>{thread.replies} replies</span>
                          <span>•</span>
                          <span>{thread.views} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </PanelContent>
          </RightPanel>
        ) : (
          <RightPanel>
            <PanelHeader title="Forum Info" />
            <PanelContent>
              <div className="space-y-6">
                {/* Rules */}
                <Card padding="md">
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
                <Card padding="md">
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
                <Card padding="md">
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
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: DS.colors.background.panelHover }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-2">
          {thread.isPinned && <Pin size={16} style={{ color: DS.colors.accent.warning, marginTop: '2px' }} />}
          {thread.isLocked && <Lock size={16} style={{ color: DS.colors.text.secondary, marginTop: '2px' }} />}
          <h3 className="font-semibold flex-1" style={{ color: DS.colors.text.primary }}>
            {thread.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm flex items-center gap-1" style={{ color: DS.colors.text.secondary }}>
            <User size={14} />
            @{thread.author.username}
          </span>
          {thread.author.role === 'admin' && <Crown size={14} style={{ color: DS.colors.accent.warning }} />}
          {thread.author.role === 'moderator' && <Shield size={14} style={{ color: DS.colors.primary.blue }} />}
          <Badge variant="default" size="sm">{thread.category}</Badge>
        </div>

        <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.secondary }}>
          <span className="flex items-center gap-1">
            <MessageSquare size={14} />
            {thread.replies}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {thread.views}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp size={14} />
            {thread.likes}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {thread.lastActivity}
          </span>
        </div>
      </div>
    </div>
  );
}