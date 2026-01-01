'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroCADVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    let scene: any;
    let camera: any;
    let renderer: any;
    let controls: any;
    let mesh: any;
    let animationId: number | null = null;
    let cleanup: (() => void) | null = null;

    // Dynamic import to avoid SSR issues
    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { OrbitControls }]) => {
      if (!containerRef.current) return;

      const container = containerRef.current;

      // Scene setup - exact same as CADViewer
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1220); // Exact same background

      // Camera - exact same as CADViewer
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 400;
      camera = new THREE.PerspectiveCamera(50, width / height || 1, 0.1, 1000);
      camera.position.set(2, 2, 2);

      // Renderer - exact same as CADViewer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.outputEncoding = THREE.sRGBEncoding;
      container.appendChild(renderer.domElement);

      // Lights - exact same as CADViewer
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(3, 5, 2);
      scene.add(dirLight);

      // Grid - exact same as CADViewer
      const grid = new THREE.GridHelper(10, 10, 0x334155, 0x1f2937);
      // @ts-ignore
      grid.material.opacity = 0.3;
      // @ts-ignore
      grid.material.transparent = true;
      scene.add(grid);

      // Controls - exact same as CADViewer
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 2;
      
      // Mobile touch improvements
      controls.touches = {
        ONE: 2, // TOUCH.ROTATE
        TWO: 1  // TOUCH.DOLLY_PAN
      };

      // Create cube with exact same material as CADViewer
      const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const cubeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x60a5fa, // Exact same blue as CADViewer
        roughness: 0.5, 
        metalness: 0.1 
      });
      
      mesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
      
      // Center the cube at origin
      mesh.position.set(0, 0, 0);
      scene.add(mesh);

      // Update controls target to center
      controls.target.set(0, 0, 0);
      controls.update();

      // Animation loop - exact same as CADViewer
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      // Handle resize - exact same as CADViewer
      const handleResize = () => {
        if (!container) return;
        const width = container.clientWidth || container.offsetWidth || 800;
        const height = container.clientHeight || container.offsetHeight || 600;
        if (width > 0 && height > 0) {
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      };

      window.addEventListener('resize', handleResize);

      // Cleanup function
      cleanup = () => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement?.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        }
      };
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isClient]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-96 rounded-xl overflow-hidden"
      style={{ 
        backgroundColor: '#0b1220', // Match CADViewer background
        border: '1px solid #243042',
        minHeight: '384px',
      }}
    />
  );
}
