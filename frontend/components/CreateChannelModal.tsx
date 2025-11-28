/**
 * Create Channel Modal
 * Modal for creating a new group chat channel
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { X, Hash, Users, Check } from 'lucide-react';
import { Button } from './ui/UIComponents';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, memberIds: number[]) => void;
}

interface User {
  id: number;
  username: string;
  profile_picture: string | null;
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  onCreate
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedMembersData, setSelectedMembersData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && searchQuery.length > 0) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, isOpen]);

  const searchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Map the response to match our User interface
        const mappedUsers = data.map((u: any) => ({
          id: u.id,
          username: u.username,
          profile_picture: u.profile_picture || u.avatar || null
        }));
        setUsers(mappedUsers.filter((u: User) => !selectedMembers.includes(u.id)));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim(), selectedMembers);
      handleClose();
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSearchQuery('');
    setSelectedMembers([]);
    setSelectedMembersData([]);
    setUsers([]);
    onClose();
  };

  const toggleMember = (user: User) => {
    const userId = user.id;
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
      setSelectedMembersData(prev => prev.filter(u => u.id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
      setSelectedMembersData(prev => [...prev, user]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
            Create Channel
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Channel Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              style={{ color: DS.colors.text.primary }}
              placeholder="e.g., Design Team"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              style={{ color: DS.colors.text.primary }}
              placeholder="What's this channel about?"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Add Members */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Add Members (optional)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none mb-2"
              style={{ color: DS.colors.text.primary }}
              placeholder="Search users by username..."
            />

            {/* Selected Members */}
            {selectedMembersData.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedMembersData.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-full"
                    style={{ backgroundColor: DS.colors.background.panelHover }}
                  >
                    <span className="text-sm" style={{ color: DS.colors.text.primary }}>
                      {member.username}
                    </span>
                    <button
                      onClick={() => toggleMember(member)}
                      className="text-xs opacity-70 hover:opacity-100"
                      style={{ color: DS.colors.text.secondary }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Results */}
            {searchQuery && users.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto" style={{ borderColor: DS.colors.border.default }}>
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleMember(user)}
                    className="w-full p-3 hover:bg-gray-800 transition flex items-center gap-3 text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        backgroundColor: user.profile_picture
                          ? 'transparent'
                          : DS.colors.background.panelHover,
                        color: '#ffffff'
                      }}
                    >
                      {user.profile_picture ? (
                        <img
                          src={`/api/users/profile-picture/${user.profile_picture}`}
                          alt={user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                      {user.username}
                    </span>
                    {selectedMembers.includes(user.id) && (
                      <Check size={16} style={{ color: DS.colors.primary.blue }} className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create Channel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

