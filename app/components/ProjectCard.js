// Reusable card for displaying projects in grid
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load the modal for performance
const CADViewerModal = dynamic(() => import('./CADViewerModal'), {
  ssr: false,
  loading: () => null
});

// Lazy load the 3D viewer for card preview
const CADViewer = dynamic(() => import('./CADViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-2"></div>
        <p className="text-xs text-gray-500">Loading 3D...</p>
      </div>
    </div>
  )
});

export default function ProjectCard({ project, showAiEstimate = false, isDraggable = false }) {
  const [showModal, setShowModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Check if file is a 3D format that we can preview
  const is3DFile = project.file_type && ['stl', 'obj', 'fbx', 'step', 'stp'].includes(project.file_type.toLowerCase());
  const fileUrl = project.file_path ? `/api/files/${encodeURIComponent(project.file_path)}` : null;

  const handleDragStart = (e) => {
    if (!isDraggable) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      projectId: project.id,
      projectTitle: project.title,
      currentFolderId: project.folder_id
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  console.log('ProjectCard Debug:', {
    title: project.title,
    file_type: project.file_type,
    file_path: project.file_path,
    is3DFile,
    fileUrl
  });

  return (
    <>
      <div 
        className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-blue-600 transition-all duration-300 group relative ${
          isDragging ? 'opacity-50 cursor-grabbing' : isDraggable ? 'cursor-grab' : ''
        }`}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 3D Viewer Preview - Always visible for 3D files */}
        <div className="aspect-square relative overflow-hidden">
          {(is3DFile && fileUrl) ? (
            <div className="w-full h-full absolute inset-0">
              {/* Embedded 3D Viewer - Directly Interactive */}
              <CADViewer
                fileUrl={fileUrl}
                fileName={project.title}
                fileType={project.file_type}
                className="w-full h-full"
                showControls={false}
                autoRotate={false}
                noWrapper={true}
              />
              {/* Title overlay at bottom of viewer */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900 pt-3 pb-3 px-3 z-30">
                <Link href={`/project/${project.id}`}>
                  <h3 className="text-base font-semibold text-white line-clamp-1 group-hover:text-blue-400 transition">
                    {project.title}
                  </h3>
                </Link>
              </div>
            </div>
          ) : project.thumbnail ? (
            <Link href={`/project/${project.id}`}>
              <Image 
                src={project.thumbnail} 
                alt={project.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          ) : (
            <Link href={`/project/${project.id}`} className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </Link>
          )}
        </div>

        {/* Price Badge */}
        {project.for_sale ? (
          <div className="absolute top-2 right-2 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            ${project.price}
          </div>
        ) : null}

        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-gray-400 text-sm mb-2 line-clamp-2 mt-2">
            {project.description || 'No description provided'}
          </p>

          {/* Tags */}
          {project.tags ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {project.tags.split(',').slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-md">
                  {tag.trim()}
                </span>
              ))}
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{project.views || 0}</span>
              </span>
              {(project.likes && project.likes > 0) ? (
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{project.likes}</span>
                </span>
              ) : null}
            </div>
            {(showAiEstimate && project.ai_estimate) ? (
              <span className="text-emerald-400 font-medium">
                ~{project.ai_estimate}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* 3D Viewer Modal */}
      {is3DFile && fileUrl && showModal && (
        <CADViewerModal
          fileUrl={fileUrl}
          fileName={project.title}
          fileType={project.file_type}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}