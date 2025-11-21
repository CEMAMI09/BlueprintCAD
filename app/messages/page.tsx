/**
 * Messages Page - Discord Style
 * Direct messaging with thread list and conversation view
 */

'use client';

import { useState } from 'react';
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
} from 'lucide-react';

interface Conversation {
  id: string;
  user: {
    username: string;
    avatar: string;
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

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const conversations: Conversation[] = [];

  const messages: Message[] = [];

  const sharedFiles: any[] = [];

  const mutualFolders: any[] = [];

  const filteredConversations = conversations.filter(conv =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    // Send message logic here
    setMessageInput('');
  };

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
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
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
                          <div className="w-12 h-12 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
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
                  ))}
                </div>
              </div>

              {/* Conversation - CENTER */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Conversation Header */}
                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: DS.colors.border.default }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
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
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 rounded-lg border"
                          style={{
                            backgroundColor: DS.colors.background.card,
                            borderColor: DS.colors.border.default,
                            color: DS.colors.text.primary,
                          }}
                        />
                        <Button variant="ghost" size="sm" icon={<Smile size={18} />} />
                        <Button variant="primary" icon={<Send size={18} />} onClick={handleSendMessage}>
                          Send
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
                    <div className="w-20 h-20 rounded-full mb-3" style={{ backgroundColor: DS.colors.background.panelHover }} />
                    <h3 className="font-semibold text-lg mb-1" style={{ color: DS.colors.text.primary }}>
                      @{selectedConversation.user.username}
                    </h3>
                    <Badge variant={selectedConversation.user.status === 'online' ? 'success' : 'default'} size="sm">
                      {selectedConversation.user.status}
                    </Badge>
                  </div>
                  <Button variant="secondary" icon={<User size={18} />} className="w-full">
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
