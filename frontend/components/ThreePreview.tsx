'use client';

import React, { useEffect, useRef, useState } from 'react';

type ThreePreviewProps = {
  file: File;
};

export default function ThreePreview({ file }: ThreePreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: any;
    let animationId: number | null = null;
    let objectUrl: string | null = null;
    let disposed = false;

    const seq = ++seqRef.current;
    async function init() {
      try {
        if (!containerRef.current) return;
        // Clear any previous canvas content (in case cleanup didn't run yet)
        containerRef.current.innerHTML = '';

        // Detect file type
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const viewableFormats = ['stl', 'obj', 'fbx', 'gltf', 'glb', 'ply', 'dae', 'collada'];
        
        if (!viewableFormats.includes(ext)) {
          setError(`${ext.toUpperCase()} format cannot be previewed in 3D viewer. Download the file to view in specialized CAD software.`);
          return;
        }

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
          Group,
          BufferGeometry
        }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js')
        ]);

  // Abort if a newer init has started (StrictMode double-invoke in dev)
  if (seq !== seqRef.current) return;

  scene = new Scene();
        scene.background = new Color(0x0b1220);

        // Ensure container has dimensions
        if (!containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth || container.offsetWidth || 800;
        const height = container.clientHeight || container.offsetHeight || 600;
        
        if (width === 0 || height === 0) {
          console.warn('[ThreePreview] Container has zero dimensions, using defaults');
        }
        
        camera = new PerspectiveCamera(50, width / height || 1, 0.1, 1000);
        camera.position.set(20, 20, 20); // Maximum zoom-out for a comprehensive view

        renderer = new WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.outputEncoding = sRGBEncoding;
        if (seq !== seqRef.current) return;
        container.appendChild(renderer.domElement);

        // Lights
        scene.add(new AmbientLight(0xffffff, 0.6));
        const dirLight = new DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(3, 5, 2);
        scene.add(dirLight);

  // Grid (ensure only one grid)
  const grid = new GridHelper(10, 10, 0x334155, 0x1f2937);
        // @ts-ignore
        grid.material.opacity = 0.3;
        // @ts-ignore
        grid.material.transparent = true;
        scene.add(grid);

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Load file based on extension
        objectUrl = URL.createObjectURL(file);
        
        // Function to handle loaded geometry/scene
        const handleLoadedObject = (result: any) => {
          if (seq !== seqRef.current) return;
          
          let objectToAdd: any;
          
          // Handle different return types from loaders
          if (result instanceof BufferGeometry) {
            // STL, PLY return geometry
            const material = new MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.5, metalness: 0.1 });
            objectToAdd = new Mesh(result, material);
          } else if (result.scene) {
            // GLTF returns {scene, ...}
            objectToAdd = result.scene;
          } else if (result instanceof Group || result.isObject3D) {
            // OBJ, FBX, COLLADA return Group/Object3D
            objectToAdd = result;
          } else {
            console.error('Unknown result type:', result);
            setError('Unsupported model format');
            return;
          }

          // Center and scale to reasonable size - ensure full model is visible
          const box = new Box3().setFromObject(objectToAdd);
          const size = new Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          // Use a scale that shows the full model with some padding (0.8 = 20% padding around model)
          const scale = 0.8 / maxDim;
          const center = box.getCenter(new Vector3());
          objectToAdd.scale.setScalar(scale);
          // Center the model at origin
          objectToAdd.position.sub(center.multiplyScalar(scale));

          // Adding debug logs to verify model position and camera settings
          console.log('Model position before adjustment:', objectToAdd.position);

          // Explicitly raising the model's position after centering
          const raiseAmount = 10; // Raise the model by 10 units
          objectToAdd.position.y += raiseAmount; // Ensure the model is visibly higher on the grid
          console.log('Model position after adjustment:', objectToAdd.position);

          // Adjusting the camera to align with the raised model
          camera.position.set(30, 30, 30); // Further zoom-out for a broader view
          camera.lookAt(0, raiseAmount, 0); // Focus on the raised model
          console.log('Camera position:', camera.position);
          console.log('Camera lookAt:', { x: 0, y: raiseAmount, z: 0 });

          // Remove previous meshes
          const toRemove: any[] = [];
          scene.traverse((obj: any) => {
            if (obj.isMesh || (obj.isGroup && obj !== scene)) toRemove.push(obj);
          });
          toRemove.forEach((obj) => scene.remove(obj));

          scene.add(objectToAdd);
          // Position camera to view the centered model
          camera.position.set(20, 20, 20); // Maximum zoom-out for a comprehensive view
          camera.lookAt(0, raiseAmount, 0); // Adjusted to look even higher at the model
          // Update controls target to center
          if (controls) {
            controls.target.set(0, 0, 0);
            controls.update();
          }
        };

        // Load appropriate format
        try {
          switch (ext) {
            case 'stl': {
              const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
              const loader = new STLLoader();
              loader.load(objectUrl, handleLoadedObject, undefined, (err: any) => {
                console.error('STL load error', err);
                setError('Failed to load STL file');
              });
              break;
            }
            case 'obj': {
              const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
              const loader = new OBJLoader();
              loader.load(objectUrl, handleLoadedObject, undefined, (err: any) => {
                console.error('OBJ load error', err);
                setError('Failed to load OBJ file');
              });
              break;
            }
            case 'fbx': {
              const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
              const loader = new FBXLoader();
              loader.load(objectUrl, handleLoadedObject, undefined, (err: any) => {
                console.error('FBX load error', err);
                setError('Failed to load FBX file');
              });
              break;
            }
            case 'gltf':
            case 'glb': {
              const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
              const loader = new GLTFLoader();
              loader.load(objectUrl, handleLoadedObject, undefined, (err: any) => {
                console.error('GLTF load error', err);
                setError('Failed to load GLTF/GLB file');
              });
              break;
            }
            case 'ply': {
              const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
              const loader = new PLYLoader();
              loader.load(objectUrl, handleLoadedObject, undefined, (err: any) => {
                console.error('PLY load error', err);
                setError('Failed to load PLY file');
              });
              break;
            }
            case 'dae':
            case 'collada': {
              const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
              const loader = new ColladaLoader();
              loader.load(objectUrl, (result: any) => handleLoadedObject(result.scene), undefined, (err: any) => {
                console.error('COLLADA load error', err);
                setError('Failed to load COLLADA file');
              });
              break;
            }
            default:
              setError(`${ext.toUpperCase()} format not supported for preview`);
          }
        } catch (loaderError) {
          console.error('Loader import error:', loaderError);
          setError('Failed to load 3D viewer');
        }

        const onResize = () => {
          if (!containerRef.current || !renderer || !camera) return;
          const container = containerRef.current;
          const w = container.clientWidth || container.offsetWidth || 800;
          const h = container.clientHeight || container.offsetHeight || 600;
          if (w > 0 && h > 0) {
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          }
        };
        window.addEventListener('resize', onResize);
        // Also trigger resize after a short delay to handle initial render
        setTimeout(onResize, 100);

        const animate = () => {
          animationId = requestAnimationFrame(animate);
          if (!disposed && seq === seqRef.current) {
            controls.update();
            renderer.render(scene, camera);
          }
        };
        animate();

        return () => {
          disposed = true;
          if (animationId) cancelAnimationFrame(animationId);
          window.removeEventListener('resize', onResize);
          try {
            if (renderer) {
              renderer.dispose();
              if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
              }
            }
          } catch {}
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
      } catch (e) {
        console.error(e);
        setError('3D preview initialization failed');
      }
    }

    let cleanupFn: (() => void) | null = null;
    init().then((fn) => {
      if (typeof fn === 'function') cleanupFn = fn;
    });
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [file]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 w-full">
      <div className="px-4 pt-4 text-sm text-gray-400 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
        {file.name}
      </div>
      <div className="relative w-full" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-50">
            <div className="text-center px-4">
              <p className="text-red-400 text-sm font-medium mb-2">Failed to load 3D preview</p>
              <p className="text-red-300 text-xs break-words">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
