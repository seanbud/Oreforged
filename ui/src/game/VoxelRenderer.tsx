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
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const chunksRef = useRef<Map<string, ChunkMesh>>(new Map());
    const materialRef = useRef<THREE.Material | null>(null);
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

        // Camera - Perspective
        const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 1000);

        // Start centered on map origin (0, 0, 0)
        // Set an initial position that mimics the isometric look but in perspective
        // Diablo Style: Steep angle (~60 deg), Narrow FOV, High distance
        const cameraTarget = new THREE.Vector3(0, 0, 0);
        camera.position.set(80, 100, 80);
        camera.lookAt(cameraTarget);
        cameraRef.current = camera;

        console.log('Camera positioned at:', camera.position);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        console.log('Renderer initialized');

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;

        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.bias = -0.0001;

        scene.add(directionalLight);

        // Camera controls state
        let isPanning = false;
        let isRotating = false;
        let isPitching = false;
        let previousMousePosition = { x: 0, y: 0 };
        const velocity = { x: 0, z: 0 }; // Current momentum velocity
        const velocityHistory: { x: number, z: number }[] = []; // Rolling history for smooth release
        let lastMoveTime = 0;
        const rotateSpeed = 0.005;
        const pitchSpeed = 0.003;
        const friction = 0.95; // More slippery for "buttery" feel

        // Mouse wheel zoom (Dolly)
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1 : -1;

            // Vector from target to camera
            const offset = new THREE.Vector3().subVectors(camera.position, cameraTarget);
            const dist = offset.length();

            // Limit zoom distance
            if (delta > 0 && dist < 400) {
                offset.multiplyScalar(1.1); // Zoom out
            } else if (delta < 0 && dist > 20) {
                offset.multiplyScalar(0.9); // Zoom in
            }

            camera.position.copy(cameraTarget).add(offset);
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
            } else if (e.button === 2) { // Right click - rotate or pitch
                if (e.ctrlKey) {
                    // Ctrl + Right Click = Pitch (vertical angle)
                    isPitching = true;
                } else {
                    // Right Click = Rotate (horizontal)
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
            }
            previousMousePosition = { x: e.clientX, y: e.clientY };
            lastMoveTime = Date.now();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning && !isRotating) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            if (isPanning) {
                // Analytic Panning for Perspective
                // Calculate units per pixel at the target distance
                const dist = camera.position.distanceTo(cameraTarget);
                const vFOV = THREE.MathUtils.degToRad(camera.fov);
                const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
                const visibleWidth = visibleHeight * camera.aspect;

                const rect = renderer.domElement.getBoundingClientRect();
                const unitsPerPixelX = visibleWidth / rect.width;
                const unitsPerPixelY = visibleHeight / rect.height;

                // Analytic Panning using Camera Basis Vectors
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);

                // Calculate pitch factor for vertical drag correctness
                const pitch = Math.abs(forward.y);
                const groundFactor = pitch < 0.1 ? 10 : 1 / pitch;

                forward.y = 0;
                forward.normalize();

                const right = new THREE.Vector3();
                right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

                const moveX = -deltaX * unitsPerPixelX;
                const moveZ = deltaY * unitsPerPixelY * groundFactor;

                const moveVec = new THREE.Vector3();
                moveVec.addScaledVector(right, moveX);
                moveVec.addScaledVector(forward, moveZ); // deltaY > 0 (down) -> Forward (North)

                camera.position.add(moveVec);
                cameraTarget.add(moveVec);
                // No need to call camera.lookAt here because simple translation preserves orientation
                // But if we want to ensure floating point drift doesn't happen:
                // camera.lookAt(cameraTarget); // Actually, cameraTarget moved same amount, so relative orientation is identical.

                // Add to history for smoothing
                const worldDx = moveVec.x;
                const worldDz = moveVec.z;

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
            } else if (isPitching) {
                // Adjust vertical angle (pitch)
                const pitchDelta = -deltaY * pitchSpeed;

                // Get current offset
                const offset = new THREE.Vector3().subVectors(camera.position, cameraTarget);
                const horizontalDist = Math.sqrt(offset.x * offset.x + offset.z * offset.z);

                // Calculate new Y based on pitch change
                const currentPitch = Math.atan2(offset.y, horizontalDist);
                const newPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, currentPitch + pitchDelta));

                // Update camera Y position
                camera.position.y = cameraTarget.y + horizontalDist * Math.tan(newPitch);
                camera.lookAt(cameraTarget);
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isPanning = false;
            isRotating = false;
            isPitching = false;

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

        // Add distance fog for atmospheric fade (lighter, more majestic)
        scene.fog = new THREE.FogExp2(0xd4e9f7, 0.0015);

        // MeshStandardMaterial with custom shader injection for stylized effects + shadows
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.1
        });

        // Inject our custom stylized effects into the standard material
        material.onBeforeCompile = (shader) => {
            // Add custom uniforms
            shader.uniforms.fogDensityCustom = { value: 0.0015 };
            shader.uniforms.godRayIntensity = { value: 0.15 };

            // Add AO attribute
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                attribute float ao;
                varying float vAo;
                varying vec3 vWorldPos;`
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                vAo = ao;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
            );

            // Inject custom fragment shader code
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying float vAo;
                varying vec3 vWorldPos;
                uniform float fogDensityCustom;
                uniform float godRayIntensity;
                
                // Dither pattern for stylized AO
                float dither4x4(vec2 position, float brightness) {
                    int x = int(mod(position.x, 4.0));
                    int y = int(mod(position.y, 4.0));
                    int index = x + y * 4;
                    float limit = 0.0;
                    
                    if (index == 0) limit = 0.0625;
                    if (index == 1) limit = 0.5625;
                    if (index == 2) limit = 0.1875;
                    if (index == 3) limit = 0.6875;
                    if (index == 4) limit = 0.8125;
                    if (index == 5) limit = 0.3125;
                    if (index == 6) limit = 0.9375;
                    if (index == 7) limit = 0.4375;
                    if (index == 8) limit = 0.25;
                    if (index == 9) limit = 0.75;
                    if (index == 10) limit = 0.125;
                    if (index == 11) limit = 0.625;
                    if (index == 12) limit = 1.0;
                    if (index == 13) limit = 0.5;
                    if (index == 14) limit = 0.875;
                    if (index == 15) limit = 0.375;
                    
                    return brightness < limit ? 0.0 : 1.0;
                }`
            );

            // Apply dithered AO and stylized effects before final output
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                
                // Apply dithered AO
                float aoFactor = vAo;
                float ditherPattern = dither4x4(gl_FragCoord.xy, aoFactor);
                vec3 shadowColor = vec3(0.7, 0.75, 0.85);
                vec3 aoTint = mix(shadowColor, vec3(1.0), ditherPattern);
                gl_FragColor.rgb *= aoTint;
                
                // Wandering highlights
                float highlightNoise = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
                vec3 highlightColor = vec3(1.0 + highlightNoise * 0.15, 0.98 + highlightNoise * 0.1, 0.9);
                float highlightStrength = pow(max(0.0, dot(vNormal, vec3(0.5, 0.8, 0.2))), 12.0) * 0.2;
                gl_FragColor.rgb += highlightColor * highlightStrength;
                
                // God rays
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float sunAlignment = max(0.0, dot(viewDir, vec3(0.5, 0.8, 0.2)));
                float godRay = pow(sunAlignment, 4.0) * godRayIntensity;
                gl_FragColor.rgb += vec3(godRay * 1.2, godRay * 1.1, godRay * 0.9);`
            );
        };

        materialRef.current = material;

        // Handle window resize
        const handleResize = () => {
            if (!camera || !renderer || !containerRef.current) return;
            camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
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

                // Keep looking at target
                // camera.lookAt(cameraTarget); 

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
