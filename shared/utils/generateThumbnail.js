/**
 * Headless Three.js Thumbnail Generator
 * Uses node-canvas for 2D projection rendering
 * No Puppeteer or external services required
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const THREE = require('three');

/**
 * Generate thumbnail from CAD file using Three.js geometry + canvas 2D projection
 * @param {string} cadFilePath - Full path to CAD file
 * @param {string} outputPath - Full path where thumbnail should be saved
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Path to generated thumbnail
 */
async function generateThumbnail(cadFilePath, outputPath, options = {}) {
  const {
    width = 800,
    height = 600,
    backgroundColor = 0x0a0f18,
    cameraAngle = { x: 30, y: 25 },
  } = options;

  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Create Three.js scene for geometry processing
    const scene = new THREE.Scene();

    // Setup camera (30° x 25° angle as specified)
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const angleX = (cameraAngle.x * Math.PI) / 180;
    const angleY = (cameraAngle.y * Math.PI) / 180;
    const distance = 5;
    camera.position.set(
      distance * Math.sin(angleY) * Math.cos(angleX),
      distance * Math.sin(angleX),
      distance * Math.cos(angleY) * Math.cos(angleX)
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // Load CAD file
    const ext = path.extname(cadFilePath).toLowerCase();
    let geometry;
    
    // Check if file exists
    if (!fs.existsSync(cadFilePath)) {
      throw new Error(`CAD file not found: ${cadFilePath}`);
    }

    console.log(`[Thumbnail] Loading CAD file: ${cadFilePath}, extension: ${ext}`);

    if (ext === '.stl') {
      try {
        // Use dynamic import for ESM module
        const STLLoaderModule = await import('three/examples/jsm/loaders/STLLoader.js');
        const { STLLoader } = STLLoaderModule;
        const loader = new STLLoader();
        const data = fs.readFileSync(cadFilePath);
        console.log(`[Thumbnail] STL file size: ${data.length} bytes`);
        
        // Check if it's ASCII or binary STL
        // ASCII STL files start with "solid" (case-insensitive)
        const header = data.toString('utf8', 0, Math.min(100, data.length)).trim();
        const isASCII = header.toLowerCase().startsWith('solid');
        console.log(`[Thumbnail] STL format: ${isASCII ? 'ASCII' : 'Binary'}`);
        
        try {
          if (isASCII) {
            // For ASCII STL, parse as text string
            const text = data.toString('utf8');
            geometry = loader.parse(text);
          } else {
            // For binary STL, parse as ArrayBuffer
            geometry = loader.parse(data.buffer);
          }
        } catch (parseError) {
          // If parsing fails, try the other format
          console.warn(`[Thumbnail] Failed to parse as ${isASCII ? 'ASCII' : 'Binary'}, trying alternative...`);
          try {
            if (isASCII) {
              geometry = loader.parse(data.buffer);
            } else {
              geometry = loader.parse(data.toString('utf8'));
            }
            console.log(`[Thumbnail] Successfully parsed using alternative method`);
          } catch (altError) {
            console.error(`[Thumbnail] Both parsing methods failed:`, altError.message);
            throw altError;
          }
        }
        
        console.log(`[Thumbnail] STL geometry loaded, vertices: ${geometry.attributes.position.count}`);
      } catch (stlError) {
        console.error(`[Thumbnail] STL loading error:`, stlError.message);
        throw stlError;
      }
    } else if (ext === '.obj') {
      try {
        // Use dynamic import for ESM module
        const OBJLoaderModule = await import('three/examples/jsm/loaders/OBJLoader.js');
        const { OBJLoader } = OBJLoaderModule;
        const loader = new OBJLoader();
        const data = fs.readFileSync(cadFilePath, 'utf8');
        console.log(`[Thumbnail] OBJ file size: ${data.length} bytes`);
        const object = loader.parse(data);
        console.log(`[Thumbnail] OBJ object loaded`);
      
        // Extract geometry from OBJ object
        geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        
        object.traverse((child) => {
          if (child.isMesh && child.geometry) {
            const pos = child.geometry.attributes.position;
            const norm = child.geometry.attributes.normal;
            
            if (pos) {
              for (let i = 0; i < pos.count; i++) {
                positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
                if (norm) {
                  normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
                }
              }
            }
          }
        });
        
        if (positions.length > 0) {
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          if (normals.length > 0) {
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
          }
          console.log(`[Thumbnail] OBJ geometry extracted, vertices: ${positions.length / 3}`);
        } else {
          throw new Error('No geometry found in OBJ file');
        }
      } catch (objError) {
        console.error(`[Thumbnail] OBJ loading error:`, objError.message);
        throw objError;
      }
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    // Create material for lighting calculations
    const material = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      metalness: 0.3,
      roughness: 0.4,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Auto-center and auto-scale model
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    console.log(`[Thumbnail] Model bounds: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}, maxDim: ${maxDim.toFixed(2)}`);
    
    if (maxDim > 0) {
      // First, center the geometry at origin
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Then scale to fit in frame (with some padding)
      const scale = 1.5 / maxDim;
      geometry.scale(scale, scale, scale);
      
      // Reset mesh position since geometry is now centered
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      
      console.log(`[Thumbnail] Scaled by ${scale.toFixed(4)}, geometry centered and scaled`);
    } else {
      console.warn(`[Thumbnail] Warning: maxDim is 0, model may not render correctly`);
    }

    mesh.updateMatrixWorld();
    camera.lookAt(0, 0, 0); // Look at origin since model is centered there
    camera.updateMatrixWorld();
    
    console.log(`[Thumbnail] Starting 2D projection rendering...`);

    // Setup lighting for shading calculation
    const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
    light1.position.set(3, 5, 2);
    const light2 = new THREE.DirectionalLight(0xffffff, 0.3);
    light2.position.set(-3, -5, -2);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);

    // Render using 2D canvas projection
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const vertexCount = positions.count;
    const indices = geometry.index ? geometry.index.array : null;
    
    // Clear canvas with solid background (no transparency)
    const bgColor = `#${backgroundColor.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, width, height);
    
    // Project vertices to 2D and calculate lighting
    const projectedVerts = [];
    const worldMatrix = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix);
    
    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Transform to world space
      const worldPos = new THREE.Vector3(x, y, z).applyMatrix4(worldMatrix);
      const projected = worldPos.project(camera);
      const screenX = (projected.x * 0.5 + 0.5) * width;
      const screenY = (-projected.y * 0.5 + 0.5) * height;
      
      // Calculate normal in world space for lighting
      let normal = new THREE.Vector3(0, 0, 1);
      if (normals) {
        const nx = normals.getX(i);
        const ny = normals.getY(i);
        const nz = normals.getZ(i);
        normal = new THREE.Vector3(nx, ny, nz).applyMatrix3(normalMatrix).normalize();
      }
      
      // Simple lighting calculation
      const lightDir1 = new THREE.Vector3().subVectors(light1.position, worldPos).normalize();
      const lightDir2 = new THREE.Vector3().subVectors(light2.position, worldPos).normalize();
      const dot1 = Math.max(0, normal.dot(lightDir1));
      const dot2 = Math.max(0, normal.dot(lightDir2));
      const lighting = 0.6 + (dot1 * 0.8 + dot2 * 0.3);
      
      projectedVerts.push({ 
        x: screenX, 
        y: screenY, 
        z: projected.z,
        lighting: Math.min(1, lighting)
      });
    }
    
    // Draw triangles with lighting
    ctx.lineWidth = 1;
    
    // Sort triangles by depth for proper rendering
    const triangles = [];
    
    if (indices) {
      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];
        const v0 = projectedVerts[i0];
        const v1 = projectedVerts[i1];
        const v2 = projectedVerts[i2];
        const avgZ = (v0.z + v1.z + v2.z) / 3;
        const avgLighting = (v0.lighting + v1.lighting + v2.lighting) / 3;
        triangles.push({ v0, v1, v2, z: avgZ, lighting: avgLighting });
      }
    } else {
      for (let i = 0; i < projectedVerts.length; i += 3) {
        const v0 = projectedVerts[i];
        const v1 = projectedVerts[i + 1];
        const v2 = projectedVerts[i + 2];
        const avgZ = (v0.z + v1.z + v2.z) / 3;
        const avgLighting = (v0.lighting + v1.lighting + v2.lighting) / 3;
        triangles.push({ v0, v1, v2, z: avgZ, lighting: avgLighting });
      }
    }
    
    // Sort by depth (back to front)
    triangles.sort((a, b) => a.z - b.z);
    
    // Determine if model is low-poly or high-poly based on triangle count
    // Low-poly: < 1000 triangles, High-poly: >= 1000 triangles
    const isLowPoly = triangles.length < 1000;
    const alpha = isLowPoly ? 1.0 : 0.95; // Solid for low-poly, slightly transparent for high-poly
    
    console.log(`[Thumbnail] Triangle count: ${triangles.length}, isLowPoly: ${isLowPoly}, alpha: ${alpha}`);
    
    // Draw triangles with appropriate transparency
    for (const tri of triangles) {
      const { v0, v1, v2 } = tri;
      
      const baseColor = { r: 0, g: 136, b: 255 }; // #0088ff
      const minLight = 0.3;
      const maxLight = 1.0;
      
      // Calculate average lighting for the triangle
      const avgLight = Math.max(minLight, Math.min(maxLight, (v0.lighting + v1.lighting + v2.lighting) / 3));
      
      // Calculate color based on average lighting
      const r = Math.floor(baseColor.r * avgLight);
      const g = Math.floor(baseColor.g * avgLight);
      const b = Math.floor(baseColor.b * avgLight);
      
      // Draw filled triangle with appropriate alpha
      // For low-poly models, use rgb() to ensure no transparency
      // For high-poly models, use rgba() with slight transparency
      if (isLowPoly) {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.globalAlpha = 1.0; // Force full opacity for low-poly
      } else {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.globalAlpha = alpha;
      }
      
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.closePath();
      ctx.fill();
      
      // Add subtle edge for definition (only on front-facing bright faces)
      if (avgLight > 0.6 && tri.z > -0.5) {
        ctx.strokeStyle = isLowPoly 
          ? `rgb(${Math.min(255, Math.floor(r * 1.15))}, ${Math.min(255, Math.floor(g * 1.15))}, ${Math.min(255, Math.floor(b * 1.15))})`
          : `rgba(${Math.min(255, Math.floor(r * 1.15))}, ${Math.min(255, Math.floor(g * 1.15))}, ${Math.min(255, Math.floor(b * 1.15))}, ${alpha * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = isLowPoly ? 1.0 : alpha * 0.6;
        ctx.stroke();
        ctx.globalAlpha = isLowPoly ? 1.0 : alpha;
      }
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    // Verify file was written
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Thumbnail file was not created at ${outputPath}`);
    }
    
    const fileStats = fs.statSync(outputPath);
    if (fileStats.size === 0) {
      throw new Error(`Thumbnail file is empty at ${outputPath}`);
    }
    
    console.log(`[Thumbnail] Saved thumbnail to ${outputPath}, size: ${fileStats.size} bytes`);

    // Cleanup
    geometry.dispose();
    material.dispose();

    return outputPath;
  } catch (error) {
    console.error(`[Thumbnail] Thumbnail generation error for ${cadFilePath}:`, error.message);
    console.error(`[Thumbnail] Error stack:`, error.stack);
    throw error; // Re-throw so caller knows it failed
  }
}

/**
 * Generate placeholder thumbnail as fallback
 * @param {string} fileName - Name of the file
 * @param {string} outputPath - Where to save thumbnail
 * @param {object} options - Options
 */
async function generatePlaceholderThumbnail(fileName, outputPath, options = {}) {
  const { width = 800, height = 600 } = options;
  
  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient (Blueprint theme)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#0b1220');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 3D cube icon
    ctx.strokeStyle = '#0088ff';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 136, 255, 0.1)';
    
    // Front face
    ctx.beginPath();
    ctx.rect(width / 2 - 40, height / 2 - 20, 80, 80);
    ctx.fill();
    ctx.stroke();
    
    // Top face
    ctx.beginPath();
    ctx.moveTo(width / 2 - 40, height / 2 - 20);
    ctx.lineTo(width / 2 - 20, height / 2 - 40);
    ctx.lineTo(width / 2 + 60, height / 2 - 40);
    ctx.lineTo(width / 2 + 40, height / 2 - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Right face
    ctx.beginPath();
    ctx.moveTo(width / 2 + 40, height / 2 - 20);
    ctx.lineTo(width / 2 + 60, height / 2 - 40);
    ctx.lineTo(width / 2 + 60, height / 2 + 40);
    ctx.lineTo(width / 2 + 40, height / 2 + 60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // File extension text
    const ext = path.extname(fileName).toUpperCase().slice(1) || 'CAD';
    ctx.fillStyle = '#0088ff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ext, width / 2, height / 2 - 100);

    // File name
    const basename = path.basename(fileName);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.fillText(basename.length > 30 ? basename.substring(0, 30) + '...' : basename, width / 2, height / 2 + 100);

    // Save
    const buffer = canvas.toBuffer('image/png');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  } catch (error) {
    console.error('Placeholder generation failed:', error);
    throw error;
  }
}

/**
 * Main thumbnail generation function with fallback
 * @param {string} cadFilePath - Full path to CAD file
 * @param {string} designId - Design ID for naming
 * @param {object} options - Options
 * @returns {Promise<string>} - Relative path to thumbnail
 */
async function generateThumbnailForDesign(cadFilePath, designId, options = {}) {
  const { isViewable } = require('./cad-formats');
  const ext = path.extname(cadFilePath).toLowerCase();
  
  // Ensure thumbnails directory exists
  const thumbsDir = path.join(process.cwd(), 'storage', 'uploads', 'thumbnails');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  const thumbnailFileName = `${designId}_thumb.png`;
  const thumbnailPath = path.join(thumbsDir, thumbnailFileName);
  const thumbnailUrl = `thumbnails/${thumbnailFileName}`;

  try {
    // Check if file is viewable and supported
    // isViewable expects extension with dot (e.g., '.stl')
    console.log(`[Thumbnail] Generating for design ${designId}, file: ${cadFilePath}, ext: ${ext}, isViewable: ${isViewable(ext)}`);
    
    if (isViewable(ext)) {
      // Try to generate actual thumbnail for all viewable formats
      try {
        console.log(`[Thumbnail] Attempting 3D render for ${designId}...`);
        await generateThumbnail(cadFilePath, thumbnailPath, options);
        
        // Verify the thumbnail was actually created and is substantial
        const fs = require('fs');
        if (fs.existsSync(thumbnailPath)) {
          const stats = fs.statSync(thumbnailPath);
          if (stats.size > 15000) {
            console.log(`[Thumbnail] Successfully generated 3D render for ${designId} (${stats.size} bytes)`);
            return thumbnailUrl;
          } else {
            console.warn(`[Thumbnail] 3D render file too small (${stats.size} bytes), might be corrupted - falling back to placeholder`);
            throw new Error(`Thumbnail file too small: ${stats.size} bytes`);
          }
        } else {
          console.error(`[Thumbnail] 3D render file not created at ${thumbnailPath}`);
          throw new Error(`Thumbnail file not created`);
        }
      } catch (threeError) {
        console.error(`[Thumbnail] ========================================`);
        console.error(`[Thumbnail] Three.js thumbnail generation FAILED for ${designId}`);
        console.error(`[Thumbnail] Error message: ${threeError.message}`);
        console.error(`[Thumbnail] Error type: ${threeError.constructor.name}`);
        console.error(`[Thumbnail] Stack:`, threeError.stack);
        console.error(`[Thumbnail] File: ${cadFilePath}`);
        console.error(`[Thumbnail] Output path: ${thumbnailPath}`);
        console.error(`[Thumbnail] ========================================`);
        console.warn(`[Thumbnail] Falling back to placeholder for ${designId}`);
        // Fallback to placeholder
        try {
          await generatePlaceholderThumbnail(cadFilePath, thumbnailPath, options);
          console.log(`[Thumbnail] Placeholder generated successfully for ${designId}`);
        } catch (placeholderError) {
          console.error(`[Thumbnail] Placeholder generation also failed:`, placeholderError.message);
          throw placeholderError; // Re-throw if placeholder also fails
        }
        return thumbnailUrl;
      }
    } else {
      console.log(`[Thumbnail] Unsupported format (${ext}), generating placeholder for ${designId}`);
      // Generate placeholder for unsupported formats
      await generatePlaceholderThumbnail(cadFilePath, thumbnailPath, options);
      return thumbnailUrl;
    }
  } catch (error) {
    console.error(`[Thumbnail] Complete failure for ${designId}:`, error.message);
    // Always try to generate placeholder - never return null
    try {
      console.log(`[Thumbnail] Generating placeholder for ${designId}...`);
      await generatePlaceholderThumbnail(cadFilePath, thumbnailPath, options);
      console.log(`[Thumbnail] Placeholder generated successfully for ${designId}`);
      return thumbnailUrl;
    } catch (fallbackError) {
      console.error(`[Thumbnail] Placeholder generation also failed for ${designId}:`, fallbackError.message);
      // Even if placeholder fails, return the URL - the file might still exist
      // This ensures the database always has a thumbnail_path
      return thumbnailUrl;
    }
  }
}

module.exports = {
  generateThumbnail,
  generatePlaceholderThumbnail,
  generateThumbnailForDesign,
};
