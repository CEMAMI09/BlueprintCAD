'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import CADViewer to avoid SSR issues
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

export default function HeadphonesViewer() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showUploadButton, setShowUploadButton] = useState(false);

  const defaultFileUrl = '/AirPods Max headphones_3d model mockup_kathzerrato_.stl';
  const defaultFileName = 'AirPods Max headphones';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.stl', '.obj', '.step', '.stp', '.iges', '.igs', '.fbx', '.3mf'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (validExtensions.includes(fileExt)) {
        setUploadedFile(file);
        setShowUploadButton(false);
      } else {
        alert('Please upload a valid CAD file (STL, OBJ, STEP, IGES, FBX, or 3MF)');
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="w-full translate-y-8 translate-x-[18%]">
      <div
        className="relative w-full"
        style={{ aspectRatio: '748/700' }}
      >
        <CADViewer
          file={uploadedFile || undefined}
          fileUrl={uploadedFile ? undefined : defaultFileUrl}
          fileName={uploadedFile?.name || defaultFileName}
          fileType="stl"
          height="h-full"
          showControls={false}
          autoRotate={true}
          noWrapper={false}
        />
        
        {/* Upload button overlay */}
        <div className="absolute top-4 right-4 z-10">
          {!showUploadButton ? (
            <button
              onClick={() => setShowUploadButton(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                backgroundColor: 'rgba(11, 14, 20, 0.9)',
                color: '#E6EAF0',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(11, 14, 20, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(79, 125, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(11, 14, 20, 0.9)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              Upload Your Model
            </button>
          ) : (
            <div className="flex gap-2">
              <label
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(79, 125, 255, 0.9)',
                  color: '#0B0E14',
                  border: '1px solid rgba(79, 125, 255, 0.5)',
                }}
              >
                Choose File
                <input
                  type="file"
                  accept=".stl,.obj,.step,.stp,.iges,.igs,.fbx,.3mf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => {
                  setShowUploadButton(false);
                  setUploadedFile(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                style={{
                  backgroundColor: 'rgba(11, 14, 20, 0.9)',
                  color: '#E6EAF0',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
