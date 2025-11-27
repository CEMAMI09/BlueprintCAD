'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './ui/UIComponents';
import { 
  Upload, 
  Trash2, 
  Edit, 
  GitBranch, 
  UserPlus, 
  UserMinus, 
  Shield,
  Clock,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';

interface Activity {
  id: number;
  user_id: number;
  username: string;
  avatar?: string | null;
  action: string;
  entity_type: string;
  entity_name?: string;
  details?: string;
  created_at: string;
}

interface ActivityPanelProps {
  folderId: number;
}

type ActionFilter = 'all' | 'upload' | 'delete' | 'rename' | 'branch' | 'member' | 'role';
type SortOrder = 'newest' | 'oldest';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  upload: <Upload size={16} />,
  delete: <Trash2 size={16} />,
  rename: <Edit size={16} />,
  branch_created: <GitBranch size={16} />,
  branch_renamed: <GitBranch size={16} />,
  branch_master_changed: <GitBranch size={16} />,
  branch_updated: <GitBranch size={16} />,
  branch_deleted: <GitBranch size={16} />,
  collaborator_added: <UserPlus size={16} />,
  collaborator_removed: <UserMinus size={16} />,
  role_changed: <Shield size={16} />,
  ownership_transferred: <Shield size={16} />,
};

const ACTION_LABELS: Record<string, string> = {
  upload: 'uploaded',
  delete: 'deleted',
  rename: 'renamed',
  branch_created: 'created branch',
  branch_renamed: 'renamed branch',
  branch_master_changed: 'changed master branch',
  branch_updated: 'updated branch',
  branch_deleted: 'deleted branch',
  collaborator_added: 'added collaborator',
  collaborator_removed: 'removed collaborator',
  role_changed: 'changed role',
  ownership_transferred: 'transferred ownership',
};

// Date formatting helper
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
};

export default function ActivityPanel({ folderId }: ActivityPanelProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  useEffect(() => {
    fetchActivities();
  }, [folderId, actionFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (actionFilter !== 'all') {
        if (actionFilter === 'branch') {
          params.append('entityType', 'branch');
        } else if (actionFilter === 'member') {
          params.append('entityType', 'member');
        } else if (actionFilter === 'role') {
          params.append('entityType', 'role');
        } else {
          params.append('action', actionFilter);
        }
      }

      const res = await fetch(`/api/folders/${folderId}/activity?${params.toString()}&limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Ensure we're setting all activities as an array
        if (Array.isArray(data)) {
          setActivities(data);
        } else {
          console.error('Expected array but got:', data);
          setActivities([]);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityMessage = (activity: Activity): string => {
    const username = activity.username;
    const actionLabel = ACTION_LABELS[activity.action] || activity.action;
    const entityName = activity.entity_name || 'item';
    
    let message = `${username} ${actionLabel}`;
    
    if (activity.entity_name) {
      message += ` "${entityName}"`;
    }

    // Parse details for additional context
    if (activity.details) {
      try {
        const details = JSON.parse(activity.details);
        if (details.old_name && details.new_name) {
          message += ` from "${details.old_name}" to "${details.new_name}"`;
        } else if (details.role) {
          message += ` as ${details.role}`;
        } else if (details.old_role && details.new_role) {
          message += ` from ${details.old_role} to ${details.new_role}`;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return message;
  };

  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: DS.colors.border.default }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
            <Clock size={16} />
            Activity
          </h3>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: DS.colors.background.panel,
              border: `1px solid ${DS.colors.border.default}`,
              color: DS.colors.text.primary
            }}
          >
            <option value="all">All Actions</option>
            <option value="upload">Uploads</option>
            <option value="delete">Deletes</option>
            <option value="rename">Renames</option>
            <option value="branch">Branches</option>
            <option value="member">Members</option>
            <option value="role">Roles</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="text-xs px-2 py-1 rounded flex items-center gap-1"
            style={{
              backgroundColor: DS.colors.background.panel,
              border: `1px solid ${DS.colors.border.default}`,
              color: DS.colors.text.primary
            }}
            title={`Sort by ${sortOrder === 'newest' ? 'oldest' : 'newest'}`}
          >
            <ArrowUpDown size={12} />
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm mt-2" style={{ color: DS.colors.text.tertiary }}>Loading activities...</p>
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: DS.colors.text.tertiary }}>No activities yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sortedActivities.map((activity) => (
              <Card key={activity.id} padding="sm" style={{ borderRadius: 0 }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: activity.avatar ? 'transparent' : DS.colors.primary.blue,
                      color: '#ffffff'
                    }}
                  >
                    {activity.avatar ? (
                      <img
                        src={`/api/users/profile-picture/${activity.avatar}`}
                        alt={activity.username}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.style.backgroundColor = DS.colors.primary.blue;
                            parent.textContent = activity.username.substring(0, 2).toUpperCase();
                          }
                        }}
                      />
                    ) : (
                      activity.username.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ACTION_ICONS[activity.action] && (
                        <span style={{ color: DS.colors.text.secondary }}>
                          {ACTION_ICONS[activity.action]}
                        </span>
                      )}
                      <p className="text-sm" style={{ color: DS.colors.text.primary }}>
                        {formatActivityMessage(activity)}
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                      {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

