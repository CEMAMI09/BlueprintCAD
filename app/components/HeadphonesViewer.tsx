'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  Upload,
  RotateCw,
  Ruler,
  Grid3x3,
  Box,
  Focus,
} from 'lucide-react';
import ViewerSignupModal from '@/app/components/ViewerSignupModal';

const CADViewer = dynamic(
  () => import('@/frontend/components/CADViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-gray-800 bg-gray-900 w-full">
        <div
          className="w-full flex items-center justify-center"
          style={{ aspectRatio: '748/700' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading 3D viewer...</span>
          </div>
        </div>
      </div>
    ),
  }
);

const VALID_EXTENSIONS = ['.stl', '.obj', '.step', '.stp', '.iges', '.igs', '.fbx', '.3mf'];

type ViewerToolId = 'autoRotate' | 'measure' | 'wireframe' | 'grid' | 'resetView';

interface ViewerTool {
  id: ViewerToolId;
  label: string;
  icon: ReactNode;
}

const VIEWER_TOOLS: ViewerTool[] = [
  { id: 'autoRotate', label: 'Auto-rotate', icon: <RotateCw size={16} /> },
  { id: 'measure', label: 'Measure', icon: <Ruler size={16} /> },
  { id: 'wireframe', label: 'Wireframe', icon: <Box size={16} /> },
  { id: 'grid', label: 'Grid', icon: <Grid3x3 size={16} /> },
  { id: 'resetView', label: 'Reset view', icon: <Focus size={16} /> },
];

function isValidCadFile(file: File): boolean {
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  return VALID_EXTENSIONS.includes(fileExt);
}

export default function HeadphonesViewer() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [hasUploadedModel, setHasUploadedModel] = useState(false);
  const [showUploadButton, setShowUploadButton] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultFileUrl = '/AirPods Max headphones_3d model mockup_kathzerrato_.stl';
  const defaultFileName = 'AirPods Max headphones';

  const interceptAdvancedAction = useCallback(() => {
    if (hasUploadedModel) {
      setShowSignupModal(true);
    }
  }, [hasUploadedModel]);

  const processFile = useCallback((file: File) => {
    if (!isValidCadFile(file)) {
      alert('Please upload a valid CAD file (STL, OBJ, STEP, IGES, FBX, or 3MF)');
      return;
    }
    setUploadedFile(file);
    setHasUploadedModel(true);
    setShowUploadButton(false);
    setAutoRotate(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleToolClick = (toolId: ViewerToolId) => {
    if (hasUploadedModel) {
      setShowSignupModal(true);
      return;
    }

    if (toolId === 'autoRotate') {
      setAutoRotate((prev) => !prev);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setHasUploadedModel(false);
    setShowUploadButton(false);
    setAutoRotate(true);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="w-full translate-y-8 translate-x-[18%]">
        <div
          className={`relative w-full rounded-xl transition-all duration-200 ${
            isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0B0E14]' : ''
          }`}
          style={{ aspectRatio: '748/700' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CADViewer
            file={uploadedFile || undefined}
            fileUrl={uploadedFile ? undefined : defaultFileUrl}
            fileName={uploadedFile?.name || defaultFileName}
            fileType="stl"
            height="h-full"
            showControls={false}
            autoRotate={autoRotate}
            noWrapper={false}
            interactionMode={hasUploadedModel ? 'rotate-only' : 'full'}
            onAdvancedInteraction={interceptAdvancedAction}
          />

          {/* Drag-and-drop hint */}
          {isDragOver && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-blue-600/10 backdrop-blur-[2px] pointer-events-none">
              <p className="text-sm font-medium text-blue-300">Drop your CAD file here</p>
            </div>
          )}

          {/* Upload button overlay */}
          <div className="absolute top-4 right-4 z-10">
            {!showUploadButton ? (
              <button
                type="button"
                onClick={() => setShowUploadButton(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all duration-200 ease-in-out hover:scale-105"
              >
                <Upload size={16} />
                Upload Your Model
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all duration-200 ease-in-out hover:scale-105"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.obj,.step,.stp,.iges,.igs,.fbx,.3mf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {(uploadedFile || hasUploadedModel) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900/90 text-gray-200 border border-white/10 hover:border-blue-500/50 transition-all duration-200"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowUploadButton(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900/90 text-gray-200 border border-white/10 hover:border-white/20 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Viewer toolbar */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 p-1 rounded-lg bg-gray-900/90 border border-white/10 backdrop-blur-md">
            {VIEWER_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                onClick={() => handleToolClick(tool.id)}
                className={`p-2 rounded-md transition-all duration-200 ease-in-out hover:scale-105 ${
                  !hasUploadedModel && tool.id === 'autoRotate' && autoRotate
                    ? 'bg-blue-600/30 text-blue-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                aria-label={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Post-upload nudge */}
          {hasUploadedModel && (
            <div className="absolute bottom-14 right-5 z-10 max-w-[200px] pointer-events-none">
              <p className="text-xs text-gray-500 text-right leading-snug">
                Spin to preview — zoom &amp; tools unlock with a free account
              </p>
            </div>
          )}
        </div>
      </div>

      <ViewerSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
      />
    </>
  );
}
