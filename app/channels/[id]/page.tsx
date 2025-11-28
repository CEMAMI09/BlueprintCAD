/**
 * Channel Detail Page - Group Chat
 * Real-time chat interface for a channel
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Send,
  Paperclip,
  Hash,
  Users,
  Settings,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  Image as ImageIcon,
  File,
  Play,
  X,
  LogOut,
} from 'lucide-react';

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
  member_count: number;
  members: Member[];
}

interface Member {
  id: number;
  username: string;
  profile_picture: string | null;
  role: string;
  joined_at: string;
  last_read_at: string | null;
}

interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  reply_to_id: number | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  sender_username: string;
  sender_profile_picture: string | null;
  read_count: number;
  total_members: number;
  attachments: Attachment[];
}

interface Attachment {
  id: number;
  message_id: number;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  thumbnail_path: string | null;
}

export default function ChannelPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Channel] useEffect triggered, channelId:', channelId);
    fetchCurrentUser();
    fetchChannel();
    // Call fetchMessages without silent flag on initial load
    fetchMessages(false);
    
    // Poll for new messages every 2 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [channelId]);

  useEffect(() => {
    // Only scroll to bottom when new messages arrive (not on initial load)
    // Initial load is handled in fetchMessages
    if (messages.length > 0 && channel) {
      // Small delay to ensure DOM is updated
      const timeout = setTimeout(() => {
        // Only scroll if we're near the bottom (user hasn't scrolled up)
        const container = messagesEndRef.current?.parentElement?.parentElement;
        if (container) {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
          if (isNearBottom) {
            scrollToBottom(true);
          }
        }
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [messages.length]);

  const fetchCurrentUser = async () => {
    try {
      // Get user from token (decode JWT)
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.userId);
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchChannel = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/channels/${channelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setChannel(data);
        
        // Get current user ID from membership
        const myMembership = data.members?.find((m: Member) => {
          // We'll identify by checking the token
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return m.id === payload.userId;
          } catch (e) {
            return false;
          }
        });
        if (myMembership) {
          setCurrentUserId(myMembership.id);
        }
      } else if (res.status === 403) {
        // Not a member, redirect to channels list
        router.push('/messages?tab=channels');
      } else if (res.status === 404) {
        // Channel doesn't exist
        console.error('Channel not found:', channelId);
        router.push('/messages?tab=channels');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch channel' }));
        console.error('Error fetching channel:', errorData);
        router.push('/messages?tab=channels');
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
      router.push('/messages?tab=channels');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (silent = false) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/channels/${channelId}/messages?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Mark messages as read when viewing the channel (only on initial load, not on polling)
        if (!silent) {
          // Get userId from token if currentUserId isn't set yet (race condition fix)
          let userIdToUse = currentUserId;
          if (!userIdToUse && token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userIdToUse = payload.userId;
              console.log('[Channel] Extracted userId from token:', userIdToUse);
            } catch (e) {
              console.error('[Channel] Error parsing token:', e);
            }
          }
          
          if (userIdToUse) {
            console.log('[Channel] fetchMessages called with silent=false, marking as read for userId:', userIdToUse);
            
            // Update last_read_at for the channel member FIRST (this clears the badge)
            try {
              console.log(`[Channel] Calling /api/channels/${channelId}/read...`);
              const readRes = await fetch(`/api/channels/${channelId}/read`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (readRes.ok) {
                const readData = await readRes.json();
                console.log('[Channel] Channel marked as read successfully, response:', readData);
                
                // Mark all unread messages as read
                const unreadMessages = data.filter((m: Message) => 
                  m.user_id !== userIdToUse && 
                  !m.deleted_at
                );
                
                console.log(`[Channel] Marking ${unreadMessages.length} messages as read...`);
                for (const message of unreadMessages) {
                  markAsRead(message.id);
                }
                
                // Wait for database to commit, then trigger refresh multiple times
                setTimeout(() => {
                  console.log('[Channel] Triggering refresh event (1) after 500ms...');
                  window.dispatchEvent(new Event('refreshUnreadCounts'));
                }, 500);
                setTimeout(() => {
                  console.log('[Channel] Triggering refresh event (2) after 1000ms...');
                  window.dispatchEvent(new Event('refreshUnreadCounts'));
                }, 1000);
                setTimeout(() => {
                  console.log('[Channel] Triggering refresh event (3) after 2000ms...');
                  window.dispatchEvent(new Event('refreshUnreadCounts'));
                }, 2000);
              } else {
                const errorData = await readRes.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[Channel] Failed to mark channel as read:', readRes.status, errorData);
              }
            } catch (e) {
              console.error('[Channel] Error marking channel as read:', e);
            }
          } else {
            console.log('[Channel] Could not determine userId, skipping mark as read');
          }
        }
        
        // Set scroll position to bottom instantly on initial load (no animation)
        if (!silent) {
          setTimeout(() => {
            scrollToBottom(true);
          }, 150);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/channels/${channelId}/messages/${messageId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleLeaveChannel = async () => {
    if (!confirm('Are you sure you want to leave this channel?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/channels/${channelId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ member_id: currentUserId })
      });

      if (res.ok) {
        router.push('/messages?tab=channels');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to leave channel');
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
      alert('Failed to leave channel');
    }
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', messageInput.trim());
      
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessageInput('');
        setSelectedFiles([]);
        fetchMessages();
        fetchChannel(); // Update channel's last message
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to send message' }));
        console.error('Failed to send message:', errorData);
        alert(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement?.parentElement;
      if (container) {
        if (instant) {
          // Set scroll position directly to bottom (no animation)
          container.scrollTop = container.scrollHeight;
        } else {
          // Smooth scroll
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                  <p style={{ color: DS.colors.text.secondary }}>Loading channel...</p>
                </div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!channel) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p style={{ color: DS.colors.text.secondary }}>Channel not found</p>
                  <Button variant="primary" onClick={() => router.push('/channels')} className="mt-4">
                    Back to Channels
                  </Button>
                </div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <>
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          {/* Channel Header */}
          <PanelHeader
            title={
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ArrowLeft size={18} />}
                  onClick={() => router.push('/messages?tab=channels')}
                />
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: DS.colors.background.panelHover }}
                >
                  {channel.avatar_url ? (
                    <img
                      src={channel.avatar_url}
                      alt={channel.name}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <Hash size={20} style={{ color: DS.colors.text.secondary }} />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                    {channel.name}
                  </h2>
                  {channel.description && (
                    <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                      {channel.description}
                    </p>
                  )}
                </div>
              </div>
            }
            actions={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<Users size={18} />}>
                  {channel.member_count}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={<Settings size={18} />}
                  onClick={() => {
                    // TODO: Open channel settings modal
                  }}
                />
                {channel.user_role !== 'owner' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<LogOut size={16} />}
                    onClick={handleLeaveChannel}
                  >
                    Leave
                  </Button>
                )}
              </div>
            }
          />

          <PanelContent>
            <div className="flex flex-col h-full">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={(el) => {
                // Set scroll position to bottom on initial load
                if (el && messages.length > 0 && !el.dataset.scrolled) {
                  setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                    el.dataset.scrolled = 'true';
                  }, 100);
                }
              }}>
                {messages.map((message, index) => {
                  const isOwn = message.user_id === currentUserId;
                  const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
                  const isRead = message.read_count >= message.total_members;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      {showAvatar && !isOwn && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{
                            backgroundColor: message.sender_profile_picture
                              ? 'transparent'
                              : DS.colors.background.panelHover,
                            color: '#ffffff'
                          }}
                        >
                          {message.sender_profile_picture ? (
                            <img
                              src={`/api/users/profile-picture/${message.sender_profile_picture}`}
                              alt={message.sender_username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            message.sender_username.substring(0, 2).toUpperCase()
                          )}
                        </div>
                      )}
                      {!showAvatar && !isOwn && <div className="w-8" />}
                      
                      <div className={`flex-1 max-w-2xl ${isOwn ? 'flex flex-col items-end' : ''}`}>
                        {showAvatar && !isOwn && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: DS.colors.text.primary }}>
                              {message.sender_username}
                            </span>
                            <span className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                              {formatTimestamp(message.created_at)}
                            </span>
                          </div>
                        )}
                        
                        {(() => {
                          // Check if message has only images/videos (no text)
                          const hasText = message.content && message.content.trim().length > 0;
                          const hasAttachments = message.attachments && message.attachments.length > 0;
                          
                          if (hasAttachments) {
                            // Check if all attachments are images/videos
                            const allMedia = message.attachments.every((att: any) => {
                              const mimeType = (att.mime_type || '').toLowerCase();
                              const fileName = att.file_name || att.file_path || '';
                              const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                              const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
                              const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
                              return mimeType.startsWith('image/') || mimeType.startsWith('video/') || 
                                     imageExtensions.includes(fileExt) || videoExtensions.includes(fileExt);
                            });
                            
                            // If no text and only media, render without bubble
                            if (!hasText && allMedia) {
                              return (
                                <div className="space-y-2">
                                  {message.attachments.map((attachment: any) => {
                                    let filePath = attachment.file_path || '';
                                    if (filePath.startsWith('channel-attachments/')) {
                                      filePath = filePath.replace('channel-attachments/', '');
                                    }
                                    const token = localStorage.getItem('token');
                                    const fileUrl = `/api/files/channel-attachments/${encodeURIComponent(filePath)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
                                    
                                    const mimeType = (attachment.mime_type || '').toLowerCase();
                                    const fileName = attachment.file_name || attachment.file_path || '';
                                    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                                    
                                    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
                                    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
                                    
                                    const isImage = mimeType.startsWith('image/') || imageExtensions.includes(fileExt);
                                    const isVideo = mimeType.startsWith('video/') || videoExtensions.includes(fileExt);
                                    
                                    return (
                                      <div key={attachment.id} className="space-y-1">
                                        {isImage ? (
                                          <div className="rounded-lg overflow-hidden max-w-md">
                                            <img
                                              src={fileUrl}
                                              alt={attachment.file_name || 'Image'}
                                              className="max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                                              onClick={() => setLightboxImage(fileUrl)}
                                              style={{ maxHeight: '400px', objectFit: 'contain' }}
                                              onError={(e) => {
                                                console.error('Image failed to load:', fileUrl, attachment);
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        ) : isVideo ? (
                                          <div className="rounded-lg overflow-hidden max-w-md">
                                            <video
                                              src={fileUrl}
                                              controls
                                              className="max-w-full h-auto"
                                              style={{ maxHeight: '400px' }}
                                            >
                                              Your browser does not support the video tag.
                                            </video>
                                          </div>
                                        ) : null}
                                        {(isImage || isVideo) && (
                                          <div className="flex items-center gap-2 text-xs opacity-70">
                                            <span>{attachment.file_name}</span>
                                            <span>•</span>
                                            <span>{formatFileSize(attachment.file_size)}</span>
                                            <a
                                              href={fileUrl}
                                              download={attachment.file_name}
                                              className="ml-auto flex items-center gap-1 hover:opacity-100"
                                              style={{ color: DS.colors.text.secondary }}
                                            >
                                              <Download size={12} />
                                              <span>Download</span>
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    {isOwn && (
                                      isRead ? (
                                        <CheckCheck size={14} style={{ color: '#4ade80' }} />
                                      ) : (
                                        <Check size={14} style={{ opacity: 0.7 }} />
                                      )
                                    )}
                                    {!showAvatar && (
                                      <span
                                        className="text-xs ml-2"
                                        style={{ color: DS.colors.text.tertiary }}
                                      >
                                        {formatTimestamp(message.created_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          }
                          
                          // Default: render with bubble
                          return (
                            <div
                              className={`px-4 py-2 rounded-lg ${
                                isOwn ? 'rounded-tr-none' : 'rounded-tl-none'
                              }`}
                              style={{
                                backgroundColor: isOwn
                                  ? DS.colors.primary.blue
                                  : DS.colors.background.card,
                                color: isOwn ? '#ffffff' : DS.colors.text.primary,
                              }}
                            >
                              {message.content && (
                                <p className="whitespace-pre-wrap mb-2">{message.content}</p>
                              )}
                              
                              {message.attachments && message.attachments.length > 0 && (
                            <div className="space-y-2 mb-2">
                              {message.attachments.map((attachment) => {
                                // Construct file URL - handle both formats
                                let filePath = attachment.file_path || '';
                                if (filePath.startsWith('channel-attachments/')) {
                                  filePath = filePath.replace('channel-attachments/', '');
                                }
                                // Add token to URL for image/video tags that can't send headers
                                const token = localStorage.getItem('token');
                                const fileUrl = `/api/files/channel-attachments/${encodeURIComponent(filePath)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
                                
                                // Detect media type from mime_type or file extension
                                const mimeType = (attachment.mime_type || '').toLowerCase();
                                const fileName = attachment.file_name || attachment.file_path || '';
                                const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                                
                                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
                                const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
                                
                                const isImage = mimeType.startsWith('image/') || imageExtensions.includes(fileExt);
                                const isVideo = mimeType.startsWith('video/') || videoExtensions.includes(fileExt);
                                
                                return (
                                  <div key={attachment.id} className="space-y-1">
                                    {isImage ? (
                                      <div className="rounded-lg overflow-hidden max-w-md">
                                        <img
                                          src={fileUrl}
                                          alt={attachment.file_name || 'Image'}
                                          className="max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                                          onClick={() => setLightboxImage(fileUrl)}
                                          style={{ maxHeight: '400px', objectFit: 'contain' }}
                                          onError={(e) => {
                                            console.error('Image failed to load:', fileUrl, attachment);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    ) : isVideo ? (
                                      <div className="rounded-lg overflow-hidden max-w-md">
                                        <video
                                          src={fileUrl}
                                          controls
                                          className="max-w-full h-auto"
                                          style={{ maxHeight: '400px' }}
                                        >
                                          Your browser does not support the video tag.
                                        </video>
                                      </div>
                                    ) : (
                                      <div
                                        className="flex items-center gap-2 p-2 rounded"
                                        style={{
                                          backgroundColor: isOwn
                                            ? 'rgba(255,255,255,0.1)'
                                            : DS.colors.background.panelHover,
                                        }}
                                      >
                                        <File size={16} />
                                        <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                                        <span className="text-xs opacity-70">
                                          {formatFileSize(attachment.file_size)}
                                        </span>
                                        <a
                                          href={fileUrl}
                                          download={attachment.file_name}
                                          className="ml-2"
                                          style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : DS.colors.text.secondary }}
                                        >
                                          <Download size={14} />
                                        </a>
                                      </div>
                                    )}
                                    {(isImage || isVideo) && (
                                      <div className="flex items-center gap-2 text-xs opacity-70">
                                        <span>{attachment.file_name}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(attachment.file_size)}</span>
                                        <a
                                          href={fileUrl}
                                          download={attachment.file_name}
                                          className="ml-auto flex items-center gap-1 hover:opacity-100"
                                          style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : DS.colors.text.secondary }}
                                        >
                                          <Download size={12} />
                                          <span>Download</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                              <div className="flex items-center justify-end gap-1 mt-1">
                                {isOwn && (
                                  isRead ? (
                                    <CheckCheck size={14} style={{ color: '#4ade80' }} />
                                  ) : (
                                    <Check size={14} style={{ opacity: 0.7 }} />
                                  )
                                )}
                                {!showAvatar && (
                                  <span
                                    className="text-xs ml-2"
                                    style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : DS.colors.text.tertiary }}
                                  >
                                    {formatTimestamp(message.created_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="px-6 py-2 border-t" style={{ borderColor: DS.colors.border.default }}>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 rounded"
                        style={{ backgroundColor: DS.colors.background.panelHover }}
                      >
                        <File size={14} />
                        <span className="text-sm truncate max-w-xs">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-xs opacity-70 hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Paperclip size={18} />}
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
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
                  <Button
                    variant="primary"
                    icon={<Send size={18} />}
                    onClick={handleSendMessage}
                    disabled={sending || (!messageInput.trim() && selectedFiles.length === 0)}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Members" />
          <PanelContent>
            <div className="space-y-2">
              {channel.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      backgroundColor: member.profile_picture
                        ? 'transparent'
                        : DS.colors.background.panelHover,
                      color: '#ffffff'
                    }}
                  >
                    {member.profile_picture ? (
                      <img
                        src={`/api/users/profile-picture/${member.profile_picture}`}
                        alt={member.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.username.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                        {member.username}
                      </span>
                      {member.role !== 'member' && (
                        <Badge variant="secondary" size="sm">{member.role}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PanelContent>
        </RightPanel>
      }
    />
    {/* Image Lightbox */}
    {lightboxImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={() => setLightboxImage(null)}
      >
        <button
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition p-2"
          onClick={() => setLightboxImage(null)}
        >
          <X size={32} />
        </button>
        <img
          src={lightboxImage}
          alt="Full size"
          className="max-w-full max-h-full object-contain p-4"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
  </>
  );
}

