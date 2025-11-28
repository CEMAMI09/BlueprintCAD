/**
 * Public Share Link Viewer Page
 * Displays shared files and folders without requiring authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Button, Card, EmptyState } from '@/components/ui/UIComponents';
import { Lock, Download, Eye, FileText, Folder, ArrowLeft, X, Copy } from 'lucide-react';
import ThreeDViewer from '@/frontend/components/ThreeDViewer';
import Link from 'next/link';

export default function ShareLinkViewer() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchShareData();
    }
  }, [token]);

  const fetchShareData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const url = `/api/share/${token}/access${password ? `?password=${encodeURIComponent(password)}` : ''}`;
      const res = await fetch(url);

      if (res.status === 401) {
        const data = await res.json();
        if (data.requires_password) {
          setPasswordRequired(true);
          setLoading(false);
          return;
        }
        setPasswordError(data.error || 'Incorrect password');
        setLoading(false);
        return;
      }

      if (res.status === 410) {
        setError('This share link has expired.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load shared content');
        setLoading(false);
        return;
      }

      const data = await res.json();
      
      // Handle project share links
      if (data.entity_type === 'project') {
        // If public design, redirect to normal design page
        if (data.is_public) {
          router.push(`/project/${data.entity.id}`);
          return;
        }
        
        // For private designs, show the custom share viewer
        setShareData(data);
        setPasswordRequired(false);
        setPasswordError('');
      } else {
        // For folders, keep the current viewer (or redirect to folder page)
        setShareData(data);
        setPasswordRequired(false);
        setPasswordError('');
      }
    } catch (error) {
      console.error('Fetch share data error:', error);
      setError('Failed to load shared content');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    fetchShareData();
  };

  const handleDownload = async () => {
    if (!shareData?.entity?.file_path || shareData?.share_link?.download_blocked) {
      return;
    }

    try {
      // Use the project download endpoint which handles share tokens and sets proper download headers
      const projectId = shareData.entity.id;
      const url = `/api/projects/${projectId}/download?share_token=${token}`;
      const res = await fetch(url);
      
      if (res.ok) {
        // Get the filename from Content-Disposition header or use the project title
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = shareData.entity.title || 'file';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Ensure filename has the correct extension
        const filePath = shareData.entity.file_path || '';
        const fileExtension = shareData.entity.file_type || (filePath.includes('.') ? filePath.split('.').pop() : '');
        if (fileExtension && !filename.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`)) {
          filename = `${filename}${fileExtension.startsWith('.') ? '' : '.'}${fileExtension}`;
        }
        
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DS.colors.background.default }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: DS.colors.text.secondary }}>Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: DS.colors.background.default }}>
        <Card padding="lg" className="max-w-md w-full text-center">
          <X size={48} className="mx-auto mb-4" style={{ color: DS.colors.accent.error }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>Error</h1>
          <p className="mb-6" style={{ color: DS.colors.text.secondary }}>{error}</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: DS.colors.background.default }}>
        <Card padding="lg" className="max-w-md w-full">
          <div className="text-center mb-6">
            <Lock size={48} className="mx-auto mb-4" style={{ color: DS.colors.primary.blue }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>Password Required</h1>
            <p style={{ color: DS.colors.text.secondary }}>This shared link is protected by a password.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                style={{ color: DS.colors.text.primary }}
                placeholder="Enter password"
                required
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-400">{passwordError}</p>
            )}
            <Button type="submit" variant="primary" fullWidth>
              Access Content
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  const { entity, entity_type, share_link } = shareData;

  return (
    <div className="min-h-screen" style={{ background: DS.colors.background.default }}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: DS.colors.border.default }}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={18} />}
              onClick={() => router.push('/')}
            />
            {entity_type === 'folder' ? (
              <>
                <Folder size={20} style={{ color: DS.colors.primary.blue }} />
                <span className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>{entity.name}</span>
              </>
            ) : (
              <>
                <FileText size={20} style={{ color: DS.colors.primary.blue }} />
                <span className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>{entity.title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {share_link?.view_only && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: DS.colors.background.panelHover, color: DS.colors.text.secondary }}>
                <Eye size={14} className="inline mr-1" />
                View Only
              </span>
            )}
            {share_link?.download_blocked && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: DS.colors.background.panelHover, color: DS.colors.text.secondary }}>
                <Download size={14} className="inline mr-1" />
                Downloads Disabled
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
              {entity_type === 'project' ? (
                <div className="space-y-6">
                  {/* Project Viewer */}
                  <Card padding="lg">
                    {entity.file_path && (
                      <ThreeDViewer
                        fileUrl={`/api/files/${encodeURIComponent(entity.file_path)}?share_token=${token}`}
                        fileType={entity.file_type}
                        fileName={entity.title}
                        preset="detail"
                      />
                    )}
                  </Card>

                  {/* Description */}
                  {entity.description && (
                    <Card padding="lg">
                      <h2 className="text-xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>Description</h2>
                      <p style={{ color: DS.colors.text.secondary }}>{entity.description}</p>
                    </Card>
                  )}

                  {/* Metadata */}
                  <Card padding="lg">
                    <h2 className="text-xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>Metadata</h2>
                    <div className="space-y-3 text-sm">
                      {entity.file_size_bytes && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-800">
                          <span style={{ color: DS.colors.text.secondary }}>File Size</span>
                          <span style={{ color: DS.colors.text.primary }}>
                            {(entity.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      {(entity.bounding_box_width || entity.bounding_box_height || entity.bounding_box_depth) && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-800">
                          <span style={{ color: DS.colors.text.secondary }}>Dimensions</span>
                          <span style={{ color: DS.colors.text.primary }}>
                            {entity.bounding_box_width} × {entity.bounding_box_height} × {entity.bounding_box_depth} mm
                          </span>
                        </div>
                      )}
                      {entity.file_format && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-800">
                          <span style={{ color: DS.colors.text.secondary }}>File Format</span>
                          <span style={{ color: DS.colors.text.primary }}>{entity.file_format.toUpperCase()}</span>
                        </div>
                      )}
                      {entity.upload_timestamp && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-800">
                          <span style={{ color: DS.colors.text.secondary }}>Uploaded</span>
                          <span style={{ color: DS.colors.text.primary }}>
                            {new Date(entity.upload_timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {entity.file_checksum && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-800">
                          <span style={{ color: DS.colors.text.secondary }}>Checksum</span>
                          <div className="flex items-center gap-2">
                            <span style={{ color: DS.colors.text.primary }} className="font-mono text-xs">
                              {entity.file_checksum.substring(0, 16)}...
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Copy size={14} />}
                              onClick={() => {
                                navigator.clipboard.writeText(entity.file_checksum);
                                // You could add a toast notification here
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {entity.branch_count !== undefined && (
                        <div className="flex items-center justify-between py-2">
                          <span style={{ color: DS.colors.text.secondary }}>Branches</span>
                          <span style={{ color: DS.colors.text.primary }}>{entity.branch_count || 0}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Download Button - only show if downloads are not blocked */}
                  {!share_link?.download_blocked && entity.file_path && (
                    <Card padding="lg">
                      <Button
                        variant="primary"
                        icon={<Download size={16} />}
                        onClick={handleDownload}
                        fullWidth
                      >
                        Download File
                      </Button>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Folder Contents */}
                  {shareData.projects && shareData.projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shareData.projects.map((project: any) => (
                        <Card
                          key={project.id}
                          padding="md"
                          className="cursor-pointer hover:opacity-80 transition"
                          onClick={() => router.push(`/share/${token}?project=${project.id}`)}
                        >
                          <div className="aspect-video bg-gray-900 rounded-lg mb-3 flex items-center justify-center">
                            <FileText size={32} style={{ color: DS.colors.text.tertiary }} />
                          </div>
                          <h3 className="font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
                            {project.title}
                          </h3>
                          {project.description && (
                            <p className="text-sm line-clamp-2" style={{ color: DS.colors.text.secondary }}>
                              {project.description}
                            </p>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Folder size={48} />}
                      title="Empty Folder"
                      description="This folder doesn't contain any public projects."
                    />
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

