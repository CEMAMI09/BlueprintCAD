'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Textarea, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { X, GitBranch, Trash2, Edit2, Star, Upload, Plus } from 'lucide-react';

interface Branch {
  id: number;
  branch_name: string;
  file_path: string;
  description: string | null;
  is_master: number;
  created_by: number;
  created_by_username: string;
  created_at: string;
}

interface BranchManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  folderId: string;
  onBranchChange?: () => void;
}

export default function BranchManagementModal({
  isOpen,
  onClose,
  projectId,
  folderId,
  onBranchChange
}: BranchManagementModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDescription, setNewBranchDescription] = useState('');
  const [newBranchFile, setNewBranchFile] = useState<File | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchBranches();
    }
  }, [isOpen, projectId]);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch branches');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !newBranchFile) {
      setError('Branch name and file are required');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('branch_name', newBranchName.trim());
      formData.append('description', newBranchDescription);
      formData.append('is_master', isMaster ? 'true' : 'false');
      formData.append('file', newBranchFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/branches`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setShowCreateForm(false);
        setNewBranchName('');
        setNewBranchDescription('');
        setNewBranchFile(null);
        setIsMaster(false);
        await fetchBranches();
        onBranchChange?.();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create branch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSetMaster = async (branchId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/branches`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: branchId,
          is_master: true
        })
      });

      if (res.ok) {
        await fetchBranches();
        // Call onBranchChange to refresh folder data
        if (onBranchChange) {
          onBranchChange();
        }
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to set master branch');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRename = async (branch: Branch, newName: string) => {
    if (!newName.trim() || newName === branch.branch_name) {
      setEditingBranch(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/branches`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: branch.id,
          branch_name: newName.trim()
        })
      });

      if (res.ok) {
        setEditingBranch(null);
        await fetchBranches();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to rename branch');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (branchId: number) => {
    const branch = branches.find(b => b.id === branchId);
    const isMaster = branch?.is_master === 1;
    const message = isMaster 
      ? 'Are you sure you want to delete the master branch? The most recent branch will become the new master. This action cannot be undone.'
      : 'Are you sure you want to delete this branch? This action cannot be undone.';
    
    if (!confirm(message)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/branches?branch_id=${branchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchBranches();
        onBranchChange?.();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete branch');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border"
        style={{
          backgroundColor: DS.colors.background.card,
          borderColor: DS.colors.border.default,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-6 border-b"
          style={{ borderColor: DS.colors.border.default, backgroundColor: DS.colors.background.card }}>
          <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
            Branch Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: DS.colors.text.secondary }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${DS.colors.accent.error}22` }}>
              <p className="text-sm" style={{ color: DS.colors.accent.error }}>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>Branches</h3>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowCreateForm(true)}
            >
              New Branch
            </Button>
          </div>

          {showCreateForm && (
            <Card padding="md">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                    Branch Name *
                  </label>
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g., prototype, v2, production"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                    Description
                  </label>
                  <Textarea
                    value={newBranchDescription}
                    onChange={(e) => setNewBranchDescription(e.target.value)}
                    placeholder="Describe this branch..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                    File *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setNewBranchFile(e.target.files?.[0] || null)}
                    className="w-full p-2 rounded-lg border"
                    style={{
                      backgroundColor: DS.colors.background.panel,
                      borderColor: DS.colors.border.default,
                      color: DS.colors.text.primary
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMaster"
                    checked={isMaster}
                    onChange={(e) => setIsMaster(e.target.checked)}
                  />
                  <label htmlFor="isMaster" className="text-sm" style={{ color: DS.colors.text.secondary }}>
                    Set as master branch (this will be shown in the folder)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={handleCreateBranch}
                    disabled={uploading || !newBranchName.trim() || !newBranchFile}
                  >
                    {uploading ? 'Creating...' : 'Create Branch'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewBranchName('');
                      setNewBranchDescription('');
                      setNewBranchFile(null);
                      setIsMaster(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch size={48} className="mx-auto mb-4" style={{ color: DS.colors.text.tertiary }} />
              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                No branches yet. Create your first branch to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {branches.map((branch) => (
                <Card key={branch.id} padding="md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {editingBranch?.id === branch.id ? (
                          <Input
                            value={editingBranch.branch_name}
                            onChange={(e) => setEditingBranch({ ...editingBranch, branch_name: e.target.value })}
                            onBlur={() => handleRename(branch, editingBranch.branch_name)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRename(branch, editingBranch.branch_name);
                              } else if (e.key === 'Escape') {
                                setEditingBranch(null);
                              }
                            }}
                            autoFocus
                            className="flex-1"
                          />
                        ) : (
                          <>
                            <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                              {branch.branch_name}
                            </h4>
                            {branch.is_master === 1 && (
                              <Badge variant="primary" size="sm">
                                <Star size={12} className="mr-1" />
                                Master
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      {branch.description && (
                        <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                          {branch.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs" style={{ color: DS.colors.text.tertiary }}>
                        <span>Created by @{branch.created_by_username}</span>
                        <span>•</span>
                        <span>{new Date(branch.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {branch.is_master === 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Star size={14} />}
                          onClick={() => handleSetMaster(branch.id)}
                          title="Set as master"
                        />
                      ) : (
                        <Badge variant="primary" size="sm" style={{ cursor: 'default' }}>
                          <Star size={12} className="mr-1" />
                          Master
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit2 size={14} />}
                        onClick={() => setEditingBranch(branch)}
                        title="Rename"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleDelete(branch.id)}
                        title={branch.is_master === 1 ? "Delete master branch (most recent will become master)" : "Delete branch"}
                        style={{ color: branch.is_master === 1 ? DS.colors.accent.error : undefined }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

