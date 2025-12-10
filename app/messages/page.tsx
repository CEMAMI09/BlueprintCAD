/**
 * Messages Page - Discord Style
 * Direct messaging with thread list and conversation view
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import {
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  User,
  File,
  Folder,
  Calendar,
  Users,
  Pin,
  Paperclip,
  Smile,
  MessageCircle,
  Store,
  Hash,
  Plus,
} from 'lucide-react';

interface Conversation {
  id: string;
  user: {
    username: string;
    avatar: string;
    profile_picture?: string | null;
    status: 'online' | 'offline' | 'away';
  };
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

interface FollowedUser {
  id: number;
  username: string;
  profile_picture: string | null;
  bio: string | null;
}

interface Channel {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  member_count: number;
  last_message: string | null;
  last_message_time: string | null;
  user_role: 'owner' | 'admin' | 'member';
}

interface ChannelMessage {
  id: number;
  channel_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  username: string;
  profile_picture: string | null;
}

type MessageTab = 'direct' | 'channels' | 'storefront';

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<MessageTab>('direct');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sharedFiles] = useState<any[]>([]);
  const [mutualFolders] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');
  const [storefrontConfigured, setStorefrontConfigured] = useState<boolean | null>(null);
  const [storefrontLoading, setStorefrontLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([]);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [followers, setFollowers] = useState<FollowedUser[]>([]);
  const [mutualContacts, setMutualContacts] = useState<FollowedUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'direct') {
      fetchConversations();
      fetchFollowedUsers();
    } else if (activeTab === 'channels') {
      fetchChannels();
    } else if (activeTab === 'storefront') {
      checkStorefrontStatus();
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  useEffect(() => {
    if (showCreateChannelModal) {
      if (!followers.length) fetchFollowers();
      if (!followedUsers.length) fetchFollowedUsers();
    }
  }, [showCreateChannelModal]);

  useEffect(() => {
    if (followedUsers.length && followers.length) {
      const followerIds = new Set(followers.map(f => f.id));
      const mutual = followedUsers.filter(f => followerIds.has(f.id));
      setMutualContacts(mutual);
    }
  }, [followedUsers, followers]);

  const checkStorefrontStatus = async () => {
    setStorefrontLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/storefront', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStorefrontConfigured(data !== null && data.store_name !== null);
      }
    } catch (error) {
      console.error('Error checking storefront status:', error);
      setStorefrontConfigured(false);
    } finally {
      setStorefrontLoading(false);
    }
  };

  const fetchConversations = async (withUser?: string | null) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const convs = data.map((c: any) => ({
          id: c.id?.toString() || `${c.other_user_id}`,
          user: {
            username: c.other_username,
            avatar: '',
            profile_picture: c.other_profile_picture || null,
            status: 'offline' as const,
          },
          lastMessage: c.content || '',
          timestamp: c.created_at || '',
          unread: c.unread_count || 0,
        }));
        setConversations(convs);
        
        // Check if there's a ?with=username parameter after loading conversations
        const targetUser = searchParams?.get('with') || null;
        if (targetUser) {
          const existingConv = convs.find((c: Conversation) => c.user.username === targetUser);
          if (existingConv) {
            setSelectedConversation(existingConv);
            fetchMessages(targetUser);
          } else {
            // Create a new conversation entry
            // Fetch user profile to get profile picture
            const userRes = await fetch(`/api/users/${targetUser}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            let profilePicture = null;
            if (userRes.ok) {
              const userData = await userRes.json();
              profilePicture = userData.profile_picture || null;
            }
            
            const newConv: Conversation = {
              id: `new-${targetUser}`,
              user: {
                username: targetUser,
                avatar: '',
                profile_picture: profilePicture,
                status: 'offline',
              },
              lastMessage: '',
              timestamp: '',
              unread: 0,
            };
            setSelectedConversation(newConv);
            fetchMessages(targetUser);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/following-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowedUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching followed users:', error);
    }
  };

  const fetchFollowers = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser?.username) return;
      const res = await fetch(`/api/users/${currentUser.username}/followers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.followers) ? data.followers : [];
        const mapped = list.map((f: any) => ({
          id: f.id,
          username: f.username,
          profile_picture: f.profile_picture || null,
          bio: f.bio || null,
        })) as FollowedUser[];
        setFollowers(mapped);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchMessages = async (username: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const msgs = data.map((m: any) => ({
          id: m.id.toString(),
          sender: m.sender_username,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString(),
          isOwn: m.sender_username === currentUser.username,
        }));
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.user.username);
  };

  const handleStartNewConversation = async (username: string) => {
    // Find the user in followedUsers to get their profile picture
    const user = followedUsers.find(u => u.username === username);
    
    const newConv: Conversation = {
      id: `new-${username}`,
      user: {
        username,
        avatar: '',
        profile_picture: user?.profile_picture || null,
        status: 'offline',
      },
      lastMessage: '',
      timestamp: '',
      unread: 0,
    };
    setSelectedConversation(newConv);
    setSearchQuery('');
    fetchMessages(username);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_username: selectedConversation.user.username,
          content: messageInput.trim(),
        }),
      });

      if (res.ok) {
        setMessageInput('');
        // Refresh messages
        fetchMessages(selectedConversation.user.username);
        // Refresh conversations
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFollowedUsers = followedUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !conversations.some(conv => conv.user.username === user.username)
  );

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
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDescription.trim() || null,
          member_ids: selectedMemberIds,
        }),
      });

      if (res.ok) {
        const channel = await res.json();
        setChannels([...channels, channel]);
        setShowCreateChannelModal(false);
        setNewChannelName('');
        setNewChannelDescription('');
        setSelectedMemberIds([]);
        setSelectedChannel(channel);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const toggleMemberSelection = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const fetchChannelMessages = async (channelId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setChannelMessages(data);
      }
    } catch (error) {
      console.error('Error fetching channel messages:', error);
    }
  };

  const handleSendChannelMessage = async () => {
    if (!selectedChannel || !messageInput.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/channels/${selectedChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: messageInput.trim(),
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setChannelMessages([...channelMessages, newMessage]);
        setMessageInput('');
        fetchChannels(); // Refresh to update last message
      }
    } catch (error) {
      console.error('Error sending channel message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredChannels = channels.filter((channel) => {
    return channel.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            {/* Tabs - Fixed at top */}
            <div
              className="flex-shrink-0 flex border-b"
              style={{
                borderColor: DS.colors.border.default,
                backgroundColor: DS.colors.background.panel,
              }}
            >
              <button
                onClick={() => {
                  setActiveTab('direct');
                  setSelectedConversation(null);
                }}
                className="px-6 py-3 font-medium text-sm transition-colors relative hover:opacity-80"
                style={{
                  color: activeTab === 'direct' ? DS.colors.text.primary : DS.colors.text.secondary,
                  borderBottom:
                    activeTab === 'direct' ? `2px solid ${DS.colors.primary.blue}` : '2px solid transparent',
                  backgroundColor: activeTab === 'direct' ? DS.colors.background.card : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} />
                  Direct Messages
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('channels');
                  setSelectedConversation(null);
                }}
                className="px-6 py-3 font-medium text-sm transition-colors relative hover:opacity-80"
                style={{
                  color: activeTab === 'channels' ? DS.colors.text.primary : DS.colors.text.secondary,
                  borderBottom:
                    activeTab === 'channels' ? `2px solid ${DS.colors.primary.blue}` : '2px solid transparent',
                  backgroundColor: activeTab === 'channels' ? DS.colors.background.card : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <Hash size={18} />
                  Channels
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('storefront');
                  setSelectedConversation(null);
                }}
                className="px-6 py-3 font-medium text-sm transition-colors relative hover:opacity-80"
                style={{
                  color: activeTab === 'storefront' ? DS.colors.text.primary : DS.colors.text.secondary,
                  borderBottom:
                    activeTab === 'storefront' ? `2px solid ${DS.colors.primary.blue}` : '2px solid transparent',
                  backgroundColor: activeTab === 'storefront' ? DS.colors.background.card : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <Store size={18} />
                  Storefront Inquiries
                </div>
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Thread List - LEFT SIDE INSIDE CENTER PANEL */}
              <div
                className="w-80 flex-shrink-0 flex flex-col border-r overflow-hidden"
                style={{ borderColor: DS.colors.border.default }}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full px-4 py-3 rounded-lg border"
                      style={{
                        backgroundColor: DS.colors.background.card,
                        borderColor: DS.colors.border.default,
                        color: DS.colors.text.primary,
                      }}
                    />
                    {activeTab === 'channels' && (
                      <Button
                        variant="primary"
                        icon={<Plus size={18} />}
                        className="shrink-0 px-3"
                        onClick={() => setShowCreateChannelModal(true)}
                        aria-label="Create channel"
                      />
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Tab-specific content */}
                  {activeTab === 'direct' && (
                    <>
                      {/* Show followed users when searching and no conversations match */}
                      {searchQuery && filteredFollowedUsers.length > 0 && (
                        <div className="p-2 border-b" style={{ borderColor: DS.colors.border.default }}>
                          <p
                            className="text-xs font-semibold mb-2 px-2"
                            style={{ color: DS.colors.text.tertiary }}
                          >
                            Start new conversation
                          </p>
                          {filteredFollowedUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleStartNewConversation(user.username)}
                              className="w-full p-3 text-left transition-colors rounded-lg mb-1 hover:opacity-80"
                              style={{
                                backgroundColor: DS.colors.background.panelHover,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                  style={{
                                    backgroundColor: user.profile_picture ? 'transparent' : DS.colors.primary.blue,
                                    color: '#ffffff',
                                  }}
                                >
                                  {user.profile_picture ? (
                                    <img
                                      src={`/api/users/profile-picture/${user.profile_picture}`}
                                      alt={user.username}
                                      className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                          parent.style.backgroundColor = DS.colors.primary.blue;
                                          parent.textContent = user.username.substring(0, 2).toUpperCase();
                                        }
                                      }}
                                    />
                                  ) : (
                                    user.username.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                                      @{user.username}
                                    </span>
                                    <MessageCircle size={14} style={{ color: DS.colors.text.tertiary }} />
                                  </div>
                                  {user.bio && (
                                    <p className="text-xs truncate mt-1" style={{ color: DS.colors.text.secondary }}>
                                      {user.bio}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Existing conversations */}
                      {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className="w-full p-4 text-left transition-colors border-b"
                            style={{
                              backgroundColor:
                                selectedConversation?.id === conv.id
                                  ? DS.colors.background.panelHover
                                  : 'transparent',
                              borderColor: DS.colors.border.default,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                  style={{
                                    backgroundColor: conv.user.profile_picture
                                      ? 'transparent'
                                      : DS.colors.background.panelHover,
                                    color: '#ffffff',
                                  }}
                                >
                                  {conv.user.profile_picture ? (
                                    <img
                                      src={`/api/users/profile-picture/${conv.user.profile_picture}`}
                                      alt={conv.user.username}
                                      className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                          parent.style.backgroundColor = DS.colors.background.panelHover;
                                          parent.textContent = conv.user.username.substring(0, 2).toUpperCase();
                                        }
                                      }}
                                    />
                                  ) : (
                                    conv.user.username.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div
                                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                                  style={{
                                    backgroundColor:
                                      conv.user.status === 'online'
                                        ? DS.colors.accent.success
                                        : conv.user.status === 'away'
                                        ? DS.colors.accent.warning
                                        : DS.colors.text.secondary,
                                    borderColor: DS.colors.background.card,
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span
                                    className="font-semibold truncate"
                                    style={{ color: DS.colors.text.primary }}
                                  >
                                    @{conv.user.username}
                                  </span>
                                  {conv.unread > 0 && <Badge variant="primary" size="sm">{conv.unread}</Badge>}
                                </div>
                                <p className="text-sm truncate" style={{ color: DS.colors.text.secondary }}>
                                  {conv.lastMessage}
                                </p>
                                <span className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                  {conv.timestamp}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        !searchQuery && (
                          <div className="p-8 text-center">
                            <EmptyState
                              icon={<MessageCircle size={48} />}
                              title="No conversations"
                              description="Start a conversation with someone you follow"
                            />
                          </div>
                        )
                      )}
                    </>
                  )}

                  {activeTab === 'channels' && (
                    <div className="p-8 text-center">
                      <EmptyState
                        icon={<Hash size={48} />}
                        title="No channels yet"
                        description="Group channels and team chats coming soon"
                      />
                    </div>
                  )}

                  {activeTab === 'storefront' && (
                    <>
                      {storefrontLoading ? (
                        <div className="p-8 text-center">
                          <p style={{ color: DS.colors.text.secondary }}>Loading...</p>
                        </div>
                      ) : storefrontConfigured ? (
                        <div className="p-8 text-center">
                          <EmptyState
                            icon={<Store size={48} />}
                            title="No storefront inquiries"
                            description="Messages from customers who contact you via your storefront will appear here"
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <EmptyState
                            icon={<Store size={48} />}
                            title="Storefront not configured"
                            description="Set up your storefront to receive messages from potential customers"
                          />
                          <div className="mt-6">
                            <Button
                              variant="primary"
                              icon={<Store size={18} />}
                              onClick={() => router.push('/storefront')}
                            >
                              Configure Storefront
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Conversation - CENTER */}
              <div className="flex-1 flex flex-col">
                {activeTab === 'direct' && selectedConversation ? (
                  <>
                    {/* Conversation Header */}
                    <div
                      className="p-4 border-b flex items-center justify-between"
                      style={{ borderColor: DS.colors.border.default }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{
                            backgroundColor: selectedConversation.user.profile_picture
                              ? 'transparent'
                              : DS.colors.background.panelHover,
                            color: '#ffffff',
                          }}
                        >
                          {selectedConversation.user.profile_picture ? (
                            <img
                              src={`/api/users/profile-picture/${selectedConversation.user.profile_picture}`}
                              alt={selectedConversation.user.username}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.style.backgroundColor = DS.colors.background.panelHover;
                                  parent.textContent = selectedConversation.user.username.substring(0, 2).toUpperCase();
                                }
                              }}
                            />
                          ) : (
                            selectedConversation.user.username.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                            @{selectedConversation.user.username}
                          </h3>
                          <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                            {selectedConversation.user.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" icon={<Phone size={18} />} />
                        <Button variant="ghost" size="sm" icon={<Video size={18} />} />
                        <Button variant="ghost" size="sm" icon={<MoreVertical size={18} />} />
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className="max-w-md px-4 py-3 rounded-lg"
                            style={{
                              backgroundColor: message.isOwn ? DS.colors.primary.blue : DS.colors.background.card,
                              color: message.isOwn ? '#ffffff' : DS.colors.text.primary,
                            }}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <span
                              className="text-xs mt-1 block"
                              style={{ color: message.isOwn ? 'rgba(255,255,255,0.7)' : DS.colors.text.secondary }}
                            >
                              {message.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" icon={<Paperclip size={18} />} />
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 rounded-lg border"
                          disabled={sending}
                          style={{
                            backgroundColor: DS.colors.background.card,
                            borderColor: DS.colors.border.default,
                            color: DS.colors.text.primary,
                            opacity: sending ? 0.6 : 1,
                          }}
                        />
                        <Button variant="ghost" size="sm" icon={<Smile size={18} />} />
                        <Button
                          variant="primary"
                          icon={<Send size={18} />}
                          onClick={handleSendMessage}
                          disabled={sending || !messageInput.trim()}
                        >
                          {sending ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : activeTab === 'direct' ? (
                  <EmptyState
                    icon={<Send size={48} />}
                    title="No conversation selected"
                    description="Choose a conversation from the list to start messaging"
                  />
                ) : activeTab === 'channels' ? (
                  <EmptyState
                    icon={<Hash size={48} />}
                    title="No channel selected"
                    description="Choose a channel from the list to view messages"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <EmptyState
                      icon={<MessageCircle size={48} />}
                      title="Select a conversation"
                      description="Choose an inquiry to view messages"
                    />
                  </div>
                )}
              </div>
            </div>
          </CenterPanel>
        }
        rightPanel={
          activeTab === 'channels' && selectedChannel ? (
            <RightPanel>
              <PanelHeader title="Channel Info" />
              <PanelContent>
                <div className="space-y-6">
                  <Card padding="md">
                    <div className="flex flex-col items-center text-center mb-4">
                      <div
                        className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-xl font-bold"
                        style={{
                          backgroundColor: DS.colors.primary.blue,
                          color: '#ffffff',
                        }}
                      >
                        <Hash size={32} />
                      </div>
                      <h3 className="font-semibold text-lg" style={{ color: DS.colors.text.primary }}>
                        {selectedChannel.name}
                      </h3>
                      {selectedChannel.description && (
                        <p className="text-sm mt-2" style={{ color: DS.colors.text.secondary }}>
                          {selectedChannel.description}
                        </p>
                      )}
                    </div>
                    <div className="border-t pt-4" style={{ borderColor: DS.colors.border.default }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          Members
                        </span>
                        <span className="text-sm font-semibold" style={{ color: DS.colors.text.primary }}>
                          {selectedChannel.member_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                          Your Role
                        </span>
                        <Badge variant="secondary">{selectedChannel.user_role}</Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              </PanelContent>
            </RightPanel>
          ) : activeTab === 'direct' && selectedConversation ? (
            <RightPanel>
              <PanelHeader title="User Info" />
              <PanelContent>
                <div className="space-y-6">
                  {/* User Profile */}
                  <Card padding="md">
                    <div className="flex flex-col items-center text-center mb-4">
                      <div
                        className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-xl font-bold"
                        style={{
                          backgroundColor: selectedConversation.user.profile_picture
                            ? 'transparent'
                            : DS.colors.primary.blue,
                          color: '#ffffff',
                        }}
                      >
                        {selectedConversation.user.profile_picture ? (
                          <img
                            src={`/api/users/profile-picture/${selectedConversation.user.profile_picture}`}
                            alt={selectedConversation.user.username}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.style.backgroundColor = DS.colors.primary.blue;
                                parent.textContent = selectedConversation.user.username.substring(0, 2).toUpperCase();
                              }
                            }}
                          />
                        ) : (
                          selectedConversation.user.username.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-1" style={{ color: DS.colors.text.primary }}>
                        @{selectedConversation.user.username}
                      </h3>
                      <Badge
                        variant={selectedConversation.user.status === 'online' ? 'success' : 'default'}
                        size="sm"
                      >
                        {selectedConversation.user.status}
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      icon={<User size={18} />}
                      className="w-full"
                      onClick={() => router.push(`/profile/${selectedConversation.user.username}`)}
                    >
                      View Profile
                    </Button>
                  </Card>

                  {/* Shared Files */}
                  <Card padding="md">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                      <File size={18} />
                      Shared Files
                    </h3>
                    <div className="space-y-2">
                      {sharedFiles.map((file) => (
                        <div
                          key={file.name}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: DS.colors.background.panelHover }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File size={16} style={{ color: DS.colors.primary.blue }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: DS.colors.text.primary }}>
                                {file.name}
                              </p>
                              <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                {file.size} • {file.date}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Mutual Folders */}
                  <Card padding="md">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                      <Folder size={18} />
                      Mutual Folders
                    </h3>
                    <div className="space-y-2">
                      {mutualFolders.map((folder) => (
                        <div
                          key={folder.name}
                          className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: DS.colors.background.panelHover }}
                        >
                          <div className="flex items-center gap-2">
                            <Folder size={16} style={{ color: DS.colors.accent.warning }} />
                            <span className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                              {folder.name}
                            </span>
                          </div>
                          <Badge variant="default" size="sm">{folder.files} files</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </PanelContent>
            </RightPanel>
          ) : null
        }
      />

      {showCreateChannelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShowCreateChannelModal(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-lg"
            style={{
              backgroundColor: DS.colors.background.panel,
              border: `1px solid ${DS.colors.border.default}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
              Create New Channel
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Channel Name *
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., Team Chat, Project Discussion"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: DS.colors.background.card,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Description (optional)
                </label>
                <textarea
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: DS.colors.background.card,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                    Add members (mutual follows)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!followers.length) fetchFollowers();
                      if (!followedUsers.length) fetchFollowedUsers();
                    }}
                  >
                    Refresh
                  </Button>
                </div>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search followers..."
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: DS.colors.background.card,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                />
                {mutualContacts.length === 0 ? (
                  <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                    No mutual followers found. You can still create the channel now and invite later.
                  </p>
                ) : (
                  <div
                    className="max-h-56 overflow-y-auto space-y-2 border rounded-lg p-3"
                    style={{ borderColor: DS.colors.border.default }}
                  >
                    {mutualContacts
                      .filter((user) =>
                        user.username.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:opacity-80 cursor-pointer"
                          style={{ backgroundColor: DS.colors.background.panelHover }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(user.id)}
                            onChange={() => toggleMemberSelection(user.id)}
                          />
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                              style={{
                                backgroundColor: user.profile_picture ? 'transparent' : DS.colors.primary.blue,
                                color: '#ffffff',
                              }}
                            >
                              {user.profile_picture ? (
                                <img
                                  src={`/api/users/profile-picture/${user.profile_picture}`}
                                  alt={user.username}
                                  className="w-full h-full rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.style.backgroundColor = DS.colors.primary.blue;
                                      parent.textContent = user.username.substring(0, 2).toUpperCase();
                                    }
                                  }}
                                />
                              ) : (
                                user.username.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                                  @{user.username}
                                </span>
                                <Badge variant="default" size="sm">mutual</Badge>
                              </div>
                              {user.bio && (
                                <p className="text-xs truncate" style={{ color: DS.colors.text.secondary }}>
                                  {user.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateChannelModal(false);
                  setNewChannelName('');
                  setNewChannelDescription('');
                  setSelectedMemberIds([]);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={createChannel} disabled={!newChannelName.trim()}>
                Create Channel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400 text-sm">Loading messages...</p>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
