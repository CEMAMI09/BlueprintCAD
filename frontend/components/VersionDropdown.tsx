'use client';

import { useState, useEffect, useRef } from 'react';

interface Version {
  id: number;
  version_number: number;
  created_at: string;
  is_current: number;
  change_notes: string;
}

interface VersionDropdownProps {
  projectId: number;
  onVersionSelect?: (versionId: number) => void;
  className?: string;
}

export default function VersionDropdown({ projectId, onVersionSelect, className = '' }: VersionDropdownProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVersions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setCurrentVersion(data.versions.find((v: Version) => v.is_current === 1) || null);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  const handleVersionClick = (versionId: number) => {
    setIsOpen(false);
    if (onVersionSelect) {
      onVersionSelect(versionId);
    }
  };

  if (versions.length <= 1) {
    return null; // Don't show if only one version
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        v{currentVersion?.version_number || 1}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-400 px-3 py-2 font-semibold">Version History</div>
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => handleVersionClick(version.id)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition ${
                  version.is_current ? 'bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    v{version.version_number}
                    {version.is_current && (
                      <span className="ml-2 text-xs text-blue-400">Current</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(version.created_at).toLocaleDateString()}
                  </span>
                </div>
                {version.change_notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{version.change_notes}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
