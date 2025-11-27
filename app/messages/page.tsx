/**
 * Messages Page - Discord Style
 * Direct messaging with thread list and conversation view
 */

'use client';

import { useState, useEffect } from 'react';
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

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    fetchConversations();
    fetchFollowedUsers();
  }, [searchParams]);

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
        const targetUser = searchParams.get('with');
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

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelContent>
            <div className="flex h-full">
              {/* Thread List - LEFT SIDE INSIDE CENTER PANEL */}
              <div className="w-80 flex-shrink-0 flex flex-col border-r" style={{ borderColor: DS.colors.border.default }}>
                <div className="p-4">
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
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Show followed users when searching and no conversations match */}
                  {searchQuery && filteredFollowedUsers.length > 0 && (
                    <div className="p-2 border-b" style={{ borderColor: DS.colors.border.default }}>
                      <p className="text-xs font-semibold mb-2 px-2" style={{ color: DS.colors.text.tertiary }}>
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
                                color: '#ffffff'
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
                          backgroundColor: selectedConversation?.id === conv.id
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
                                backgroundColor: conv.user.profile_picture ? 'transparent' : DS.colors.background.panelHover,
                                color: '#ffffff'
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
                                backgroundColor: conv.user.status === 'online'
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
                              <span className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                                @{conv.user.username}
                              </span>
                              {conv.unread > 0 && (
                                <Badge variant="primary" size="sm">{conv.unread}</Badge>
                              )}
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
                  ) : !searchQuery && (
                    <div className="p-8 text-center">
                      <EmptyState
                        icon={<MessageCircle size={48} />}
                        title="No conversations"
                        description="Start a conversation with someone you follow"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Conversation - CENTER */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Conversation Header */}
                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: DS.colors.border.default }}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ 
                            backgroundColor: selectedConversation.user.profile_picture ? 'transparent' : DS.colors.background.panelHover,
                            color: '#ffffff'
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
                        <div
                          key={message.id}
                          className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className="max-w-md px-4 py-3 rounded-lg"
                            style={{
                              backgroundColor: message.isOwn
                                ? DS.colors.primary.blue
                                : DS.colors.background.card,
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
                ) : (
                  <EmptyState
                    icon={<Send size={48} />}
                    title="No conversation selected"
                    description="Choose a conversation from the list to start messaging"
                  />
                )}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        selectedConversation ? (
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
                        backgroundColor: selectedConversation.user.profile_picture ? 'transparent' : DS.colors.primary.blue,
                        color: '#ffffff'
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
                    <Badge variant={selectedConversation.user.status === 'online' ? 'success' : 'default'} size="sm">
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
  );
}
