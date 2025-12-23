// backend/lib/generateThumbnailSimple.js
// Simple thumbnail generator that doesn't require canvas (for Railway compatibility)

const fs = require("fs");
const path = require("path");

/**
 * Generate a simple placeholder thumbnail without canvas
 * Creates a minimal PNG with file info
 */
async function generateSimplePlaceholder(fileName, outputPath, projectId) {
  try {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // For now, create a minimal 1x1 PNG placeholder
    // In a full implementation, you could use a library like 'pngjs' to create proper thumbnails
    // But for now, we'll just create an empty file and let the frontend handle the placeholder
    
    // Create a minimal valid PNG (1x1 transparent pixel)
    // PNG signature + minimal IHDR + IEND
    const minimalPNG = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x1F, 0x15, 0xC4, 0x89, // CRC
      0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
      0x0D, 0x0A, 0x2D, 0xB4, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    await fs.promises.writeFile(outputPath, minimalPNG);
    console.log(`[Thumbnail] Created simple placeholder at ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`[Thumbnail] Failed to create simple placeholder:`, error);
    throw error;
  }
}

module.exports = { generateSimplePlaceholder };

