'use client';

import { useState, useEffect } from 'react';

interface Version {
  id: number;
  version_number: number;
  file_path: string;
  file_size: number;
  thumbnail_path: string | null;
  uploaded_by: number;
  uploaded_by_username: string;
  created_at: string;
  is_current: number;
  change_notes: string;
}

interface VersionHistoryProps {
  projectId: number;
  projectTitle: string;
  isOwner: boolean;
  onVersionRestored?: () => void;
}

export default function VersionHistory({ projectId, projectTitle, isOwner, onVersionRestored }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState<number | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [changeNotes, setChangeNotes] = useState('');

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
      } else {
        setError('Failed to load version history');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: number) => {
    if (!confirm('Restore this version? It will become the current version.')) return;

    try {
      setRestoring(versionId);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/restore-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ versionId })
      });

      if (res.ok) {
        await fetchVersions();
        if (onVersionRestored) onVersionRestored();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to restore version');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setRestoring(null);
    }
  };

  const handleUploadNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploadingNew(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('change_notes', changeNotes || 'Updated file');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/upload-version`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        await fetchVersions();
        setUploadFile(null);
        setChangeNotes('');
        if (onVersionRestored) onVersionRestored();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to upload new version');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setUploadingNew(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading version history...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-400">{error}</div>;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Version History</h2>
        {isOwner && (
          <span className="text-sm text-gray-400">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Upload New Version (Owner Only) */}
      {isOwner && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Upload New Version</h3>
          <form onSubmit={handleUploadNew} className="space-y-3">
            <div>
              <label className="block text-sm mb-2">Select File</label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Change Notes (Optional)</label>
              <input
                type="text"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="What changed in this version?"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={uploadingNew || !uploadFile}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingNew ? 'Uploading...' : 'Upload New Version'}
            </button>
          </form>
        </div>
      )}

      {/* Version List */}
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`p-4 rounded-lg border ${
              version.is_current
                ? 'bg-blue-900/20 border-blue-700'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">
                    Version {version.version_number}
                    {version.is_current && (
                      <span className="ml-2 text-xs px-2 py-1 bg-blue-600 rounded-full">Current</span>
                    )}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-400 mb-2">{version.change_notes}</p>
                
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Size: {formatFileSize(version.file_size)}</span>
                  <span>By: {version.uploaded_by_username}</span>
                  <span>{formatDate(version.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              {isOwner && !version.is_current && (
                <button
                  onClick={() => handleRestore(version.id)}
                  disabled={restoring === version.id}
                  className="ml-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restoring === version.id ? 'Restoring...' : 'Restore'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {versions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No version history available
        </div>
      )}
    </div>
  );
}
