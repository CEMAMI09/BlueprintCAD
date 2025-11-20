// CAD file format definitions and MIME type mappings
// Comprehensive support for various CAD and 3D model formats

/**
 * Complete list of supported CAD file extensions
 */
export const CAD_FORMATS = {
  // Native 3D formats (fully supported by Three.js)
  stl: {
    extensions: ['.stl'],
    mimeTypes: ['application/sla', 'application/vnd.ms-pki.stl', 'model/stl', 'model/x.stl-ascii', 'model/x.stl-binary'],
    category: '3D Mesh',
    description: 'STereoLithography - Most common 3D printing format',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
  obj: {
    extensions: ['.obj'],
    mimeTypes: ['model/obj', 'application/x-tgif', 'text/plain'],
    category: '3D Mesh',
    description: 'Wavefront OBJ - Common 3D model format',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
  fbx: {
    extensions: ['.fbx'],
    mimeTypes: ['application/octet-stream', 'application/vnd.autodesk.fbx'],
    category: '3D Mesh',
    description: 'Autodesk FBX - 3D interchange format',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
  gltf: {
    extensions: ['.gltf'],
    mimeTypes: ['model/gltf+json'],
    category: '3D Mesh',
    description: 'GL Transmission Format - Modern 3D format',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
  glb: {
    extensions: ['.glb'],
    mimeTypes: ['model/gltf-binary'],
    category: '3D Mesh',
    description: 'Binary GLTF - Compact 3D format',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
  
  // CAD exchange formats (STEP/IGES)
  step: {
    extensions: ['.step', '.stp'],
    mimeTypes: ['application/step', 'application/STEP', 'application/x-step', 'model/step'],
    category: 'CAD',
    description: 'STEP (ISO 10303) - CAD data exchange',
    viewable: false, // Requires conversion
    extractable: false,
  },
  iges: {
    extensions: ['.iges', '.igs'],
    mimeTypes: ['application/iges', 'model/iges', 'application/x-iges'],
    category: 'CAD',
    description: 'IGES - Initial Graphics Exchange Specification',
    viewable: false,
    extractable: false,
  },
  
  // 2D/Technical drawing formats
  dwg: {
    extensions: ['.dwg'],
    mimeTypes: ['application/acad', 'application/x-acad', 'application/autocad_dwg', 'image/x-dwg'],
    category: '2D Drawing',
    description: 'AutoCAD Drawing - Binary CAD format',
    viewable: false,
    extractable: false,
  },
  dxf: {
    extensions: ['.dxf'],
    mimeTypes: ['application/dxf', 'application/x-dxf', 'image/vnd.dxf', 'image/x-dxf'],
    category: '2D Drawing',
    description: 'Drawing Exchange Format - CAD interchange',
    viewable: false,
    extractable: false,
  },
  
  // Parametric CAD formats
  scad: {
    extensions: ['.scad'],
    mimeTypes: ['text/plain', 'application/x-openscad'],
    category: 'Parametric',
    description: 'OpenSCAD - Programmable 3D modeling',
    viewable: false,
    extractable: false,
  },
  f3d: {
    extensions: ['.f3d'],
    mimeTypes: ['application/octet-stream', 'application/vnd.autodesk.fusion360'],
    category: 'Parametric',
    description: 'Fusion 360 - Autodesk native format',
    viewable: false,
    extractable: false,
  },
  sldprt: {
    extensions: ['.sldprt'],
    mimeTypes: ['application/octet-stream', 'application/x-sldprt'],
    category: 'Parametric',
    description: 'SolidWorks Part - Native CAD format',
    viewable: false,
    extractable: false,
  },
  sldasm: {
    extensions: ['.sldasm'],
    mimeTypes: ['application/octet-stream', 'application/x-sldasm'],
    category: 'Parametric',
    description: 'SolidWorks Assembly',
    viewable: false,
    extractable: false,
  },
  ipt: {
    extensions: ['.ipt'],
    mimeTypes: ['application/octet-stream', 'application/vnd.autodesk.inventor.part'],
    category: 'Parametric',
    description: 'Autodesk Inventor Part',
    viewable: false,
    extractable: false,
  },
  iam: {
    extensions: ['.iam'],
    mimeTypes: ['application/octet-stream', 'application/vnd.autodesk.inventor.assembly'],
    category: 'Parametric',
    description: 'Autodesk Inventor Assembly',
    viewable: false,
    extractable: false,
  },
  
  // Additional 3D formats
  ply: {
    extensions: ['.ply'],
    mimeTypes: ['application/octet-stream', 'text/plain', 'model/ply'],
    category: '3D Mesh',
    description: 'Polygon File Format - 3D scanner output',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
  '3mf': {
    extensions: ['.3mf'],
    mimeTypes: ['application/vnd.ms-package.3dmanufacturing-3dmodel+xml'],
    category: '3D Mesh',
    description: '3D Manufacturing Format - Modern 3D printing',
    viewable: false,
    extractable: false,
  },
  amf: {
    extensions: ['.amf'],
    mimeTypes: ['application/x-amf', 'model/amf'],
    category: '3D Mesh',
    description: 'Additive Manufacturing Format',
    viewable: false,
    extractable: false,
  },
  x3d: {
    extensions: ['.x3d'],
    mimeTypes: ['model/x3d+xml', 'application/x3d+xml'],
    category: '3D Mesh',
    description: 'X3D - Web3D standard',
    viewable: false,
    extractable: false,
  },
  collada: {
    extensions: ['.dae'],
    mimeTypes: ['model/vnd.collada+xml'],
    category: '3D Mesh',
    description: 'COLLADA - 3D asset exchange',
    viewable: true,
    extractable: true, // Can extract dimensions
  },
};

/**
 * Get all supported extensions
 */
export function getAllExtensions() {
  return Object.values(CAD_FORMATS)
    .flatMap(format => format.extensions);
}

/**
 * Get all supported MIME types
 */
export function getAllMimeTypes() {
  return Object.values(CAD_FORMATS)
    .flatMap(format => format.mimeTypes);
}

/**
 * Check if file extension is supported
 */
export function isExtensionSupported(extension) {
  const ext = extension.toLowerCase();
  return getAllExtensions().includes(ext);
}

/**
 * Check if MIME type is supported
 */
export function isMimeTypeSupported(mimeType) {
  if (!mimeType) return false;
  const mime = mimeType.toLowerCase();
  return getAllMimeTypes().some(supported => supported.toLowerCase() === mime);
}

/**
 * Get format info from extension
 */
export function getFormatFromExtension(extension) {
  const ext = extension.toLowerCase();
  return Object.entries(CAD_FORMATS).find(([key, format]) =>
    format.extensions.includes(ext)
  )?.[1] || null;
}

/**
 * Get format info from MIME type
 */
export function getFormatFromMimeType(mimeType) {
  if (!mimeType) return null;
  const mime = mimeType.toLowerCase();
  return Object.entries(CAD_FORMATS).find(([key, format]) =>
    format.mimeTypes.some(supported => supported.toLowerCase() === mime)
  )?.[1] || null;
}

/**
 * Get format key from extension
 */
export function getFormatKey(extension) {
  const ext = extension.toLowerCase();
  return Object.entries(CAD_FORMATS).find(([key, format]) =>
    format.extensions.includes(ext)
  )?.[0] || null;
}

/**
 * Check if format is 3D viewable
 */
export function isViewable(extension) {
  const format = getFormatFromExtension(extension);
  return format?.viewable || false;
}

/**
 * Check if format supports dimension extraction
 */
export function isExtractable(extension) {
  const format = getFormatFromExtension(extension);
  return format?.extractable || false;
}

/**
 * Get formats by category
 */
export function getFormatsByCategory(category) {
  return Object.entries(CAD_FORMATS)
    .filter(([key, format]) => format.category === category)
    .map(([key, format]) => ({ key, ...format }));
}

/**
 * Get user-friendly format name
 */
export function getFormatName(extension) {
  const ext = extension.toLowerCase().replace('.', '').toUpperCase();
  const format = getFormatFromExtension(extension);
  return format ? `${ext} - ${format.description}` : ext;
}

/**
 * Validate file extension
 */
export function validateExtension(filename) {
  const ext = ('.' + filename.split('.').pop()).toLowerCase();
  
  if (!isExtensionSupported(ext)) {
    const supported = getAllExtensions().map(e => e.replace('.', '').toUpperCase()).join(', ');
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${supported}`,
      extension: ext,
    };
  }
  
  return {
    valid: true,
    extension: ext,
    format: getFormatFromExtension(ext),
  };
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType, filename) {
  // If no MIME type, fall back to extension check
  if (!mimeType) {
    return validateExtension(filename);
  }
  
  const isValid = isMimeTypeSupported(mimeType);
  const ext = filename ? ('.' + filename.split('.').pop()).toLowerCase() : null;
  
  if (!isValid && ext) {
    // Check if extension is valid even if MIME is not recognized
    return validateExtension(filename);
  }
  
  return {
    valid: isValid,
    mimeType,
    format: getFormatFromMimeType(mimeType),
  };
}

/**
 * Get content-type header for serving files
 */
export function getContentType(extension) {
  const format = getFormatFromExtension(extension);
  return format?.mimeTypes[0] || 'application/octet-stream';
}
