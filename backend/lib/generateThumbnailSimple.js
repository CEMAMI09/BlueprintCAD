// backend/lib/generateThumbnailSimple.js
// Simple thumbnail generator that doesn't require canvas (for Railway compatibility)

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

/**
 * Generate a simple placeholder thumbnail without canvas
 * Creates a visible PNG with file info
 */
async function generateSimplePlaceholder(fileName, outputPath, projectId) {
  try {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a 800x600 PNG with a simple design
    const width = 800;
    const height = 600;
    const png = new PNG({ width, height });

    // Fill with dark blue gradient background (Blueprint theme)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        
        // Dark blue gradient
        const gradient = y / height;
        png.data[idx] = Math.floor(10 + gradient * 15);     // R
        png.data[idx + 1] = Math.floor(15 + gradient * 20); // G
        png.data[idx + 2] = Math.floor(24 + gradient * 30); // B
        png.data[idx + 3] = 255; // A (opaque)
      }
    }

    // Draw a simple 3D cube outline in the center
    const centerX = width / 2;
    const centerY = height / 2;
    const cubeSize = 120;
    const offset = 30;

    // Helper to set pixel color
    const setPixel = (x, y, r, g, b) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (width * y + x) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    };

    // Draw cube outline in blue (#0088ff)
    const blueR = 0;
    const blueG = 136;
    const blueB = 255;

    // Front face
    for (let i = 0; i < cubeSize; i++) {
      setPixel(centerX - cubeSize/2, centerY - cubeSize/2 + i, blueR, blueG, blueB);
      setPixel(centerX + cubeSize/2, centerY - cubeSize/2 + i, blueR, blueG, blueB);
      setPixel(centerX - cubeSize/2 + i, centerY - cubeSize/2, blueR, blueG, blueB);
      setPixel(centerX - cubeSize/2 + i, centerY + cubeSize/2, blueR, blueG, blueB);
    }

    // Top face (perspective)
    for (let i = 0; i < cubeSize; i++) {
      setPixel(centerX - cubeSize/2 + i, centerY - cubeSize/2, blueR, blueG, blueB);
      setPixel(centerX - cubeSize/2 + offset + i, centerY - cubeSize/2 - offset, blueR, blueG, blueB);
      setPixel(centerX - cubeSize/2 + i, centerY - cubeSize/2, blueR, blueG, blueB);
    }

    // Right face (perspective)
    for (let i = 0; i < cubeSize; i++) {
      setPixel(centerX + cubeSize/2, centerY - cubeSize/2 + i, blueR, blueG, blueB);
      setPixel(centerX + cubeSize/2 + offset, centerY - cubeSize/2 - offset + i, blueR, blueG, blueB);
    }

    // Write file extension text (simple ASCII representation)
    const ext = path.extname(fileName).toUpperCase().slice(1) || 'CAD';
    // Draw simple text using pixels (very basic)
    // For a better implementation, you'd use a font rendering library
    
    // Save the PNG
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      png.pack().pipe(stream);
      
      stream.on('finish', () => {
        console.log(`[Thumbnail] Created visible placeholder at ${outputPath}`);
        resolve(outputPath);
      });
      
      stream.on('error', (err) => {
        console.error(`[Thumbnail] Failed to write placeholder:`, err);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`[Thumbnail] Failed to create simple placeholder:`, error);
    throw error;
  }
}

module.exports = { generateSimplePlaceholder };

