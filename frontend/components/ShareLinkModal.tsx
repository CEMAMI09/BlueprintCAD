/**
 * ShareLinkModal Component
 * Modal for creating shareable links for files and folders
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { X, Copy, Check, Lock, Clock, Eye, Download, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/UIComponents';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'project' | 'folder';
  entityId: number;
  entityName: string;
  isPublic?: boolean; // Whether the entity is public (for projects) or accessible (for folders)
  onLinkCreated?: () => void;
}

export default function ShareLinkModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  isPublic = true, // Default to true for backwards compatibility
  onLinkCreated
}: ShareLinkModalProps) {
  // If entity is public, only allow public links; otherwise allow all types
  const [linkType, setLinkType] = useState<'public' | 'password' | 'expiring'>('public');
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [downloadBlocked, setDownloadBlocked] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Reset link type to public if entity is public
  useEffect(() => {
    if (isPublic && linkType !== 'public') {
      setLinkType('public');
    }
  }, [isPublic, linkType]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setError('');
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/share-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          link_type: linkType,
          password: linkType === 'password' ? password : undefined,
          expires_in_days: linkType === 'expiring' ? expiresInDays : undefined,
          view_only: true, // All share links are view-only
          download_blocked: downloadBlocked
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedLink(data);
        if (onLinkCreated) {
          onLinkCreated();
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Create share link error:', error);
      setError('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (createdLink?.share_url) {
      const fullUrl = `${window.location.origin}${createdLink.share_url}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedLink(null);
    setLinkType('public');
    setPassword('');
    setExpiresInDays(7);
    setDownloadBlocked(false);
    setError('');
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
            Share {entityType === 'project' ? 'File' : 'Folder'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {createdLink ? (
          <div className="p-6 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-400 mb-2">Share link created!</p>
              <p className="text-xs text-gray-400 mb-3">{entityName}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${createdLink.share_url}`}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                  style={{ color: DS.colors.text.primary }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={copied ? <Check size={16} /> : <Copy size={16} />}
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" fullWidth onClick={() => setCreatedLink(null)}>
                Create Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="p-6 space-y-4">
            {/* Link Type */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Link Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" style={{ backgroundColor: linkType === 'public' ? DS.colors.background.panelHover : 'transparent' }}>
                  <input
                    type="radio"
                    name="linkType"
                    value="public"
                    checked={linkType === 'public'}
                    onChange={(e) => setLinkType(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <LinkIcon size={20} style={{ color: DS.colors.text.secondary }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>Public Link</p>
                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>Anyone with the link can access</p>
                  </div>
                </label>
                {!isPublic && (
                  <>
                    <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" style={{ backgroundColor: linkType === 'password' ? DS.colors.background.panelHover : 'transparent' }}>
                      <input
                        type="radio"
                        name="linkType"
                        value="password"
                        checked={linkType === 'password'}
                        onChange={(e) => setLinkType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <Lock size={20} style={{ color: DS.colors.text.secondary }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>Password Protected</p>
                        <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>Requires a password to access</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" style={{ backgroundColor: linkType === 'expiring' ? DS.colors.background.panelHover : 'transparent' }}>
                      <input
                        type="radio"
                        name="linkType"
                        value="expiring"
                        checked={linkType === 'expiring'}
                        onChange={(e) => setLinkType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <Clock size={20} style={{ color: DS.colors.text.secondary }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>Expiring Link</p>
                        <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>Automatically expires after set time</p>
                      </div>
                    </label>
                  </>
                )}
                {isPublic && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: DS.colors.background.panelHover }}>
                    <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                      Public designs can only be shared with public links.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Password Input */}
            {linkType === 'password' && (
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
                  required={linkType === 'password'}
                />
              </div>
            )}

            {/* Expiration Days */}
            {linkType === 'expiring' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Expires In (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  style={{ color: DS.colors.text.primary }}
                />
              </div>
            )}

            {/* Access Options */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: DS.colors.background.panelHover }}>
                <p className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: DS.colors.text.primary }}>
                  <Eye size={16} />
                  View Only Access
                </p>
                <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                  Share links provide view-only access. Viewers can view, like, and comment on the design.
                  {isPublic && ' Public designs can be downloaded via share links.'}
                  {!isPublic && ' Private designs can optionally block downloads.'}
                </p>
              </div>
              {!isPublic && (
                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition">
                  <input
                    type="checkbox"
                    checked={downloadBlocked}
                    onChange={(e) => setDownloadBlocked(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Download size={20} style={{ color: DS.colors.text.secondary }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>Block Downloads</p>
                    <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>Prevent file downloads (viewers can only like and comment)</p>
                  </div>
                </label>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

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
                type="submit"
                variant="primary"
                fullWidth
                disabled={creating || (linkType === 'password' && !password)}
              >
                {creating ? 'Creating...' : 'Create Link'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

