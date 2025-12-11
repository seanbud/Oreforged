import { useEffect } from 'react';
import { useThreeSetup } from '../engine/renderer/useThreeSetup';
import { useChunkRenderer } from '../engine/renderer/useChunkRenderer';
import { useInteraction } from '../engine/renderer/useInteraction';
import { useCameraControls } from '../engine/renderer/useCameraControls';
import { DamageNumberOverlay } from './effects/DamageNumberOverlay';
import { BlockType, ToolTier } from './data/GameDefinitions';

interface VoxelRendererProps {
    autoRotate?: boolean;
    rotationSpeed?: number;
    currentTool?: ToolTier;
    isToolBroken?: boolean;
    damageMultiplier?: number;
    onResourceCollected?: (type: BlockType, count: number) => void;
    onWorldUpdate?: (stats: { woodCount: number }) => void;
}

export function VoxelRenderer({
    autoRotate = false,
    rotationSpeed = 0,
    currentTool = ToolTier.HAND,
    isToolBroken = false,
    damageMultiplier = 1.0,
    onResourceCollected,
    onWorldUpdate
}: VoxelRendererProps) {

    // 1. Setup Three.js (Scene, Camera, Renderer)
    const { scene, camera, renderer, containerRef, isReady } = useThreeSetup();

    // 2. Setup Chunk Rendering (Meshes, Materials, Facet Listeners)
    const { chunksRef, countBlocks } = useChunkRenderer(scene);

    // 3. Setup Interaction (Mining, Particles, Raycasting)
    const { onTap, update: updateInteraction, getHoveredBlock } = useInteraction({
        scene,
        camera,
        renderer,
        containerRef,
        chunksRef,
        currentTool,
        isToolBroken,
        damageMultiplier,
        onResourceCollected
    });

    // 4. Setup Camera Controls (Orbit, Pan, Zoom)
    // Note: onTap is passed here to distinguish between Drag (Pan) and Click (Mine)
    const { update: updateCamera } = useCameraControls({
        camera,
        renderer,
        autoRotate,
        rotationSpeed,
        onTap,
        getHoveredBlock
    });

    // 5. Polling for World Stats (e.g. Wood Count)
    useEffect(() => {
        if (!onWorldUpdate) return;
        const interval = setInterval(() => {
            const wood = countBlocks(BlockType.Wood);
            onWorldUpdate({ woodCount: wood });
        }, 2000);
        return () => clearInterval(interval);
    }, [countBlocks, onWorldUpdate]);

    // 6. Main Animation Loop
    useEffect(() => {
        if (!isReady || !renderer || !scene || !camera) return;

        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);

            // Updates
            updateCamera();
            updateInteraction();

            // Render
            renderer.render(scene, camera);
        };

        animate();
        console.log("Refactored VoxelRenderer loop started");

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [isReady, renderer, scene, camera, updateCamera, updateInteraction]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Overlay for damage numbers - pure React component */}
            <DamageNumberOverlay camera={camera} />
        </div>
    );
}
