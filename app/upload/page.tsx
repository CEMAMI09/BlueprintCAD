'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ThreePreview from '@/components/ThreePreview';
import { Folder } from '@/types';
import { ThreePanelLayout, LeftPanel, CenterPanel, RightPanel, PanelHeader, PanelContent } from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Upload as UploadIcon, FolderIcon, Globe, Lock, DollarSign } from 'lucide-react';
import * as DS from '@/lib/ui/design-system';

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

useEffect(() => {
  // Read ?folder= param in App Router
  const folderId = searchParams ? searchParams.get('folder') : null;
  if (folderId) {
    setSelectedFolderId(Number(folderId));
  } else {
    setSelectedFolderId(null);
  }
  // Fetch user's folders
  fetchFolders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);

const fetchFolders = async () => {
  try {
    const res = await fetch('/api/folders', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      setFolders(data);
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
      const { filePath, thumbnailPath, dimensions, volume } = uploadData;

      const projectData = {
        ...formData,
        file_path: filePath,
        file_type: file.name.split('.').pop(),
        thumbnail: thumbnailPath || null,
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
      router.push(`/project/${project.id}`);
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

  return (
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

                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="3d-printing, mechanical, arduino, prototype"
                  />
                  <p className="text-xs text-gray-500 mt-1">Help others find your design with relevant tags</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Folder (optional)</label>
                  <select
                    value={selectedFolderId || ''}
                    onChange={(e) => setSelectedFolderId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">No folder (root level)</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Organize your file into a folder</p>
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
                      onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">For Sale</label>
                    <p className="text-sm text-gray-400">List this design in the marketplace</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.for_sale}
                      onChange={(e) => setFormData({...formData, for_sale: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

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
                <ThreePreview file={file} />
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
    />
  );
}