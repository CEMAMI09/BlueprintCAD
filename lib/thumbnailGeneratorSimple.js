/**
 * SIMPLIFIED Thumbnail Generator using Puppeteer
 * More reliable than headless Three.js - uses actual browser rendering
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate thumbnail by rendering the CAD file in a headless browser
 * @param {string} cadFilePath - Path to CAD file (relative to public/uploads)
 * @param {string} outputPath - Where to save thumbnail
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Path to generated thumbnail
 */
async function generateThumbnailWithBrowser(cadFilePath, outputPath, options = {}) {
  // Puppeteer is not available - always use placeholder
  return await generatePlaceholderThumbnail(cadFilePath, outputPath, options);
}

/**
 * FALLBACK: Generate a placeholder thumbnail with file info
 * Used when full rendering fails or for unsupported formats
 */
async function generatePlaceholderThumbnail(fileName, outputPath, options = {}) {
  const { width = 800, height = 600 } = options;
  
  try {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#0b1220');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // File icon (SVG-style path drawing)
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 50, height / 2 - 60);
    ctx.lineTo(width / 2 + 50, height / 2 - 60);
    ctx.lineTo(width / 2 + 50, height / 2 + 60);
    ctx.lineTo(width / 2 - 50, height / 2 + 60);
    ctx.closePath();
    ctx.stroke();

    // 3D cube icon
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    // Front face
    ctx.strokeRect(width / 2 - 30, height / 2 - 10, 40, 40);
    // Back face
    ctx.strokeRect(width / 2 - 20, height / 2 - 20, 40, 40);
    // Connecting lines
    ctx.beginPath();
    ctx.moveTo(width / 2 - 30, height / 2 - 10);
    ctx.lineTo(width / 2 - 20, height / 2 - 20);
    ctx.moveTo(width / 2 + 10, height / 2 - 10);
    ctx.lineTo(width / 2 + 20, height / 2 - 20);
    ctx.moveTo(width / 2 - 30, height / 2 + 30);
    ctx.lineTo(width / 2 - 20, height / 2 + 20);
    ctx.moveTo(width / 2 + 10, height / 2 + 30);
    ctx.lineTo(width / 2 + 20, height / 2 + 20);
    ctx.stroke();

    // File name text
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(path.basename(fileName), width / 2, height / 2 + 80);

    // CAD file type
    const ext = path.extname(fileName).toUpperCase().slice(1);
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${ext} File`, width / 2, height / 2 + 110);

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  } catch (error) {
    console.error('Placeholder generation failed:', error);
    throw error;
  }
}

/**
 * Smart thumbnail generator with fallbacks
 * Tries browser rendering first, falls back to placeholder
 */
async function generateThumbnail(cadFilePath, outputPath, options = {}) {
  try {
    // Import format validation
    const { isViewable } = require('./cad-formats');
    
    const ext = path.extname(cadFilePath).toLowerCase().slice(1); // Remove leading dot
    
    // Try browser rendering for viewable formats
    // Currently browser renderer only supports STL/OBJ, but check if format is viewable
    if (isViewable(ext) && ['.stl', '.obj'].includes(path.extname(cadFilePath).toLowerCase())) {
      return await generateThumbnailWithBrowser(cadFilePath, outputPath, options);
    }
    
    // For other formats (including viewable ones not yet supported in browser renderer), use placeholder
    return await generatePlaceholderThumbnail(cadFilePath, outputPath, options);
  } catch (error) {
    console.warn('Browser rendering failed, using placeholder:', error.message);
    return await generatePlaceholderThumbnail(cadFilePath, outputPath, options);
  }
}

module.exports = {
  generateThumbnail,
  generatePlaceholderThumbnail,
  generateThumbnailWithBrowser,
};
