/**
 * Server-side CAD Thumbnail Generator
 * Uses headless Three.js with node-canvas to render CAD files to PNG thumbnails
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate a thumbnail from a CAD file
 * @param {string} filePath - Absolute path to the CAD file
 * @param {string} outputPath - Where to save the thumbnail
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Path to generated thumbnail
 */
async function generateThumbnail(filePath, outputPath, options = {}) {
  const {
    width = 800,
    height = 600,
    format = 'png',
    quality = 0.9,
    cameraPosition = { x: 2, y: 2, z: 2 },
    backgroundColor = 0x0b1220,
  } = options;

  try {
    // Dynamic imports for server-side rendering
    const { createCanvas } = await import('canvas');
    const THREE = await import('three');
    
    // Import loaders based on file type
    const ext = path.extname(filePath).toLowerCase();
    let loader;
    
    switch (ext) {
      case '.stl':
        const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
        loader = new STLLoader();
        break;
      case '.obj':
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
        loader = new OBJLoader();
        break;
      case '.fbx':
        const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
        loader = new FBXLoader();
        break;
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }

    // Create canvas and renderer
    const canvas = createCanvas(width, height);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(backgroundColor, 1);

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // Setup camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(0, 0, 0);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(3, 5, 2);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-3, -5, -2);
    scene.add(directionalLight2);

    // Load model
    const fileBuffer = fs.readFileSync(filePath);
    let geometry;

    if (ext === '.stl') {
      geometry = loader.parse(fileBuffer.buffer);
      const material = new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        metalness: 0.3,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
    } else if (ext === '.obj') {
      const textDecoder = new TextDecoder();
      const text = textDecoder.decode(fileBuffer);
      const object = loader.parse(text);
      
      // Apply material to all meshes
      object.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            metalness: 0.3,
            roughness: 0.4,
          });
        }
      });
      scene.add(object);
    }

    // Center and scale model
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;

    scene.children.forEach((child) => {
      if (child.isLight) return;
      child.position.sub(center);
      child.scale.multiplyScalar(scale);
    });

    // Render
    renderer.render(scene, camera);

    // Save to file
    const buffer = canvas.toBuffer('image/png', { compressionLevel: 9 });
    fs.writeFileSync(outputPath, buffer);

    // Cleanup
    renderer.dispose();
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    return outputPath;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Generate multiple thumbnail views (front, iso, top)
 * @param {string} filePath - Path to CAD file
 * @param {string} outputDir - Directory for thumbnails
 * @returns {Promise<object>} - Paths to generated thumbnails
 */
async function generateMultiViewThumbnails(filePath, outputDir) {
  const basename = path.basename(filePath, path.extname(filePath));
  
  const views = {
    iso: { x: 2, y: 2, z: 2 },
    front: { x: 0, y: 0, z: 3 },
    top: { x: 0, y: 3, z: 0 },
  };

  const thumbnails = {};

  for (const [view, position] of Object.entries(views)) {
    const outputPath = path.join(outputDir, `${basename}_${view}.png`);
    await generateThumbnail(filePath, outputPath, {
      cameraPosition: position,
      width: view === 'iso' ? 800 : 400,
      height: view === 'iso' ? 600 : 300,
    });
    thumbnails[view] = path.basename(outputPath);
  }

  return thumbnails;
}

module.exports = {
  generateThumbnail,
  generateMultiViewThumbnails,
};
