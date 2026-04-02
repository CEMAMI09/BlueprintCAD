/**
 * Headless Three.js Thumbnail Generator
 * Software z-buffer rasterization (correct occlusion). Painter-sorted 2D fills
 * fail on real meshes — background shows through as gaps/spots.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { PNG } = require('pngjs');
const THREE = require('three');
const { REPO_ROOT } = require('./repoRoot');

/** Barycentric weights for p0, p1, p2 (same order as triangle indices). */
function barycentric2D(px, py, p0x, p0y, p1x, p1y, p2x, p2y) {
  const v0x = p1x - p0x;
  const v0y = p1y - p0y;
  const v1x = p2x - p0x;
  const v1y = p2y - p0y;
  const v2x = px - p0x;
  const v2y = py - p0y;
  const d00 = v0x * v0x + v0y * v0y;
  const d01 = v0x * v1x + v0y * v1y;
  const d11 = v1x * v1x + v1y * v1y;
  const d20 = v2x * v0x + v2y * v0y;
  const d21 = v2x * v1x + v2y * v1y;
  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-24) return null;
  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;
  const eps = -1e-5;
  if (u >= eps && v >= eps && w >= eps) return { u, v, w };
  return null;
}

/**
 * Generate thumbnail from CAD file using Three.js geometry + software z-buffer rasterization
 * @param {string} cadFilePath - Full path to CAD file
 * @param {string} outputPath - Full path where thumbnail should be saved
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Path to generated thumbnail
 */
async function generateThumbnail(cadFilePath, outputPath, options = {}) {
  const {
    width = 1200,
    height = 675,
    backgroundColor = 0x0a0f18,
    cameraAngle = { x: 32, y: 42 },
  } = options;

  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create Three.js scene for geometry processing
    const scene = new THREE.Scene();

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
            // For binary STL: use a proper ArrayBuffer slice (Node Buffer.pool can make data.buffer oversized)
            const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            geometry = loader.parse(ab);
          }
        } catch (parseError) {
          // If parsing fails, try the other format
          console.warn(`[Thumbnail] Failed to parse as ${isASCII ? 'ASCII' : 'Binary'}, trying alternative...`);
          try {
            if (isASCII) {
              const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
              geometry = loader.parse(ab);
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
        if (!geometry.attributes.normal) {
          geometry.computeVertexNormals();
        }
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
          } else {
            geometry.computeVertexNormals();
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
      
      // Normalize to ~2 units max extent so bounding-sphere math is stable; final framing uses true bounds
      const scale = 2 / maxDim;
      geometry.scale(scale, scale, scale);
      
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      
      console.log(`[Thumbnail] Scaled by ${scale.toFixed(4)}, geometry centered and scaled`);
    } else {
      console.warn(`[Thumbnail] Warning: maxDim is 0, model may not render correctly`);
    }

    mesh.updateMatrixWorld(true);
    const fitBox = new THREE.Box3().setFromObject(mesh);
    const sphere = fitBox.getBoundingSphere(new THREE.Sphere());
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1e6);
    const angleX = (cameraAngle.x * Math.PI) / 180;
    const angleY = (cameraAngle.y * Math.PI) / 180;
    const dir = new THREE.Vector3(
      Math.sin(angleY) * Math.cos(angleX),
      Math.sin(angleX),
      Math.cos(angleY) * Math.cos(angleX)
    ).normalize();
    const fovRad = (camera.fov * Math.PI) / 180;
    const tanHalf = Math.tan(fovRad / 2);
    const margin = 1.22;
    let r = Math.max(sphere.radius * margin, 0.001);
    const distV = r / tanHalf;
    const distH = r / (tanHalf * aspect);
    const dist = Math.max(distV, distH);
    camera.position.copy(dir.clone().multiplyScalar(dist));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    console.log(
      `[Thumbnail] Camera fit: radius≈${sphere.radius.toFixed(3)}, dist=${dist.toFixed(3)}, aspect=${aspect.toFixed(2)}`
    );
    console.log(`[Thumbnail] Software z-buffer rasterization (perspective-correct depth)...`);

    const light1 = new THREE.DirectionalLight(0xffffff, 0.9);
    light1.position.set(6, 10, 8);
    const light2 = new THREE.DirectionalLight(0xffffff, 0.42);
    light2.position.set(-5, -4, -6);

    /** Constant directions toward the lights (directional approximation). */
    const L1 = new THREE.Vector3().copy(light1.position).normalize();
    const L2 = new THREE.Vector3().copy(light2.position).normalize();
    const camPos = camera.position;

    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const vertexCount = positions.count;
    const indices = geometry.index ? geometry.index.array : null;

    const bgR = (backgroundColor >> 16) & 0xff;
    const bgG = (backgroundColor >> 8) & 0xff;
    const bgB = backgroundColor & 0xff;

    const png = new PNG({ width, height });
    const zBuffer = new Float32Array(width * height);
    zBuffer.fill(1);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      png.data[o] = bgR;
      png.data[o + 1] = bgG;
      png.data[o + 2] = bgB;
      png.data[o + 3] = 255;
    }

    const mvp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    mvp.multiply(mesh.matrixWorld);

    const worldMatrix = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix);
    const clips = [];
    const screens = [];
    const worldPosArr = new Float32Array(vertexCount * 3);
    const worldNorArr = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const clip = new THREE.Vector4(x, y, z, 1).applyMatrix4(mvp);
      clips.push(clip);

      const invW = 1 / clip.w;
      const ndcX = clip.x * invW;
      const ndcY = clip.y * invW;
      screens.push({
        x: (ndcX * 0.5 + 0.5) * width,
        y: (-ndcY * 0.5 + 0.5) * height,
      });

      const wp = new THREE.Vector3(x, y, z).applyMatrix4(worldMatrix);
      const o3 = i * 3;
      worldPosArr[o3] = wp.x;
      worldPosArr[o3 + 1] = wp.y;
      worldPosArr[o3 + 2] = wp.z;

      let normal = new THREE.Vector3(0, 0, 1);
      if (normals) {
        normal = new THREE.Vector3(normals.getX(i), normals.getY(i), normals.getZ(i))
          .applyMatrix3(normalMatrix)
          .normalize();
      }
      worldNorArr[o3] = normal.x;
      worldNorArr[o3 + 1] = normal.y;
      worldNorArr[o3 + 2] = normal.z;
    }

    const baseR = 0;
    const baseG = 136;
    const baseB = 255;

    /** Per-pixel Phong-style: diffuse + Blinn spec + rim (more depth than vertex Gouraud). */
    const ambient = 0.11;
    const keyDiff = 0.58;
    const fillDiff = 0.26;
    const specPow = 56;
    const specStr = 0.32;
    const rimPow = 2.4;
    const rimStr = 0.14;

    function drawTri(i0, i1, i2) {
      const c0 = clips[i0];
      const c1 = clips[i1];
      const c2 = clips[i2];
      if (c0.w <= 1e-6 || c1.w <= 1e-6 || c2.w <= 1e-6) return;

      const p0 = screens[i0];
      const p1 = screens[i1];
      const p2 = screens[i2];
      const invW0 = 1 / c0.w;
      const invW1 = 1 / c1.w;
      const invW2 = 1 / c2.w;
      const ndcZ0 = c0.z * invW0;
      const ndcZ1 = c1.z * invW1;
      const ndcZ2 = c2.z * invW2;

      const o0 = i0 * 3;
      const o1 = i1 * 3;
      const o2 = i2 * 3;
      const wx0 = worldPosArr[o0];
      const wy0 = worldPosArr[o0 + 1];
      const wz0 = worldPosArr[o0 + 2];
      const wx1 = worldPosArr[o1];
      const wy1 = worldPosArr[o1 + 1];
      const wz1 = worldPosArr[o1 + 2];
      const wx2 = worldPosArr[o2];
      const wy2 = worldPosArr[o2 + 1];
      const wz2 = worldPosArr[o2 + 2];
      const nx0 = worldNorArr[o0];
      const ny0 = worldNorArr[o0 + 1];
      const nz0 = worldNorArr[o0 + 2];
      const nx1 = worldNorArr[o1];
      const ny1 = worldNorArr[o1 + 1];
      const nz1 = worldNorArr[o1 + 2];
      const nx2 = worldNorArr[o2];
      const ny2 = worldNorArr[o2 + 1];
      const nz2 = worldNorArr[o2 + 2];

      let minX = Math.floor(Math.min(p0.x, p1.x, p2.x));
      let maxX = Math.ceil(Math.max(p0.x, p1.x, p2.x));
      let minY = Math.floor(Math.min(p0.y, p1.y, p2.y));
      let maxY = Math.ceil(Math.max(p0.y, p1.y, p2.y));
      minX = Math.max(0, minX);
      maxX = Math.min(width - 1, maxX);
      minY = Math.max(0, minY);
      maxY = Math.min(height - 1, maxY);

      const L1x = L1.x;
      const L1y = L1.y;
      const L1z = L1.z;
      const L2x = L2.x;
      const L2y = L2.y;
      const L2z = L2.z;
      const cpx = camPos.x;
      const cpy = camPos.y;
      const cpz = camPos.z;

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const cx = px + 0.5;
          const cy = py + 0.5;
          const bc = barycentric2D(cx, cy, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
          if (!bc) continue;
          const { u, v, w } = bc;
          const denom = u * invW0 + v * invW1 + w * invW2;
          if (denom <= 0) continue;
          const zNdc = (u * ndcZ0 * invW0 + v * ndcZ1 * invW1 + w * ndcZ2 * invW2) / denom;
          const idx = py * width + px;
          if (zNdc >= zBuffer[idx]) continue;
          zBuffer[idx] = zNdc;

          const wx =
            (u * wx0 * invW0 + v * wx1 * invW1 + w * wx2 * invW2) / denom;
          const wy =
            (u * wy0 * invW0 + v * wy1 * invW1 + w * wy2 * invW2) / denom;
          const wz =
            (u * wz0 * invW0 + v * wz1 * invW1 + w * wz2 * invW2) / denom;

          let nx =
            (u * nx0 * invW0 + v * nx1 * invW1 + w * nx2 * invW2) / denom;
          let ny =
            (u * ny0 * invW0 + v * ny1 * invW1 + w * ny2 * invW2) / denom;
          let nz =
            (u * nz0 * invW0 + v * nz1 * invW1 + w * nz2 * invW2) / denom;
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (nLen < 1e-12) continue;
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;

          const vx = cpx - wx;
          const vy = cpy - wy;
          const vz = cpz - wz;
          const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (vLen < 1e-12) continue;
          const vnx = vx / vLen;
          const vny = vy / vLen;
          const vnz = vz / vLen;

          const d1 = Math.max(0, nx * L1x + ny * L1y + nz * L1z);
          const d2 = Math.max(0, nx * L2x + ny * L2y + nz * L2z);
          const diffuse = ambient + keyDiff * d1 + fillDiff * d2;

          const hx = L1x + vnx;
          const hy = L1y + vny;
          const hz = L1z + vnz;
          const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
          let spec = 0;
          if (hLen > 1e-12) {
            const hnx = hx / hLen;
            const hny = hy / hLen;
            const hnz = hz / hLen;
            const ndh = Math.max(0, nx * hnx + ny * hny + nz * hnz);
            spec = Math.pow(ndh, specPow) * specStr;
          }

          const ndv = Math.max(0, nx * vnx + ny * vny + nz * vnz);
          const rim = rimStr * Math.pow(1 - ndv, rimPow);

          const shade = Math.min(1.15, diffuse + spec + rim);
          const rr = Math.min(255, Math.floor(baseR * shade + 255 * spec * 0.85));
          const gg = Math.min(255, Math.floor(baseG * shade + 255 * spec * 0.92));
          const bb = Math.min(255, Math.floor(baseB * shade + 255 * spec * 1));

          const o = idx * 4;
          png.data[o] = rr;
          png.data[o + 1] = gg;
          png.data[o + 2] = bb;
          png.data[o + 3] = 255;
        }
      }
    }

    let triCount = 0;
    if (indices) {
      triCount = indices.length / 3;
      for (let i = 0; i < indices.length; i += 3) {
        drawTri(indices[i], indices[i + 1], indices[i + 2]);
      }
    } else {
      triCount = vertexCount / 3;
      for (let i = 0; i < vertexCount; i += 3) {
        drawTri(i, i + 1, i + 2);
      }
    }

    if (triCount > 120000) {
      console.warn(`[Thumbnail] Large mesh (${triCount} tris); render may take a moment`);
    } else {
      console.log(`[Thumbnail] Triangle count: ${triCount}`);
    }

    const buffer = PNG.sync.write(png);
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
  const { width = 1200, height = 675 } = options;
  
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
  const thumbsDir = path.join(REPO_ROOT, 'storage', 'uploads', 'thumbnails');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  const thumbnailFileName = `${designId}_thumb.png`;
  const thumbnailPath = path.join(thumbsDir, thumbnailFileName);
  const thumbnailUrl = `thumbnails/${thumbnailFileName}`;
  const renderOpts = { width: 1200, height: 675, ...options };

  try {
    // Check if file is viewable and supported
    // isViewable expects extension with dot (e.g., '.stl')
    console.log(`[Thumbnail] Generating for design ${designId}, file: ${cadFilePath}, ext: ${ext}, isViewable: ${isViewable(ext)}`);

    if (isViewable(ext)) {
      // Try to generate actual thumbnail for all viewable formats
      try {
        console.log(`[Thumbnail] Attempting 3D render for ${designId}...`);
        await generateThumbnail(cadFilePath, thumbnailPath, renderOpts);
        
        // Verify the thumbnail was actually created and is substantial
        const fs = require('fs');
        if (fs.existsSync(thumbnailPath)) {
          const stats = fs.statSync(thumbnailPath);
          // PNGs compress well; 15k+ was rejecting valid 3D renders (~6–12KB). Only reject clearly broken files.
          if (stats.size >= 512) {
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
          await generatePlaceholderThumbnail(cadFilePath, thumbnailPath, renderOpts);
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
      await generatePlaceholderThumbnail(cadFilePath, thumbnailPath, renderOpts);
      return thumbnailUrl;
    }
  } catch (error) {
    console.error(`[Thumbnail] Complete failure for ${designId}:`, error.message);
    // Always try to generate placeholder - never return null
    try {
      console.log(`[Thumbnail] Generating placeholder for ${designId}...`);
      await generatePlaceholderThumbnail(cadFilePath, thumbnailPath, renderOpts);
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
