/**
 * Channels Page - Group Chat Channels List
 * List of all channels the user is a member of
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  Plus,
  Hash,
  Users,
  MessageCircle,
  Search,
  Settings,
  MoreVertical,
} from 'lucide-react';
import CreateChannelModal from '@/frontend/components/CreateChannelModal';

interface Channel {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  is_private: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  user_role: string;
  last_read_at: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  member_count: number;
}

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchChannels();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchChannels, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (name: string, description: string, memberIds: number[]) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          is_private: false,
          member_ids: memberIds
        })
      });

      if (res.ok) {
        const channel = await res.json();
        router.push(`/channels/${channel.id}`);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title={
              <div className="flex items-center gap-2">
                <Hash size={20} style={{ color: DS.colors.primary.blue }} />
                <span>Channels</span>
              </div>
            }
            actions={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setShowCreateModal(true)}
              >
                New Channel
              </Button>
            }
          />
          <PanelContent>
            <div className="flex flex-col h-full">
              {/* Search */}
              <div className="p-4 border-b" style={{ borderColor: DS.colors.border.default }}>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: DS.colors.text.tertiary }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search channels..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: DS.colors.background.card,
                      borderColor: DS.colors.border.default,
                      color: DS.colors.text.primary,
                    }}
                  />
                </div>
              </div>

              {/* Channels List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : filteredChannels.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: DS.colors.border.default }}>
                    {filteredChannels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => router.push(`/channels/${channel.id}`)}
                        className="w-full p-4 hover:bg-gray-800 transition text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: DS.colors.background.panelHover }}
                          >
                            {channel.avatar_url ? (
                              <img
                                src={channel.avatar_url}
                                alt={channel.name}
                                className="w-full h-full rounded-lg object-cover"
                              />
                            ) : (
                              <Hash size={24} style={{ color: DS.colors.text.secondary }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                                {channel.name}
                              </h3>
                              {channel.unread_count > 0 && (
                                <Badge variant="primary" size="sm">{channel.unread_count}</Badge>
                              )}
                            </div>
                            {channel.last_message && (
                              <p className="text-sm truncate mb-1" style={{ color: DS.colors.text.secondary }}>
                                {channel.last_message}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs" style={{ color: DS.colors.text.tertiary }}>
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                {channel.member_count}
                              </span>
                              {channel.last_message_at && (
                                <span>{formatTimestamp(channel.last_message_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <EmptyState
                      icon={<MessageCircle size={48} />}
                      title={searchQuery ? "No channels found" : "No channels yet"}
                      description={searchQuery ? "Try a different search term" : "Create a channel to get started"}
                    />
                  </div>
                )}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
    {showCreateModal && (
      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateChannel}
      />
    )}
    </>
  );
}

