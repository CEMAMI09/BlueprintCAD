'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from './SubscriptionGate';
import UpgradeModal from './UpgradeModal';
import {
  GitBranch,
  Upload,
  Download,
  Trash2,
  Check,
  Clock,
} from 'lucide-react';

interface FileVersion {
  id: number;
  version: string;
  file_path: string;
  file_size: number;
  created_at: string;
  created_by: string;
  description?: string;
  is_current: boolean;
}

interface FileVersioningProps {
  projectId: number;
  currentVersion: string;
  onVersionChange?: (version: FileVersion) => void;
}

export default function FileVersioning({ projectId, currentVersion, onVersionChange }: FileVersioningProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [newVersionDescription, setNewVersionDescription] = useState('');

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchVersions();
  }, [projectId]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/subscriptions/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchVersions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', newVersionDescription);

      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        await fetchVersions();
        setNewVersionDescription('');
        alert('New version uploaded successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to upload version');
      }
    } catch (error) {
      console.error('Error uploading version:', error);
      alert('Failed to upload version');
    } finally {
      setUploading(false);
    }
  };

  const handleSetCurrentVersion = async (versionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${projectId}/versions/${versionId}/set-current`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchVersions();
        const version = versions.find(v => v.id === versionId);
        if (version && onVersionChange) {
          onVersionChange(version);
        }
      }
    } catch (error) {
      console.error('Error setting current version:', error);
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('Are you sure you want to delete this version?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchVersions();
      }
    } catch (error) {
      console.error('Error deleting version:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <>
      <SubscriptionGate
        feature="fileVersioning"
        requiredTier="creator"
        showUpgradeModal={true}
        message="File versioning requires Creator subscription or higher"
      >
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
              <GitBranch size={20} />
              File Versions
            </h3>
            <label>
              <input
                type="file"
                accept=".stl,.obj,.fbx,.gltf,.glb"
                onChange={handleUploadVersion}
                className="hidden"
                disabled={uploading}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<Upload size={16} />}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload New Version'}
              </Button>
            </label>
          </div>

          {newVersionDescription && (
            <div className="mb-4">
              <input
                type="text"
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                placeholder="Version description (optional)"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: DS.colors.background.card,
                  border: `1px solid ${DS.colors.border.default}`,
                  color: DS.colors.text.primary,
                }}
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8" style={{ color: DS.colors.text.secondary }}>
              <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
              <p>No versions yet. Upload your first version to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-4 rounded-lg border flex items-center justify-between"
                  style={{
                    borderColor: version.is_current ? DS.colors.primary.blue : DS.colors.border.default,
                    backgroundColor: version.is_current ? `${DS.colors.primary.blue}10` : DS.colors.background.card,
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                        Version {version.version}
                      </span>
                      {version.is_current && (
                        <Badge variant="primary" size="sm">Current</Badge>
                      )}
                    </div>
                    {version.description && (
                      <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                        {version.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs" style={{ color: DS.colors.text.tertiary }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                      <span>{formatFileSize(version.file_size)}</span>
                      <span>by {version.created_by}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!version.is_current && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSetCurrentVersion(version.id)}
                        icon={<Check size={14} />}
                      >
                        Set Current
                      </Button>
                    )}
                    <a
                      href={`/api/projects/${projectId}/versions/${version.id}/download`}
                      download
                      className="p-2 rounded hover:bg-gray-800 transition-colors"
                    >
                      <Download size={16} style={{ color: DS.colors.text.secondary }} />
                    </a>
                    {!version.is_current && (
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="p-2 rounded hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={16} style={{ color: DS.colors.accent.error }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </SubscriptionGate>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={userSubscription?.tier || 'free'}
          featureName="fileVersioning"
          message="File versioning requires Creator subscription or higher"
        />
      )}
    </>
  );
}

