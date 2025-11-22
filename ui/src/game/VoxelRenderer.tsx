import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ChunkMesh, ChunkData } from './ChunkMesh';
import { remoteFacet } from '../engine/hooks';
import { BLOCKS_TEXTURE } from './blocks_texture';

interface VoxelRendererProps {
    autoRotate?: boolean;
    rotationSpeed?: number;
}

export function VoxelRenderer({ autoRotate = false, rotationSpeed = 0 }: VoxelRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const chunksRef = useRef<Map<string, ChunkMesh>>(new Map());
    const materialRef = useRef<THREE.Material | null>(null);
    const rotationRef = useRef(0);
    const autoRotateRef = useRef(autoRotate);
    const rotationSpeedRef = useRef(rotationSpeed);

    const chunkDataFacet = remoteFacet<ChunkData | null>('chunk_data', null);
    const clearChunksFacet = remoteFacet<string | null>('clear_chunks', null);

    // Keep autoRotateRef and rotationSpeedRef in sync with props
    useEffect(() => {
        autoRotateRef.current = autoRotate;
        rotationSpeedRef.current = rotationSpeed;
    }, [autoRotate, rotationSpeed]);

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        console.log('Initializing Three.js scene...');

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // Sky blue
        sceneRef.current = scene;

        // Camera - Isometric style (Orthographic)
        const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        const d = 40;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

        // Isometric position (Diablo style)
        camera.position.set(40, 35, 40);
        camera.lookAt(0, 0, 0);
        camera.zoom = 1.5;
        camera.updateProjectionMatrix();
        cameraRef.current = camera;

        console.log('Camera positioned at:', camera.position);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        console.log('Renderer initialized');

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Grid helper (for debugging)
        const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
        scene.add(gridHelper);

        // Load Texture Atlas from Base64
        const loader = new THREE.TextureLoader();
        const texture = loader.load(BLOCKS_TEXTURE,
            () => console.log("Texture loaded successfully"),
            undefined,
            (err) => console.error("Error loading texture:", err)
        );
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Shared Material
        const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide // Keep DoubleSide to ensure visibility
        });
        materialRef.current = material;

        console.log('Scene setup complete, starting render loop');

        // Handle window resize
        const handleResize = () => {
            if (!camera || !renderer || !containerRef.current) return;
            const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            camera.left = -d * aspect;
            camera.right = d * aspect;
            camera.top = d;
            camera.bottom = -d;
            camera.updateProjectionMatrix();
            renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Auto-rotation logic
            if (autoRotateRef.current && camera && rotationSpeedRef.current !== 0) {
                // Negative speed = counter-clockwise, positive = clockwise
                rotationRef.current += 0.005 * rotationSpeedRef.current;
                const radius = 56.5; // sqrt(40^2 + 40^2) approx
                camera.position.x = Math.sin(rotationRef.current + Math.PI / 4) * radius;
                camera.position.z = Math.cos(rotationRef.current + Math.PI / 4) * radius;
                camera.lookAt(0, 0, 0);
            }

            renderer.render(scene, camera);
        };
        animate();

        console.log('Render loop started');

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);

            // Dispose of all chunks
            chunksRef.current.forEach(chunk => chunk.dispose(scene));
            chunksRef.current.clear();

            renderer.dispose();
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }

            material.dispose();
            texture.dispose();
        };
    }, []);

    // Listen for clear chunks signal
    useEffect(() => {
        console.log('Setting up clear chunks listener...');

        const unsubscribe = clearChunksFacet.observe((signal) => {
            if (!signal) return;

            console.log('Clear chunks signal received, disposing all chunks');

            if (sceneRef.current) {
                // Dispose all existing chunks
                chunksRef.current.forEach(chunk => chunk.dispose(sceneRef.current!));
                chunksRef.current.clear();
                console.log('All chunks cleared');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [clearChunksFacet]);

    // Listen for chunk data from C++
    useEffect(() => {
        console.log('Setting up chunk data listener...');

        const unsubscribe = chunkDataFacet.observe((chunkData) => {
            console.log('Facet observe callback triggered, chunkData type:', typeof chunkData);

            if (!chunkData) {
                console.log('Chunk data is null/undefined, skipping');
                return;
            }

            if (!sceneRef.current || !materialRef.current) {
                console.error('Scene or material not initialized yet');
                return;
            }

            try {
                console.log('Raw chunk data:', chunkData);

                // Parse if it's a string (JSON)
                let data: ChunkData;
                if (typeof chunkData === 'string') {
                    console.log('Parsing chunk data from string');
                    data = JSON.parse(chunkData);
                } else {
                    console.log('Using chunk data as-is (already parsed)');
                    data = chunkData;
                }

                console.log('Parsed chunk data:', data);

                const key = `${data.chunkX},${data.chunkZ}`;
                console.log(`Processing chunk at ${key}`);

                // Create or update chunk mesh
                let chunkMesh = chunksRef.current.get(key);
                if (!chunkMesh) {
                    console.log(`Creating new ChunkMesh for ${key}`);
                    chunkMesh = new ChunkMesh(data.chunkX, data.chunkZ);
                    chunksRef.current.set(key, chunkMesh);
                } else {
                    console.log(`Updating existing ChunkMesh for ${key}`);
                }

                console.log(`Rebuilding mesh for chunk ${key}`);
                chunkMesh.rebuild(data, sceneRef.current!, materialRef.current!);
                console.log(`Chunk ${key} rendered successfully`);
            } catch (error) {
                console.error('Error processing chunk:', error);
                console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                console.error('Chunk data that caused error:', chunkData);
            }
        });

        return () => {
            console.log('Cleaning up chunk data listener');
            unsubscribe();
        };
    }, [chunkDataFacet]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                margin: 0,
                padding: 0,
            }}
        />
    );
}
