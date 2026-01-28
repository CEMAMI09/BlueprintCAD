'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

type CADViewerProps = {
  // Support both File objects (upload) and URLs (existing files)
  file?: File;
  fileUrl?: string;
  fileName?: string;
  fileType?: string; // Explicit file type/extension (e.g., 'stl', 'obj')
  className?: string;
  height?: string;
  showControls?: boolean;
  autoRotate?: boolean;
  noWrapper?: boolean; // Remove outer wrapper styling
};

export default function CADViewer({
  file,
  fileUrl,
  fileName,
  fileType,
  className = '',
  height = 'h-96',
  showControls = true,
  autoRotate = false,
  noWrapper = false,
}: CADViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seqRef = useRef(0);
  const [isClient, setIsClient] = useState(false);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<{fileUrl?: string, fileType?: string, size?: any} | null>(null);

  // Detect file format from filename or URL
  const detectFormat = useCallback(() => {
    // If explicit fileType is provided, use that (most reliable)
    if (fileType) {
      return fileType.toLowerCase().replace('.', '');
    }
    // Otherwise, try to extract from filename or URL
    const name = fileName || file?.name || fileUrl || '';
    const ext = name.split('.').pop()?.toLowerCase();
    return ext;
  }, [file, fileUrl, fileName, fileType]);

  // Check if format is viewable (has Three.js loader support)
  const isViewableFormat = useCallback((format: string | undefined) => {
    if (!format) return false;
    const viewable = ['stl', 'obj', 'fbx', 'gltf', 'glb', 'ply', 'dae', 'collada'];
    return viewable.includes(format);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: any;
    let animationId: number | null = null;
    let objectUrl: string | ArrayBuffer | null = null;
    let disposed = false;

    const seq = ++seqRef.current;
    const format = detectFormat();

    async function init() {
      // Check if format is viewable at the start of init
      if (!isViewableFormat(format)) {
        setError(`${format?.toUpperCase() || 'This'} format cannot be previewed in 3D viewer. Download the file to view in specialized CAD software.`);
        setLoading(false);
        return;
      }
      try {
        if (!containerRef.current) return;
        setLoading(true);
        containerRef.current.innerHTML = '';

        // Dynamic imports for Three.js (enables code splitting)
        const [{
          Scene,
          PerspectiveCamera,
          WebGLRenderer,
          Color,
          AmbientLight,
          DirectionalLight,
          GridHelper,
          Box3,
          Vector3,
          Mesh,
          MeshStandardMaterial,
          sRGBEncoding,
        }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ]);

        if (seq !== seqRef.current) return;

        scene = new Scene();
        scene.background = new Color(0x0b1220);

        // Ensure container has dimensions
        if (!containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth || container.offsetWidth || 800;
        const height = container.clientHeight || container.offsetHeight || 600;
        
        if (width === 0 || height === 0) {
          console.warn('[CADViewer] Container has zero dimensions, using defaults');
        }
        
        camera = new PerspectiveCamera(50, width / height || 1, 0.1, 1000);
        camera.position.set(2, 2, 2);

        renderer = new WebGLRenderer({ antialias: true });
        renderer.setSize(width, height, false);
        renderer.outputEncoding = sRGBEncoding;
        
        // Ensure canvas fits container exactly
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        
        if (seq !== seqRef.current) return;
        container.appendChild(renderer.domElement);

        // Lights
        scene.add(new AmbientLight(0xffffff, 0.6));
        const dirLight = new DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(3, 5, 2);
        scene.add(dirLight);

        // Grid
        const grid = new GridHelper(10, 10, 0x334155, 0x1f2937);
        // @ts-ignore
        grid.material.opacity = 0.3;
        // @ts-ignore
        grid.material.transparent = true;
        scene.add(grid);

        // Controls with mobile support
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.5;
        
        // Mobile touch improvements
        controls.touches = {
          ONE: 2, // TOUCH.ROTATE
          TWO: 1  // TOUCH.DOLLY_PAN
        };

        // Load appropriate loader based on format
        let loader: any;
        let loaderModule: any;

        switch (format) {
          case 'stl':
            loaderModule = await import('three/examples/jsm/loaders/STLLoader.js');
            loader = new loaderModule.STLLoader();
            break;
          case 'obj':
            loaderModule = await import('three/examples/jsm/loaders/OBJLoader.js');
            loader = new loaderModule.OBJLoader();
            break;
          case 'fbx':
            loaderModule = await import('three/examples/jsm/loaders/FBXLoader.js');
            loader = new loaderModule.FBXLoader();
            break;
          case 'gltf':
            loaderModule = await import('three/examples/jsm/loaders/GLTFLoader.js');
            loader = new loaderModule.GLTFLoader();
            break;
          case 'glb':
            loaderModule = await import('three/examples/jsm/loaders/GLTFLoader.js');
            loader = new loaderModule.GLTFLoader();
            break;
          case 'ply':
            loaderModule = await import('three/examples/jsm/loaders/PLYLoader.js');
            loader = new loaderModule.PLYLoader();
            break;
          case 'dae':
          case 'collada':
            loaderModule = await import('three/examples/jsm/loaders/ColladaLoader.js');
            loader = new loaderModule.ColladaLoader();
            break;
          default:
            // Default to STL for unknown formats
            loaderModule = await import('three/examples/jsm/loaders/STLLoader.js');
            loader = new loaderModule.STLLoader();
        }

        // Get file URL (either from File object or direct URL)
        // Can be string (URL) or ArrayBuffer (for binary formats like STL)
        let loadUrl: string | ArrayBuffer;
        if (file) {
          objectUrl = URL.createObjectURL(file);
          loadUrl = objectUrl;
        } else if (fileUrl) {
          // For API files, fetch with authentication and convert to blob URL
          if (fileUrl.startsWith('/api/files/') || fileUrl.includes('/api/files/')) {
            try {
              const token = localStorage.getItem('token');
              const apiUrl = fileUrl.startsWith('/api/') 
                ? `${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`
                : fileUrl;
              console.log(`[CADViewer] Fetching file from: ${apiUrl}`);
              const response = await fetch(apiUrl, {
                credentials: 'include', // Include cookies for authentication
                headers: token ? {
                  'Authorization': `Bearer ${token}`
                } : {}
              });
              
              console.log(`[CADViewer] File fetch response:`, {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length'),
                ok: response.ok
              });
              
              if (!response.ok) {
                // Try to get error message from response
                let errorMessage = response.statusText;
                try {
                  const errorData = await response.json();
                  errorMessage = errorData.error || errorMessage;
                } catch {
                  // If response is not JSON, use statusText
                }
                console.error(`[CADViewer] Failed to load file: ${fileUrl}`, {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorMessage
                });
                throw new Error(`Failed to load file (${response.status}): ${errorMessage}`);
              }
              
              const blob = await response.blob();
              console.log(`[CADViewer] Blob created:`, {
                size: blob.size,
                type: blob.type
              });
              
              if (blob.size === 0) {
                throw new Error('File is empty (0 bytes)');
              }
              
              // For STL and other binary formats, try using ArrayBuffer directly
              // Some Three.js loaders work better with ArrayBuffer than blob URLs
              if (format === 'stl' || format === 'ply') {
                try {
                  const arrayBuffer = await blob.arrayBuffer();
                  console.log(`[CADViewer] Converted to ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
                  // STL loader can accept ArrayBuffer directly
                  objectUrl = arrayBuffer;
                  loadUrl = arrayBuffer;
                  console.log(`[CADViewer] Using ArrayBuffer for ${format} loader`);
                } catch (abError) {
                  console.warn(`[CADViewer] Failed to convert to ArrayBuffer, using blob URL:`, abError);
                  objectUrl = URL.createObjectURL(blob);
                  loadUrl = objectUrl;
                }
              } else {
                objectUrl = URL.createObjectURL(blob);
                loadUrl = objectUrl;
                console.log(`[CADViewer] Blob URL created: ${loadUrl}`);
              }
            } catch (err) {
              console.error(`[CADViewer] File fetch error for ${fileUrl}:`, err);
              throw new Error(`Failed to fetch file: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          } else {
            loadUrl = fileUrl;
          }
        } else {
          throw new Error('No file or fileUrl provided');
        }

        // Set up animation loop and resize handler early (needed for both ArrayBuffer and URL paths)
        const onResize = () => {
          if (!containerRef.current || !renderer || !camera) return;
          const container = containerRef.current;
          const rect = container.getBoundingClientRect();
          const w = rect.width || container.clientWidth || 800;
          const h = rect.height || container.clientHeight || 600;
          if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          }
        };
        window.addEventListener('resize', onResize);
        setTimeout(onResize, 100);

        const animate = () => {
          animationId = requestAnimationFrame(animate);
          if (!disposed && seq === seqRef.current) {
            if (controls) controls.update();
            if (renderer && scene && camera) {
              renderer.render(scene, camera);
            }
          }
        };
        animate();

        // Load and display model
        console.log(`[CADViewer] Starting model load, format: ${format}, loadUrl type: ${typeof loadUrl}`);
        
        // For STL/PLY with ArrayBuffer, use parse() instead of load()
        if ((format === 'stl' || format === 'ply') && loadUrl instanceof ArrayBuffer) {
          console.log(`[CADViewer] Using parse() for ${format} with ArrayBuffer`);
          try {
            const result = loader.parse(loadUrl);
            console.log(`[CADViewer] Parse success, result type:`, result?.constructor?.name || typeof result);
            
            if (seq !== seqRef.current) {
              console.log(`[CADViewer] Sequence mismatch, ignoring result`);
              return;
            }

            // STL/PLY return BufferGeometry
            const material = new MeshStandardMaterial({ 
              color: 0x60a5fa, 
              roughness: 0.5, 
              metalness: 0.1 
            });
            const meshToAdd = new Mesh(result, material);
            
            // Continue with centering and scaling logic (same as below)
            const box = new Box3().setFromObject(meshToAdd);
            const size = new Vector3();
            box.getSize(size);
            let maxDim = Math.max(size.x, size.y, size.z) || 1;
            if (maxDim < 0.01) maxDim = 0.01;
            
            const isCardView = !showControls && !autoRotate;
            const scale = isCardView ? 0.4 / maxDim : 0.8 / maxDim;
            const center = box.getCenter(new Vector3());
            meshToAdd.scale.setScalar(scale);
            meshToAdd.position.sub(center.multiplyScalar(scale));

            const toRemove: any[] = [];
            scene.traverse((obj: any) => {
              if (obj.isMesh || obj.isGroup) toRemove.push(obj);
            });
            toRemove.forEach((obj) => scene.remove(obj));

            scene.add(meshToAdd);
            
            const boxSize = Math.max(size.x, size.y, size.z) * scale;
            const fovRad = (50 * Math.PI) / 180;
            const distance = (boxSize / 2) / Math.tan(fovRad / 2) * 1.8;
            
            if (isCardView) {
              camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
            } else {
              camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
            }
            
            camera.lookAt(0, 0, 0);
            
            if (controls) {
              controls.target.set(0, 0, 0);
              controls.update();
            }
            
            // Force a render after adding the mesh
            if (renderer && scene && camera) {
              renderer.render(scene, camera);
              console.log(`[CADViewer] Mesh added to scene, forced render`);
            }
            
            setLoading(false);
            console.log(`[CADViewer] 3D model loaded successfully`);
          } catch (parseError) {
            console.error('[CADViewer] Parse error:', parseError);
            setError(`Failed to parse ${format.toUpperCase()} file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            setLoading(false);
          }
          return; // Exit early for ArrayBuffer path
        }
        
        // For other formats or blob URLs, use load()
        console.log(`[CADViewer] Using loader.load() with URL: ${loadUrl}`);
        loader.load(
          loadUrl,
          (result: any) => {
            console.log(`[CADViewer] Loader success callback fired, result type:`, result?.constructor?.name || typeof result);
            if (seq !== seqRef.current) {
              console.log(`[CADViewer] Sequence mismatch, ignoring result`);
              return;
            }

            let meshToAdd: any;

            // Handle different loader return types
            if (format === 'stl' || format === 'ply') {
              // STL/PLY return BufferGeometry
              const material = new MeshStandardMaterial({ 
                color: 0x60a5fa, 
                roughness: 0.5, 
                metalness: 0.1 
              });
              meshToAdd = new Mesh(result, material);
            } else if (format === 'gltf' || format === 'glb') {
              // GLTF/GLB return { scene, animations, cameras }
              meshToAdd = result.scene;
            } else if (format === 'dae' || format === 'collada') {
              // COLLADA returns { scene, ... }
              meshToAdd = result.scene || result;
            } else if (format === 'obj' || format === 'fbx') {
              // OBJ/FBX return Group/Object3D
              meshToAdd = result;
            } else {
              // Fallback: try as BufferGeometry
              const material = new MeshStandardMaterial({ 
                color: 0x60a5fa, 
                roughness: 0.5, 
                metalness: 0.1 
              });
              meshToAdd = new Mesh(result, material);
            }

            // Center and scale model - ensure full model is visible with padding
                        // Debug: log the fileUrl and fileType being used
                        // eslint-disable-next-line no-console
                        console.log('[CADViewer] Loading model:', { fileUrl, fileType, format, loadUrl });
            const box = new Box3().setFromObject(meshToAdd);
            const size = new Vector3();
            box.getSize(size);
            let maxDim = Math.max(size.x, size.y, size.z) || 1;
            // Enforce a minimum size for visibility
            if (maxDim < 0.01) maxDim = 0.01;
            
            // Determine scale based on view mode (card preset needs different positioning)
            // Card preset uses showControls=false and typically has specific height
            // We'll detect card view by checking if it's a compact view (no controls, no autoRotate)
            const isCardView = !showControls && !autoRotate;
            // Use appropriate scale - card views zoomed out more to show full model
            const scale = isCardView ? 0.4 / maxDim : 0.8 / maxDim;
            const center = box.getCenter(new Vector3());
            meshToAdd.scale.setScalar(scale);
            // Center the model at origin
            meshToAdd.position.sub(center.multiplyScalar(scale));

            // Remove any previous meshes
            const toRemove: any[] = [];
            scene.traverse((obj: any) => {
              if (obj.isMesh || obj.isGroup) toRemove.push(obj);
            });
            toRemove.forEach((obj) => scene.remove(obj));

            scene.add(meshToAdd);
            
            // Calculate optimal camera distance to fit the entire model in view
            const boxSize = Math.max(size.x, size.y, size.z) * scale;
            // Calculate distance needed to fit model in viewport (with padding)
            // Using FOV of 50 degrees, we need distance = (boxSize/2) / tan(FOV/2) * padding
            const fovRad = (50 * Math.PI) / 180;
            const distance = (boxSize / 2) / Math.tan(fovRad / 2) * 1.8; // 1.8x padding for good fit
            
            // Position camera - ensure model is centered and visible
            if (isCardView) {
              // Card view: slightly angled view
              camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
            } else {
              // Detail/upload view: standard 3/4 view angle (not too high)
              camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
            }
            
            // Look at the center (where the model is now positioned)
            camera.lookAt(0, 0, 0);
            
            // Update controls target to center
            if (controls) {
              controls.target.set(0, 0, 0);
              controls.update();
            }
            setLoading(false);
          },
          // Progress callback
          (progress: any) => {
            // Could add progress bar here
          },
          (err: any) => {
            console.error('[CADViewer] Model load error:', err);
            const errorMessage = err?.message || `Failed to load ${format?.toUpperCase() || 'CAD'} file`;
            setError(errorMessage);
            setLoading(false);
          }
        );

        // Animation loop and resize handler already set up above (before early return)

        // Cleanup function
        return () => {
          disposed = true;
          if (animationId) cancelAnimationFrame(animationId);
          window.removeEventListener('resize', onResize);
          try {
            if (renderer) {
              renderer.dispose();
              if (renderer.domElement?.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
              }
            }
          } catch {}
          if (objectUrl && typeof objectUrl === 'string') URL.revokeObjectURL(objectUrl);
        };
      } catch (e) {
        console.error('[CADViewer] Init error:', e);
        const errorMessage = e instanceof Error ? e.message : '3D viewer initialization failed';
        setError(errorMessage);
        setLoading(false);
      }
    }

    let cleanupFn: (() => void) | null = null;
    init().then((fn) => {
      if (typeof fn === 'function') cleanupFn = fn;
    });

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [file, fileUrl, isClient, detectFormat, autoRotate]);

  if (!isClient) {
    return (
      <div className={noWrapper ? className : `rounded-xl border border-gray-800 bg-gray-900 ${className}`}>
        <div className={`${height} w-full flex items-center justify-center`}>
          <div className="text-gray-500">Loading viewer...</div>
        </div>
      </div>
    );
  }

  // When noWrapper is true, render just the canvas with no extra divs
  if (noWrapper) {
    return (
      <div className={`relative ${height} w-full ${className}`} style={{ minHeight: '400px', margin: 0, padding: 0, marginBottom: 0, paddingBottom: 0 }}>
        <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ minHeight: '400px', margin: 0, padding: 0, marginBottom: 0, paddingBottom: 0 }} />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading 3D model...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-50">
            <div className="text-center px-4 max-w-md">
              <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm font-medium mb-2">Failed to load 3D preview</p>
              <p className="text-red-300 text-xs break-words">{error}</p>
              {fileUrl && (
                <p className="text-gray-500 text-xs mt-2 break-all">File: {fileUrl}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 border-gray-800 bg-gray-900 overflow-hidden ${className}`} style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
      {showControls && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="truncate">{fileName || file?.name || 'CAD Model'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span>Drag to rotate • Scroll to zoom • Right-click to pan</span>
          </div>
        </div>
      )}
      
      <div className="relative overflow-hidden rounded-b-xl">
        <div ref={containerRef} className={`${height} w-full`} style={{ boxSizing: 'border-box' }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading 3D model...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-50">
            <div className="text-center px-4 max-w-md">
              <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm font-medium mb-2">Failed to load 3D preview</p>
              <p className="text-red-300 text-xs break-words">{error}</p>
              {fileUrl && (
                <p className="text-gray-500 text-xs mt-2 break-all">File: {fileUrl}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
