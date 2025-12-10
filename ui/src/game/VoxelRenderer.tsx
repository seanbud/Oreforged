import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ChunkMesh, ChunkData } from './ChunkMesh';
import { remoteFacet } from '../engine/hooks';
import { BLOCKS_TEXTURE } from './blocks_texture';

interface VoxelRendererProps {
    autoRotate?: boolean;
    rotationSpeed?: number;
}

export function VoxelRenderer({
    autoRotate = false,
    rotationSpeed = 0
}: VoxelRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const chunksRef = useRef<Map<string, ChunkMesh>>(new Map());
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const rotationRef = useRef(0);
    const autoRotateRef = useRef(autoRotate);
    const rotationSpeedRef = useRef(rotationSpeed);

    const chunkDataFacet = remoteFacet<ChunkData | null>('chunk_data', null);
    const clearChunksFacet = remoteFacet<string | null>('clear_chunks', null);

    // Keep refs in sync
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

        // Start centered on map origin (0, 0, 0)
        const cameraTarget = new THREE.Vector3(0, 0, 0);
        camera.position.set(200, 175, 200);
        camera.lookAt(cameraTarget);
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

        // Camera controls state
        let isPanning = false;
        let isRotating = false;
        let previousMousePosition = { x: 0, y: 0 };
        const velocity = { x: 0, z: 0 }; // Current momentum velocity
        const velocityHistory: { x: number, z: number }[] = []; // Rolling history for smooth release
        let lastMoveTime = 0;
        const zoomSpeed = 0.1;
        const rotateSpeed = 0.005;
        const friction = 0.95; // More slippery for "buttery" feel

        // Mouse wheel zoom
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            camera.zoom = Math.max(0.5, Math.min(5, camera.zoom + delta));
            camera.updateProjectionMatrix();
        };

        // Mouse down - detect left or right click
        const handleMouseDown = (e: MouseEvent) => {
            e.preventDefault();

            // Stop existing momentum
            velocity.x = 0;
            velocity.z = 0;
            velocityHistory.length = 0;

            if (e.button === 0) { // Left click - pan
                isPanning = true;
            } else if (e.button === 2) { // Right click - rotate
                isRotating = true;

                // Set rotation pivot to center of screen (Analytic raycast to y=0)
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                const intersection = new THREE.Vector3();
                if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
                    cameraTarget.copy(intersection);
                }
            }
            previousMousePosition = { x: e.clientX, y: e.clientY };
            lastMoveTime = Date.now();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning && !isRotating) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            if (isPanning) {
                // Analytic Panning (Zero Jitter)
                const viewHeight = (camera.top - camera.bottom) / camera.zoom;
                const viewWidth = (camera.right - camera.left) / camera.zoom;
                const rect = renderer.domElement.getBoundingClientRect();
                const unitsPerPixelX = viewWidth / rect.width;
                const unitsPerPixelY = viewHeight / rect.height;

                // Analytic Panning using Camera Basis Vectors
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                forward.y = 0;
                forward.normalize();

                const right = new THREE.Vector3();
                right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

                const moveX = -deltaX * unitsPerPixelX;
                const moveZ = deltaY * unitsPerPixelY * 1.7; // Vertical foreshortening factor

                const moveVec = new THREE.Vector3();
                moveVec.addScaledVector(right, moveX);
                moveVec.addScaledVector(forward, moveZ); // deltaY > 0 (down) -> Forward (North)

                camera.position.add(moveVec);
                cameraTarget.add(moveVec);
                camera.lookAt(cameraTarget);

                const worldDx = moveVec.x;
                const worldDz = moveVec.z;

                // Add to history for smoothing
                velocityHistory.push({ x: worldDx, z: worldDz });
                if (velocityHistory.length > 5) velocityHistory.shift();
                lastMoveTime = Date.now();

            } else if (isRotating) {
                const angle = deltaX * rotateSpeed;
                const offsetX = camera.position.x - cameraTarget.x;
                const offsetZ = camera.position.z - cameraTarget.z;

                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const newOffsetX = offsetX * cos - offsetZ * sin;
                const newOffsetZ = offsetX * sin + offsetZ * cos;

                camera.position.x = cameraTarget.x + newOffsetX;
                camera.position.z = cameraTarget.z + newOffsetZ;
                camera.lookAt(cameraTarget);
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isPanning = false;
            isRotating = false;

            // Calculate rolling average velocity if recently moved
            if (Date.now() - lastMoveTime < 50 && velocityHistory.length > 0) {
                let avgX = 0, avgZ = 0;
                for (const v of velocityHistory) {
                    avgX += v.x;
                    avgZ += v.z;
                }
                velocity.x = avgX / velocityHistory.length;
                velocity.z = avgZ / velocityHistory.length;
            } else {
                velocity.x = 0;
                velocity.z = 0;
            }
        };

        // Prevent context menu on right-click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // Add event listeners
        renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
        renderer.domElement.addEventListener('mousedown', handleMouseDown);
        renderer.domElement.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

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

        // Simple bright shader (closer to original MeshLambertMaterial)
        const material = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: texture },
                sunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.2).normalize() },
                ambientLight: { value: 0.8 },
                diffuseStrength: { value: 0.4 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                uniform vec3 sunDirection;
                uniform float ambientLight;
                uniform float diffuseStrength;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                    vec4 texColor = texture2D(map, vUv);
                    
                    // Simple Lambert lighting like the original
                    float diffuse = max(dot(vNormal, sunDirection), 0.0);
                    
                    // Combine ambient + diffuse (very bright)
                    float light = ambientLight + diffuse * diffuseStrength;
                    light = clamp(light, 0.0, 1.0);
                    
                    vec3 finalColor = texColor.rgb * light;
                    
                    gl_FragColor = vec4(finalColor, texColor.a);
                    
                    if (texColor.a < 0.1) discard;
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        materialRef.current = material;

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

            // Apply momentum when not actively panning
            if (!isPanning && (Math.abs(velocity.x) > 0.001 || Math.abs(velocity.z) > 0.001)) {
                camera.position.x += velocity.x;
                camera.position.z += velocity.z;
                cameraTarget.x += velocity.x;
                cameraTarget.z += velocity.z;
                camera.lookAt(cameraTarget);

                // Apply friction
                velocity.x *= friction;
                velocity.z *= friction;

                // Stop when velocity is very small
                if (Math.abs(velocity.x) < 0.001) velocity.x = 0;
                if (Math.abs(velocity.z) < 0.001) velocity.z = 0;
            }

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
            renderer.domElement.removeEventListener('wheel', handleWheel);
            renderer.domElement.removeEventListener('mousedown', handleMouseDown);
            renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
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
            // console.log('Facet observe callback triggered, chunkData type:', typeof chunkData);

            if (!chunkData) {
                // console.log('Chunk data is null/undefined, skipping');
                return;
            }

            if (!sceneRef.current || !materialRef.current) {
                console.error('Scene or material not initialized yet');
                return;
            }

            try {
                // console.log('Raw chunk data:', chunkData);

                // Parse if it's a string (JSON)
                let data: ChunkData;
                if (typeof chunkData === 'string') {
                    // console.log('Parsing chunk data from string');
                    data = JSON.parse(chunkData);
                } else {
                    // console.log('Using chunk data as-is (already parsed)');
                    data = chunkData;
                }

                // console.log('Parsed chunk data:', data);

                const key = `${data.chunkX},${data.chunkZ}`;
                // console.log(`Processing chunk at ${key}`);

                // Create or update chunk mesh
                let chunkMesh = chunksRef.current.get(key);
                if (!chunkMesh) {
                    // console.log(`Creating new ChunkMesh for ${key}`);
                    chunkMesh = new ChunkMesh(data.chunkX, data.chunkZ);
                    chunksRef.current.set(key, chunkMesh);
                } else {
                    // console.log(`Updating existing ChunkMesh for ${key}`);
                }

                // console.log(`Rebuilding mesh for chunk ${key}`);
                chunkMesh.rebuild(data, sceneRef.current!, materialRef.current!);
                // console.log(`Chunk ${key} rendered successfully`);
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
