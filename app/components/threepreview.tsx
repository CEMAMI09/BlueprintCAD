import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreePreviewProps {
  file: File;
}

export default function ThreePreview({ file }: ThreePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!file || !containerRef.current) return;

    const initScene = async () => {
      setLoading(true);
      setError(null);

      try {
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f1a);
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.PerspectiveCamera(
          50,
          containerRef.current!.clientWidth / 400,
          0.1,
          1000
        );
        camera.position.set(0, 0, 100);
        cameraRef.current = camera;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current!.clientWidth, 400);
        renderer.setClearColor(0x0a0f1a);
        containerRef.current!.innerHTML = '';
        containerRef.current!.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(10, 10, 10);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-10, -10, -10);
        scene.add(directionalLight2);

        // Load STL file
        const geometry = await loadSTL(file);
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
          color: 0x3b82f6,
          specular: 0x111111,
          shininess: 200,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        meshRef.current = mesh;

        // Center and scale model
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 80 / maxDim;

        mesh.scale.set(scale, scale, scale);
        mesh.position.sub(center.multiplyScalar(scale));

        // Add mouse controls
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const onMouseDown = (e: MouseEvent) => {
          isDragging = true;
          previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const onMouseMove = (e: MouseEvent) => {
          if (!isDragging || !meshRef.current) return;

          const deltaX = e.clientX - previousMousePosition.x;
          const deltaY = e.clientY - previousMousePosition.y;

          meshRef.current.rotation.y += deltaX * 0.01;
          meshRef.current.rotation.x += deltaY * 0.01;

          previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = () => {
          isDragging = false;
        };

        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          const delta = e.deltaY * 0.1;
          camera.position.z = Math.max(20, Math.min(200, camera.position.z + delta));
        };

        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);
        renderer.domElement.addEventListener('mouseleave', onMouseUp);
        renderer.domElement.addEventListener('wheel', onWheel);

        // Animation loop
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();

        setLoading(false);

        // Cleanup
        return () => {
          renderer.domElement.removeEventListener('mousedown', onMouseDown);
          renderer.domElement.removeEventListener('mousemove', onMouseMove);
          renderer.domElement.removeEventListener('mouseup', onMouseUp);
          renderer.domElement.removeEventListener('mouseleave', onMouseUp);
          renderer.domElement.removeEventListener('wheel', onWheel);
        };
      } catch (err) {
        console.error('3D Preview Error:', err);
        setError('Failed to load 3D preview. File may be corrupted or in an unsupported format.');
        setLoading(false);
      }
    };

    initScene();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [file]);

  const loadSTL = (file: File): Promise<THREE.BufferGeometry> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const geometry = parseSTL(arrayBuffer);
          geometry.computeVertexNormals();
          resolve(geometry);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseSTL = (arrayBuffer: ArrayBuffer): THREE.BufferGeometry => {
    const view = new DataView(arrayBuffer);
    const isASCII = isASCIISTL(arrayBuffer);

    if (isASCII) {
      return parseASCIISTL(new TextDecoder().decode(arrayBuffer));
    } else {
      return parseBinarySTL(view);
    }
  };

  const isASCIISTL = (arrayBuffer: ArrayBuffer): boolean => {
    const view = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(view.slice(0, 5));
    return text.toLowerCase() === 'solid';
  };

  const parseASCIISTL = (text: string): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const normals: number[] = [];

    const lines = text.split('\n');
    let currentNormal: number[] | null = null;

    for (let line of lines) {
      line = line.trim();
      
      if (line.startsWith('facet normal')) {
        const parts = line.split(/\s+/);
        currentNormal = [
          parseFloat(parts[2]),
          parseFloat(parts[3]),
          parseFloat(parts[4])
        ];
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        vertices.push(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        );
        if (currentNormal) {
          normals.push(...currentNormal);
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (normals.length === vertices.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }

    return geometry;
  };

  const parseBinarySTL = (view: DataView): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();
    const triangles = view.getUint32(80, true);
    const vertices: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < triangles; i++) {
      const offset = 84 + i * 50;

      // Normal
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);

      // Vertices (3 per triangle)
      for (let j = 0; j < 3; j++) {
        const vOffset = offset + 12 + j * 12;
        vertices.push(
          view.getFloat32(vOffset, true),
          view.getFloat32(vOffset + 4, true),
          view.getFloat32(vOffset + 8, true)
        );
        normals.push(nx, ny, nz);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    return geometry;
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-[400px] bg-gray-950 rounded-lg overflow-hidden border border-gray-800"
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading 3D preview...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-500 text-center">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}