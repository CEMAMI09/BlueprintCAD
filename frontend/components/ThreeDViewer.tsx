'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Lazy load CADViewer for performance
// Using relative path to avoid chunk loading issues
const CADViewer = dynamic(
  () => import('./CADViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400 text-sm">Loading 3D Viewer...</p>
        </div>
      </div>
    ),
  }
);

type ThreeDViewerProps = {
  /** URL to the CAD file (required) */
  fileUrl: string;
  
  /** Display name for the file */
  fileName?: string;
  
  /** File type/extension (e.g., 'stl', 'obj') */
  fileType?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Height class (Tailwind) - default: h-96 */
  height?: string;
  
  /** Show header with file name and controls info */
  showHeader?: boolean;
  
  /** Enable auto-rotation */
  autoRotate?: boolean;
  
  /** Show instructions/controls overlay */
  showInstructions?: boolean;
  
  /** Preset: 'card' | 'modal' | 'detail' | 'upload' */
  preset?: 'card' | 'modal' | 'detail' | 'upload';

  /** Fill parent container (use when parent sets aspect-ratio or height) */
  fill?: boolean;
};

/**
 * Universal 3D Viewer Component
 * Wrapper around CADViewer with optimized presets for different contexts
 * 
 * Usage:
 * ```tsx
 * // Product detail page (auto-loading, full height)
 * <ThreeDViewer 
 *   fileUrl="/api/files/model.stl" 
 *   fileName="MyModel.stl"
 *   preset="detail"
 * />
 * 
 * // Card hover preview (compact)
 * <ThreeDViewer 
 *   fileUrl="/api/files/model.stl"
 *   preset="card"
 * />
 * 
 * // Modal (full screen)
 * <ThreeDViewer 
 *   fileUrl="/api/files/model.stl"
 *   preset="modal"
 * />
 * ```
 */
export default function ThreeDViewer({
  fileUrl,
  fileName,
  fileType,
  className = '',
  height,
  showHeader,
  autoRotate,
  showInstructions,
  preset = 'detail',
  fill = false,
}: ThreeDViewerProps) {
  // Apply preset defaults
  const presetConfig = {
    card: {
      height: 'h-80',
      showHeader: false,
      autoRotate: false,
      showInstructions: false,
    },
    modal: {
      height: 'h-[70vh]',
      showHeader: true,
      autoRotate: false,
      showInstructions: true,
    },
    detail: {
      height: 'aspect-video max-h-[600px] min-h-[180px]',
      showHeader: true,
      autoRotate: false,
      showInstructions: true,
    },
    upload: {
      height: 'h-96',
      showHeader: true,
      autoRotate: true,
      showInstructions: false,
    },
  };

  const config = presetConfig[preset];
  const finalHeight = height || config.height;
  const finalShowHeader = showHeader ?? config.showHeader;
  const finalAutoRotate = autoRotate ?? config.autoRotate;
  const finalShowInstructions = showInstructions ?? config.showInstructions;

  const viewerHeight = fill ? 'h-full min-h-0' : finalHeight;

  return (
    <div
      className={`relative w-full min-w-0 max-w-full overflow-hidden ${fill ? 'h-full flex flex-col' : ''} ${className}`}
      style={{ borderRadius: fill ? undefined : '0.75rem' }}
    >
      {/* Header */}
      {finalShowHeader && fileName && (
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-sm font-medium text-gray-200 truncate">{fileName}</span>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:inline">Interactive 3D View</span>
        </div>
      )}

      {/* Viewer canvas area */}
      <div
        className={`w-full max-w-full relative overflow-hidden ${fill ? 'flex-1 min-h-0 h-full' : viewerHeight}`}
        style={{ margin: 0, padding: 0 }}
      >
        <div className="absolute inset-0 overflow-hidden" style={{ margin: 0, padding: 0 }}>
          <Suspense
            fallback={
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-gray-400 text-sm">Loading 3D Model...</p>
                </div>
              </div>
            }
          >
            <CADViewer
              fileUrl={fileUrl}
              fileName={fileName}
              fileType={fileType}
              height="h-full"
              showControls={false}
              autoRotate={finalAutoRotate}
              noWrapper={true}
            />
          </Suspense>
        </div>
      </div>

      {/* Instructions - below the canvas, never inside the aspect-ratio box */}
      {finalShowInstructions && (
          <div className="bg-gray-800 px-2 sm:px-4 py-2 border-t border-gray-700 flex flex-wrap items-center justify-center gap-2 sm:gap-4 pointer-events-none rounded-b-xl flex-shrink-0 overflow-hidden w-full">
            <span className="flex items-center gap-1 text-xs text-gray-300 whitespace-nowrap">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span className="hidden sm:inline">Rotate: Click + Drag</span>
              <span className="sm:hidden">Rotate</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-300 whitespace-nowrap">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
              <span>Zoom: Scroll</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-300 whitespace-nowrap hidden sm:flex">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>Pan: Right Click + Drag</span>
            </span>
          </div>
        )}
    </div>
  );
}
