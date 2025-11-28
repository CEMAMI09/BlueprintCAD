// Utility functions for STL file analysis
const fs = require('fs');

/**
 * Extract dimensions from an STL file (binary or ASCII)
 * Returns {x, y, z, volume} in millimeters
 */
function getSTLDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check if it's a binary or ASCII STL
    const header = buffer.toString('ascii', 0, 5);
    const isBinary = header !== 'solid';
    
    if (isBinary) {
      return parseBinarySTL(buffer);
    } else {
      return parseASCIISTL(buffer.toString('ascii'));
    }
  } catch (error) {
    console.error('Error reading STL file:', error);
    return null;
  }
}

function parseBinarySTL(buffer) {
  // Binary STL format:
  // 80 bytes header
  // 4 bytes number of triangles
  // For each triangle: 50 bytes (12 floats + 2 bytes attribute)
  
  const triangleCount = buffer.readUInt32LE(80);
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  // Start reading triangles at byte 84
  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + (i * 50);
    
    // Skip normal vector (12 bytes), read 3 vertices
    for (let v = 0; v < 3; v++) {
      const vertexOffset = offset + 12 + (v * 12);
      const x = buffer.readFloatLE(vertexOffset);
      const y = buffer.readFloatLE(vertexOffset + 4);
      const z = buffer.readFloatLE(vertexOffset + 8);
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  }
  
  const dimensions = {
    x: Math.abs(maxX - minX),
    y: Math.abs(maxY - minY),
    z: Math.abs(maxZ - minZ),
    unit: 'mm'
  };
  
  // Calculate approximate volume (bounding box volume)
  dimensions.volume = dimensions.x * dimensions.y * dimensions.z;
  
  return dimensions;
}

function parseASCIISTL(content) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  // Parse vertex lines
  const vertexRegex = /vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/g;
  let match;
  
  while ((match = vertexRegex.exec(content)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[3]);
    const z = parseFloat(match[5]);
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  
  const dimensions = {
    x: Math.abs(maxX - minX),
    y: Math.abs(maxY - minY),
    z: Math.abs(maxZ - minZ),
    unit: 'mm'
  };
  
  dimensions.volume = dimensions.x * dimensions.y * dimensions.z;
  
  return dimensions;
}

/**
 * Calculate weight based on dimensions, material, and infill
 * @param {object} dimensions - {x, y, z, volume} in mm
 * @param {number} scale - scale percentage (100 = 100%)
 * @param {string} material - material type (PLA, ABS, PETG, etc.)
 * @param {number} infill - infill percentage (0-100)
 * @returns {number} weight in grams
 */
function calculateWeight(dimensions, scale = 100, material = 'PLA', infill = 20) {
  if (!dimensions || !dimensions.volume) return 0;
  
  // Material densities in g/cm³
  const densities = {
    'PLA': 1.24,
    'ABS': 1.04,
    'PETG': 1.27,
    'TPU': 1.21,
    'Nylon': 1.14
  };
  
  const density = densities[material] || 1.24; // Default to PLA
  
  // Scale the volume
  const scaleFactor = (scale / 100) ** 3; // Volume scales with cube of linear scale
  const scaledVolume = dimensions.volume * scaleFactor;
  
  // Convert mm³ to cm³
  const volumeCm3 = scaledVolume / 1000;
  
  // Calculate weight considering infill (infill percentage + shell walls ~15%)
  const effectiveDensity = density * ((infill / 100) * 0.85 + 0.15);
  
  return volumeCm3 * effectiveDensity;
}

/**
 * Estimate print time based on dimensions and settings
 * @param {object} dimensions - {x, y, z, volume} in mm
 * @param {number} scale - scale percentage
 * @param {number} layerHeight - layer height in mm (0.1-0.3)
 * @param {number} printSpeed - print speed in mm/s (30-100)
 * @returns {number} time in hours
 */
function calculatePrintTime(dimensions, scale = 100, layerHeight = 0.2, printSpeed = 50) {
  if (!dimensions || !dimensions.z) return 0;
  
  const scaleFactor = scale / 100;
  const scaledZ = dimensions.z * scaleFactor;
  const scaledVolume = dimensions.volume * (scaleFactor ** 3);
  
  // Estimate number of layers
  const layers = Math.ceil(scaledZ / layerHeight);
  
  // Rough estimation: calculate path length based on perimeter + infill
  // This is a simplified model
  const avgPerimeter = 2 * ((dimensions.x * scaleFactor) + (dimensions.y * scaleFactor));
  const infillDensity = 0.2; // 20% infill assumption
  const infillPathLength = (dimensions.x * scaleFactor) * (dimensions.y * scaleFactor) * infillDensity / layerHeight;
  
  const totalPathLength = layers * (avgPerimeter + infillPathLength);
  
  // Calculate time in seconds, then convert to hours
  const timeSeconds = totalPathLength / printSpeed;
  const timeHours = timeSeconds / 3600;
  
  // Add ~15% overhead for travel moves, retractions, etc.
  return timeHours * 1.15;
}

module.exports = {
  getSTLDimensions,
  calculateWeight,
  calculatePrintTime
};
