'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ThreePreview from '@/components/ThreePreview';
import { Folder } from '@/types';
import { ThreePanelLayout, LeftPanel, CenterPanel, RightPanel, PanelHeader, PanelContent } from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Upload as UploadIcon, Globe, Lock, DollarSign, ChevronRight, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';

interface FormData {
  title: string;
  description: string;
  tags: string;
  is_public: boolean;
  for_sale: boolean;
  price: string;
}

interface ManufacturingOption {
  name: string;
  price?: string;
  priceRange?: string;
  estimatedCost?: string;
  deliveryTime?: string;
  description: string;
  recommended?: boolean;
}

interface AIEstimate {
  estimate: string;
  material: string;
  printTime: string;
  weight: string;
  confidence: string;
  breakdown: {
    materialCost: string;
    laborCost: string;
    machineTime: string;
    markup: string;
    shipping: string;
  };
  manufacturingOptions: ManufacturingOption[];
  recommendations: string[];
}

export default function Upload() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    tags: '',
    is_public: true,
    for_sale: false,
    price: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aiEstimate, setAiEstimate] = useState<AIEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  // Check subscription feature access
  const checkSubscription = async (feature: string, onAllowed: () => void) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setShowUpgradeModal(true);
        setUpgradeTier('pro');
        return;
      }

      const res = await fetch(`/api/subscriptions/can-action?feature=${feature}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.allowed) {
          onAllowed();
        } else {
          // Determine required tier
          const tierMap: { [key: string]: 'pro' | 'creator' | 'enterprise' } = {
            maxPrivateProjects: 'pro',
            canSell: 'pro',
            maxProjects: 'pro',
            maxFolders: 'pro',
            storefrontCustomization: 'creator',
            fileVersioning: 'creator',
            analytics: 'pro',
          };
          setUpgradeTier(tierMap[feature] || 'pro');
          setShowUpgradeModal(true);
        }
      } else {
        // If check fails, show upgrade modal
        setUpgradeTier('pro');
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      setUpgradeTier('pro');
      setShowUpgradeModal(true);
    }
  };

useEffect(() => {
  // Read ?folder= param in App Router
  const folderId = searchParams ? searchParams.get('folder') : null;
  if (folderId) {
    const folderIdNum = Number(folderId);
    setSelectedFolderId(folderIdNum);
    console.log('[Upload] Folder ID from URL:', folderIdNum);
  } else {
    setSelectedFolderId(null);
  }
  // Fetch user's folders
  fetchFolders();
  // Fetch available tags
  fetchTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);

const fetchTags = async (searchTerm?: string) => {
  try {
    const url = searchTerm 
      ? `/api/tags?search=${encodeURIComponent(searchTerm)}`
      : '/api/tags';
    const res = await fetch(url);
    if (res.ok) {
      const tags = await res.json();
      if (!searchTerm) {
        // Only update availableTags when fetching all tags
        setAvailableTags(tags);
      }
      return tags;
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
  }
  return [];
};

const fetchFolders = async () => {
  try {
    // Fetch all folders (including subfolders) using the all=true parameter
    const res = await fetch('/api/folders?all=true', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (res.ok) {
      const allFolders = await res.json();
      setFolders(allFolders);
      
      // After folders are loaded, ensure the folder from URL is still selected
      const folderId = searchParams ? searchParams.get('folder') : null;
      if (folderId) {
        const folderIdNum = Number(folderId);
        // Verify the folder exists in the list
        const folderExists = allFolders.some((f: Folder) => f.id === folderIdNum);
        if (folderExists) {
          setSelectedFolderId(folderIdNum);
          // Expand parent folders to show the selected folder
          const expandParents = (folderId: number) => {
            const folder = allFolders.find(f => f.id === folderId);
            if (folder && folder.parent_id) {
              setExpandedFolders(prev => new Set([...prev, folder.parent_id!]));
              expandParents(folder.parent_id);
            }
          };
          expandParents(folderIdNum);
          console.log('[Upload] Folder confirmed in list:', folderIdNum);
        } else {
          // If folder not found, try to fetch it directly (might be a subfolder we don't have access to)
          console.warn('[Upload] Folder not found in user folders, fetching directly:', folderIdNum);
          try {
            const folderRes = await fetch(`/api/folders/${folderIdNum}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            if (folderRes.ok) {
              const folderData = await folderRes.json();
              // Add the folder to the list if it exists and user has access
              if (folderData && !allFolders.some((f: Folder) => f.id === folderIdNum)) {
                allFolders.push(folderData);
                setFolders(allFolders);
              }
              setSelectedFolderId(folderIdNum);
              // Expand parent folders
              if (folderData.parent_id) {
                setExpandedFolders(prev => new Set([...prev, folderData.parent_id]));
              }
              console.log('[Upload] Folder fetched and added to list:', folderIdNum);
            }
          } catch (err) {
            console.error('[Upload] Failed to fetch folder directly:', err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch folders:', error);
  }
};

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    const validExtensions = ['.stl', '.obj', '.fbx', '.gltf', '.glb', '.ply', '.dae', '.scad', '.step', '.stp', '.iges', '.igs', '.dwg', '.dxf', '.f3d', '.sldprt', '.sldasm', '.ipt', '.iam', '.3mf', '.amf', '.x3d'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a supported CAD format.');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB');
      return;
    }

    setFile(selectedFile);
    setPreview(selectedFile.name);
    setError('');
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fileFormData = new FormData();
      fileFormData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: fileFormData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const uploadData = await uploadRes.json();
      const { filePath, dimensions, volume } = uploadData;

      // Prepare tags - use selectedTags if available, otherwise fall back to formData.tags
      const tagsToSave = selectedTags.length > 0 
        ? selectedTags.join(', ') 
        : formData.tags;

      // Save new tags to the tags table
      if (selectedTags.length > 0) {
        try {
          await fetch('/api/tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tags: selectedTags })
          });
        } catch (err) {
          console.error('Error saving tags:', err);
        }
      }

      // Don't send thumbnail_path - let the API generate it automatically
      const projectData = {
        ...formData,
        tags: tagsToSave,
        file_path: filePath,
        file_type: file.name.split('.').pop(),
        dimensions: dimensions || null,
        price: formData.for_sale ? parseFloat(formData.price) || null : null,
        folder_id: selectedFolderId || null
      };

      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
      });

      if (!projectRes.ok) {
        const errorData = await projectRes.json();
        throw new Error(errorData.error || 'Project creation failed');
      }

      const project = await projectRes.json();
      console.log('[Upload] Project created:', { 
        id: project.id, 
        title: project.title,
        thumbnail_path: project.thumbnail_path,
        file_path: project.file_path,
        hasThumbnail: !!project.thumbnail_path,
        thumbnailUrl: project.thumbnail_path ? `/api/thumbnails/${project.thumbnail_path.replace('thumbnails/', '')}` : null
      });
      
      if (!project.thumbnail_path) {
        console.warn('[Upload] WARNING: Project created without thumbnail_path!');
      } else {
        console.log('[Upload] Thumbnail path:', project.thumbnail_path);
      }
      
      // Wait a moment for thumbnail generation to complete, then redirect
      // The thumbnail generation happens asynchronously in the API
      setTimeout(() => {
        router.push(`/project/${project.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setAiEstimate(null);
    setError('');
  };

  if (!user) return null;

  // Build folder tree structure
  const buildFolderTree = (folders: Folder[]): Array<Folder & { children?: Folder[] }> => {
    const folderMap = new Map<number, Folder & { children?: Folder[] }>();
    const rootFolders: Array<Folder & { children?: Folder[] }> = [];

    // Create map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build tree structure
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      if (folder.parent_id === null || folder.parent_id === 0) {
        rootFolders.push(folderNode);
      } else {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(folderNode);
        }
      }
    });

    // Sort folders by name
    const sortFolders = (folders: Array<Folder & { children?: Folder[] }>) => {
      folders.sort((a, b) => a.name.localeCompare(b.name));
      folders.forEach(folder => {
        if (folder.children) {
          sortFolders(folder.children);
        }
      });
    };
    sortFolders(rootFolders);

    return rootFolders;
  };

  // Get folder path for display
  const getFolderPath = (folders: Folder[], folderId: number): string => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return 'selected folder';
    
    const path: string[] = [folder.name];
    let currentId = folder.parent_id;
    
    while (currentId) {
      const parent = folders.find(f => f.id === currentId);
      if (parent) {
        path.unshift(parent.name);
        currentId = parent.parent_id;
      } else {
        break;
      }
    }
    
    return path.join(' / ');
  };

  // Folder tree item component
  interface FolderTreeItemProps {
    folder: Folder & { children?: Folder[] };
    level: number;
    selectedFolderId: number | null;
    expandedFolders: Set<number>;
    onSelect: (folderId: number | null) => void;
    onToggleExpand: (folderId: number) => void;
  }

  const FolderTreeItem = ({ folder, level, selectedFolderId, expandedFolders, onSelect, onToggleExpand }: FolderTreeItemProps) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <>
        <div
          onClick={() => onSelect(folder.id)}
          className="px-4 py-2 cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-2"
          style={{
            backgroundColor: isSelected ? DS.colors.primary.blue + '20' : 'transparent',
            paddingLeft: `${16 + level * 20}px`
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="flex items-center justify-center w-4 h-4"
              style={{ color: DS.colors.text.secondary }}
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          <FolderIcon size={16} style={{ color: DS.colors.text.secondary }} />
          <span className="text-sm flex-1" style={{ color: DS.colors.text.primary }}>
            {folder.name}
          </span>
        </div>
        {hasChildren && isExpanded && folder.children!.map(child => (
          <FolderTreeItem
            key={child.id}
            folder={child}
            level={level + 1}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </>
    );
  };

  return (
    <>
    <ThreePanelLayout
      leftPanel={<LeftPanel><GlobalNavSidebar /></LeftPanel>}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Upload New Design" />
          <PanelContent>
            <div className="max-w-4xl mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold mb-4">Upload New Design</h1>
        
        {/* Info Card - Manufacturing Quote */}
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-300">
                <strong>Need a manufacturing quote?</strong> Visit the{' '}
                <Link href="/quote" className="underline hover:text-blue-200">
                  Get Quote
                </Link>{' '}
                page to analyze your design for 3D printing, get dimensions, printability analysis, weight estimates, and AI-powered pricing.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* File Upload */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <label className="block text-sm font-medium mb-3">CAD File *</label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="file"
                    accept=".stl,.obj,.fbx,.gltf,.glb,.ply,.dae,.scad,.step,.stp,.iges,.igs,.dwg,.dxf,.f3d,.sldprt,.sldasm,.ipt,.iam,.3mf,.amf,.x3d"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  
                  {!preview ? (
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-400 mb-1 font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        STL, OBJ, FBX, GLTF, GLB, STEP, IGES, SolidWorks, Fusion 360, and more (Max 50MB)
                      </p>
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-left">
                          <p className="text-white font-medium">{preview}</p>
                          <p className="text-sm text-gray-400">{(file!.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-400 hover:text-red-300 text-sm font-medium"
                      >
                        Remove file
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Details */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g., Modular Phone Stand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Describe your design, its purpose, materials, assembly instructions, etc."
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  
                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                          style={{
                            backgroundColor: DS.colors.primary.blue + '20',
                            color: DS.colors.primary.blue,
                            border: `1px solid ${DS.colors.primary.blue}`
                          }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTags(selectedTags.filter((_, i) => i !== idx));
                            }}
                            className="hover:opacity-70"
                            style={{ color: DS.colors.primary.blue }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag Input */}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setTagInput(value);
                      
                      if (value.trim()) {
                        const searchTerm = value.trim();
                        // Fetch tags from API with search term (API handles sorting - tags starting with search term first)
                        const fetchedTags = await fetchTags(searchTerm);
                        // Filter out already selected tags
                        const filtered = fetchedTags.filter(tag => !selectedTags.includes(tag));
                        setTagSuggestions(filtered.slice(0, 15)); // Show more suggestions
                        setShowTagSuggestions(filtered.length > 0);
                      } else {
                        // If input is empty, hide suggestions
                        setShowTagSuggestions(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        const newTag = tagInput.trim().toLowerCase();
                        if (!selectedTags.includes(newTag)) {
                          setSelectedTags([...selectedTags, newTag]);
                        }
                        setTagInput('');
                        setShowTagSuggestions(false);
                      } else if (e.key === 'Backspace' && tagInput === '' && selectedTags.length > 0) {
                        setSelectedTags(selectedTags.slice(0, -1));
                      }
                    }}
                    onFocus={async () => {
                      if (tagInput.trim()) {
                        const searchTerm = tagInput.trim();
                        // Fetch tags from API with search term
                        const fetchedTags = await fetchTags(searchTerm);
                        const filtered = fetchedTags.filter(tag => !selectedTags.includes(tag));
                        setTagSuggestions(filtered.slice(0, 15));
                        setShowTagSuggestions(filtered.length > 0);
                      } else {
                        // Show popular tags when focused
                        await fetchTags();
                        const filtered = availableTags.filter(tag => !selectedTags.includes(tag));
                        setTagSuggestions(filtered.slice(0, 15));
                        setShowTagSuggestions(filtered.length > 0);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding to allow clicking on suggestions
                      setTimeout(() => setShowTagSuggestions(false), 200);
                    }}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Type to search tags or press Enter to add"
                  />

                  {/* Tag Suggestions */}
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!selectedTags.includes(tag)) {
                              setSelectedTags([...selectedTags, tag]);
                            }
                            setTagInput('');
                            setShowTagSuggestions(false);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">Select from existing tags or create new ones</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Folder (optional)</label>
                  <div 
                    className="w-full border border-gray-700 rounded-lg overflow-hidden"
                    style={{ 
                      backgroundColor: DS.colors.background.panelLight,
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}
                  >
                    {/* Root level option */}
                    <div
                      onClick={() => setSelectedFolderId(null)}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-2"
                      style={{
                        backgroundColor: selectedFolderId === null ? DS.colors.primary.blue + '20' : 'transparent'
                      }}
                    >
                      <FolderIcon size={16} style={{ color: DS.colors.text.secondary }} />
                      <span className="text-sm" style={{ color: DS.colors.text.primary }}>
                        No folder (root level)
                      </span>
                    </div>
                    
                    {/* Folder tree */}
                    {buildFolderTree(folders).map(folder => (
                      <FolderTreeItem
                        key={folder.id}
                        folder={folder}
                        level={0}
                        selectedFolderId={selectedFolderId}
                        expandedFolders={expandedFolders}
                        onSelect={setSelectedFolderId}
                        onToggleExpand={(folderId) => {
                          const newExpanded = new Set(expandedFolders);
                          if (newExpanded.has(folderId)) {
                            newExpanded.delete(folderId);
                          } else {
                            newExpanded.add(folderId);
                          }
                          setExpandedFolders(newExpanded);
                        }}
                      />
                    ))}
                  </div>
                  {selectedFolderId && (
                    <p className="text-xs text-blue-400 mt-1">
                      ✓ File will be uploaded to: {getFolderPath(folders, selectedFolderId)}
                    </p>
                  )}
                  {!selectedFolderId && (
                    <p className="text-xs text-gray-500 mt-1">Organize your file into a folder</p>
                  )}
                </div>
              </div>

              {/* Privacy & Sales */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">Public Design</label>
                    <p className="text-sm text-gray-400">Make this design visible to everyone</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, is_public: true});
                        } else {
                          // Trying to make private - check subscription
                          checkSubscription('maxPrivateProjects', () => {
                            setFormData({...formData, is_public: false});
                          });
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <SubscriptionGate
                  feature="canSell"
                  requiredTier="pro"
                  showUpgradeModal={false}
                >
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1">For Sale</label>
                      <p className="text-sm text-gray-400">List this design in the marketplace</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.for_sale}
                        onChange={(e) => {
                          checkSubscription('canSell', () => {
                            setFormData({...formData, for_sale: e.target.checked});
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </SubscriptionGate>

                {formData.for_sale && (
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <label className="block text-sm font-medium mb-2">Price (USD) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required={formData.for_sale}
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="9.99"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Set a fair price for your design files</p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !file || !formData.title.trim()}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-700 rounded-lg font-semibold text-lg transition transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Design
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column - 3D Preview & AI Estimate */}
          <div className="space-y-6">
            {/* 3D Preview - Show for ALL file types */}
            {file && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">3D Preview</h2>
                <div className="w-full">
                  <ThreePreview file={file} />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!file && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <svg className="w-20 h-20 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No file uploaded yet</h3>
                <p className="text-sm text-gray-500">
                  Upload a CAD file to see 3D preview and AI cost estimate
                </p>
              </div>
            )}
          </div>
        </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={null}
    />
    
    {showUpgradeModal && (
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        requiredTier={upgradeTier}
        feature="maxPrivateProjects"
      />
    )}
    </>
  );
}