import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore - dynamic import for loaders
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Placeholder note: STEP requires a WASM parser or external service; we show stub.

export interface CADViewerProps {
  file?: File | null;
  url?: string; // optional remote URL
  className?: string;
}

const CADViewer: React.FC<CADViewerProps> = ({ file, url, className }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    el.innerHTML = '';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(2, 2, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const controlsDynamicImport = import('three/examples/jsm/controls/OrbitControls.js');

    const light1 = new THREE.DirectionalLight(0xffffff, 1.1);
    light1.position.set(5, 10, 7);
    scene.add(light1);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    grid.position.y = -0.5;
    scene.add(grid);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    function handleResize() {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    }

    window.addEventListener('resize', handleResize);

    async function load() {
      if (!file && !url) return;
      setLoading(true);
      setError(null);
      try {
        const ext = (file?.name || url || '').toLowerCase().split('.').pop();
        if (ext === 'stl') {
          const loader = new STLLoader();
          const data = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const arrayBuffer = reader.result as ArrayBuffer;
                  const geo = loader.parse(arrayBuffer);
                  resolve(geo);
                } catch (e) { reject(e); }
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsArrayBuffer(file);
            } else if (url) {
              loader.load(url, resolve, undefined, reject);
            } else {
              reject(new Error('No source'));
            }
          });
          data.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({ color: 0x4f83ff, metalness: 0.1, roughness: 0.6 });
          const mesh = new THREE.Mesh(data, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          // center
            data.computeBoundingBox();
          if (data.boundingBox) {
            const center = new THREE.Vector3();
            data.boundingBox.getCenter(center);
            mesh.position.sub(center);
          }
          scene.add(mesh);
        } else if (ext === 'step' || ext === 'stp') {
          setError('STEP viewing not yet implemented (needs separate parser). Provide STL for now.');
        } else {
          setError('Unsupported file type. Use .stl (STEP pending).');
        }
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
        const { OrbitControls } = await controlsDynamicImport;
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
      }
    }

    load();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [file, url]);

  return (
    <div className={"relative w-full h-64 md:h-96 rounded-xl border border-surface2/70 overflow-hidden " + (className||'') } ref={mountRef}>
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 bg-black/30">Loading model…</div>}
      {error && <div className="absolute bottom-2 left-2 right-2 text-xs text-red-400 bg-black/50 p-2 rounded">{error}</div>}
    </div>
  );
};

export default CADViewer;
