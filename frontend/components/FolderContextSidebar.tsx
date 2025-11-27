'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Folder, Users, FileText, Plus, X, GitBranch, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface FolderInfo {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  owner_username: string;
  is_team_folder: number;
  color: string;
  member_count: number;
  project_count: number;
  user_role: string;
}

interface Branch {
  id: number;
  branch_name: string;
  is_master: number;
}

interface Note {
  id: number;
  note_text: string;
  username: string;
  avatar: string | null;
  created_at: string;
  branch_id: number | null;
  branch_name?: string;
}


interface FolderContextSidebarProps {
  projectId: string;
  folderId: number | null;
  branchId?: number | null;
  isRootFolder?: boolean;
}

export default function FolderContextSidebar({
  projectId,
  folderId,
  branchId,
  isRootFolder = false
}: FolderContextSidebarProps) {
  const [folder, setFolder] = useState<FolderInfo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'info'>('info');
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (folderId) {
      fetchFolderData();
      fetchNotes();
    }
  }, [folderId, branchId]);

  const fetchFolderData = async () => {
    if (!folderId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${folderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setFolder({
          id: data.id,
          name: data.name,
          description: data.description,
          owner_id: data.owner_id,
          owner_username: data.owner_username,
          is_team_folder: data.is_team_folder,
          color: data.color,
          member_count: data.member_count || 0,
          project_count: data.project_count || 0,
          user_role: data.user_role || 'viewer'
        });
      }

      // Fetch branches for this project
      if (projectId) {
        const branchesRes = await fetch(`/api/projects/${projectId}/branches`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (branchesRes.ok) {
          const branchesData = await branchesRes.json();
          setBranches(branchesData.branches || []);
        }
      }
    } catch (error) {
      console.error('Error fetching folder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    if (!folderId) return;

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (branchId) {
        params.append('branch_id', branchId.toString());
      } else if (projectId) {
        params.append('project_id', projectId);
      } else {
        // Fetch folder-level notes only
        params.append('folder_only', 'true');
      }

      const res = await fetch(`/api/folders/${folderId}/notes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };


  const handleAddNote = async () => {
    if (!newNote.trim() || !folderId) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${folderId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          note_text: newNote.trim(),
          branch_id: branchId || null
        })
      });

      if (res.ok) {
        setNewNote('');
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSubmitting(false);
    }
  };


  const handleDeleteNote = async (noteId: number) => {
    if (!folderId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${folderId}/notes?note_id=${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  if (!folderId || loading) {
    return null;
  }

  if (!folder) {
    return (
      <div className="p-4">
        <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
          Folder not found
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Folder Header */}
      <div className="p-4 border-b" style={{ borderColor: DS.colors.border.default }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${folder.color || DS.colors.primary.blue}22` }}
          >
            <Folder size={20} style={{ color: folder.color || DS.colors.primary.blue }} />
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/folders/${folder.id}`}
              className="font-semibold hover:underline block truncate"
              style={{ color: DS.colors.primary.blue }}
            >
              {folder.name}
            </Link>
            {isRootFolder && (
              <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                Root Folder
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: DS.colors.border.default }}>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'info' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab === 'info' ? DS.colors.primary.blue : DS.colors.text.secondary,
            borderBottomColor: activeTab === 'info' ? DS.colors.primary.blue : 'transparent'
          }}
        >
          Info
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'notes' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab === 'notes' ? DS.colors.primary.blue : DS.colors.text.secondary,
            borderBottomColor: activeTab === 'notes' ? DS.colors.primary.blue : 'transparent'
          }}
        >
          Notes
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'info' && (
          <>
            {isRootFolder ? (
              <>
                <Card padding="md">
                  <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                    Statistics
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span style={{ color: DS.colors.text.secondary }}>Projects</span>
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        {folder.project_count}
                      </span>
                    </div>
                    {folder.is_team_folder === 1 && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Members</span>
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          {folder.member_count}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {folder.is_team_folder === 1 && (
                  <Card padding="md">
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                      <Users size={16} />
                      Members
                    </h3>
                    <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                      View all members in folder settings
                    </p>
                  </Card>
                )}
              </>
            ) : (
              <Card padding="md">
                <h3 className="font-semibold mb-2 text-sm" style={{ color: DS.colors.text.primary }}>
                  Current Folder
                </h3>
                <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                  {folder.name}
                </p>
              </Card>
            )}

            {branches.length > 0 && (
              <Card padding="md">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                  <GitBranch size={16} />
                  Branches
                </h3>
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: DS.colors.text.secondary }}
                    >
                      {branch.is_master === 1 && <Star size={12} style={{ color: DS.colors.accent.warning }} />}
                      <span>{branch.branch_name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'notes' && (
          <>
            <div className="space-y-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                icon={<Plus size={14} />}
              >
                Add Note
              </Button>
            </div>

            <div className="space-y-3 mt-4">
              {notes.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: DS.colors.text.tertiary }}>
                  No notes yet
                </p>
              ) : (
                notes.map((note) => (
                  <Card key={note.id} padding="sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm mb-2" style={{ color: DS.colors.text.primary }}>
                          {note.note_text}
                        </p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: DS.colors.text.tertiary }}>
                          <span>@{note.username}</span>
                          {note.branch_name && (
                            <>
                              <span>•</span>
                              <span>{note.branch_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {(folder.user_role === 'owner' || folder.user_role === 'admin') && (
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded hover:bg-gray-800 transition-colors"
                        >
                          <Trash2 size={14} style={{ color: DS.colors.text.tertiary }} />
                        </button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

