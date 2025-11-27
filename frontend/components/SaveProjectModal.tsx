/**
 * Save Project Modal - Form to save a project from quote tool
 */

'use client';

import { useState } from 'react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { Button } from '@/components/ui/UIComponents';
import { X, Globe, Lock, DollarSign, Tag } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    tags: string;
    is_public: boolean;
    for_sale: boolean;
    price: string;
  }) => Promise<void>;
  fileName: string;
  loading?: boolean;
}

export default function SaveProjectModal({
  isOpen,
  onClose,
  onSubmit,
  fileName,
  loading = false
}: SaveProjectModalProps) {
  const [formData, setFormData] = useState({
    title: fileName.replace(/\.[^/.]+$/, ''),
    description: '',
    tags: '',
    is_public: true,
    for_sale: false,
    price: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return;
    }
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg"
        style={{ backgroundColor: DS.colors.background.card, borderColor: DS.colors.border.default }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: DS.colors.border.default }}>
          <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
            Save Project
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            style={{ color: DS.colors.text.secondary }}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg focus:outline-none"
              style={{
                backgroundColor: DS.colors.background.elevated,
                border: `1px solid ${DS.colors.border.default}`,
                color: DS.colors.text.primary
              }}
              placeholder="My Awesome Project"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-lg focus:outline-none resize-none"
              style={{
                backgroundColor: DS.colors.background.elevated,
                border: `1px solid ${DS.colors.border.default}`,
                color: DS.colors.text.primary
              }}
              placeholder="Optional description..."
              disabled={loading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              <Tag size={16} />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 rounded-lg focus:outline-none"
              style={{
                backgroundColor: DS.colors.background.elevated,
                border: `1px solid ${DS.colors.border.default}`,
                color: DS.colors.text.primary
              }}
              placeholder="tag1, tag2, tag3"
              disabled={loading}
            />
          </div>

          {/* Public/Private Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Visibility
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_public: true })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  formData.is_public ? '' : ''
                }`}
                style={
                  formData.is_public
                    ? {
                        backgroundColor: DS.colors.primary.blue,
                        color: '#fff'
                      }
                    : {
                        backgroundColor: DS.colors.background.panel,
                        color: DS.colors.text.secondary,
                        border: `1px solid ${DS.colors.border.default}`
                      }
                }
                disabled={loading}
              >
                <Globe size={18} />
                Public
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_public: false })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  !formData.is_public ? '' : ''
                }`}
                style={
                  !formData.is_public
                    ? {
                        backgroundColor: DS.colors.primary.blue,
                        color: '#fff'
                      }
                    : {
                        backgroundColor: DS.colors.background.panel,
                        color: DS.colors.text.secondary,
                        border: `1px solid ${DS.colors.border.default}`
                      }
                }
                disabled={loading}
              >
                <Lock size={18} />
                Private
              </button>
            </div>
          </div>

          {/* For Sale/Free Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
              Pricing
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, for_sale: false, price: '' })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  !formData.for_sale ? '' : ''
                }`}
                style={
                  !formData.for_sale
                    ? {
                        backgroundColor: DS.colors.primary.blue,
                        color: '#fff'
                      }
                    : {
                        backgroundColor: DS.colors.background.panel,
                        color: DS.colors.text.secondary,
                        border: `1px solid ${DS.colors.border.default}`
                      }
                }
                disabled={loading}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, for_sale: true })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  formData.for_sale ? '' : ''
                }`}
                style={
                  formData.for_sale
                    ? {
                        backgroundColor: DS.colors.primary.blue,
                        color: '#fff'
                      }
                    : {
                        backgroundColor: DS.colors.background.panel,
                        color: DS.colors.text.secondary,
                        border: `1px solid ${DS.colors.border.default}`
                      }
                }
                disabled={loading}
              >
                <DollarSign size={18} />
                For Sale
              </button>
            </div>
          </div>

          {/* Price Input (if for sale) */}
          {formData.for_sale && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: DS.colors.background.elevated,
                  border: `1px solid ${DS.colors.border.default}`,
                  color: DS.colors.text.primary
                }}
                placeholder="0.00"
                disabled={loading}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : 'Save Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

