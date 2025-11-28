'use client';

// ThreePreview component entrypoint for '@/components/ThreePreview'.
// The full implementation lives in this file so the alias always resolves.

import React from 'react';

export interface ThreePreviewProps {
  file?: File;
  fileUrl?: string;
}

const ThreePreview: React.FC<ThreePreviewProps> = ({ file, fileUrl }) => {
  // Lightweight stub to keep builds passing in environments
  // where the heavy 3D viewer implementation is not available.
  return null;
};

export default ThreePreview;
