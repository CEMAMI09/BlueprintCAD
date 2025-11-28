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
  const {
    width = 800,
    height = 600,
    timeout = 30000,
  } = options;

  let browser;
  
  try {
    // Lazy load puppeteer only when needed
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Create a simple HTML page that loads our CADViewer
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #0b1220; overflow: hidden; }
    #viewer { width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
      }
    }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { STLLoader } from 'three/addons/loaders/STLLoader.js';
    import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    const camera = new THREE.PerspectiveCamera(50, ${width / height}, 0.1, 1000);
    camera.position.set(2, 2, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(${width}, ${height});
    document.getElementById('viewer').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(3, 5, 2);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-3, -5, -2);
    scene.add(dirLight2);

    const ext = '${path.extname(cadFilePath).toLowerCase()}';
    const loader = ext === '.stl' ? new STLLoader() : new OBJLoader();

    loader.load(
      '${cadFilePath}',
      (geometry) => {
        let object;
        if (ext === '.stl') {
          const material = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            metalness: 0.3,
            roughness: 0.4,
          });
          object = new THREE.Mesh(geometry, material);
        } else {
          object = geometry;
          object.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x0088ff,
                metalness: 0.3,
                roughness: 0.4,
              });
            }
          });
        }
        
        scene.add(object);

        // Center and scale
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.5 / maxDim;

        object.position.sub(center);
        object.scale.multiplyScalar(scale);

        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);

        // Signal render complete
        window.renderComplete = true;
      },
      undefined,
      (error) => {
        console.error('Load error:', error);
        window.renderError = error.message;
      }
    );
  </script>
</body>
</html>
    `;

    await page.setContent(html);

    // Wait for render to complete
    await page.waitForFunction(
      () => window.renderComplete || window.renderError,
      { timeout }
    );

    const error = await page.evaluate(() => window.renderError);
    if (error) {
      throw new Error(`Render error: ${error}`);
    }

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: 'png',
    });

    return outputPath;
  } catch (error) {
    console.error('Browser thumbnail generation failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
