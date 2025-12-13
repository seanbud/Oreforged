import { useEffect, useRef } from 'react';
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
    externalShakeTrigger?: number; // Timestamp to trigger shake
    inventory: Record<BlockType, number>;
}

export function VoxelRenderer({
    autoRotate = false,
    rotationSpeed = 0,
    currentTool = ToolTier.HAND,
    isToolBroken = false,
    damageMultiplier = 1.0,
    onResourceCollected,
    onWorldUpdate,
    externalShakeTrigger,
    inventory
}: VoxelRendererProps) {

    // 1. Setup Three.js (Scene, Camera, Renderer)
    const { scene, camera, renderer, containerRef, isReady } = useThreeSetup();

    // 2. Setup Chunk Rendering (Meshes, Materials, Facet Listeners)
    const { chunksRef, countBlocks } = useChunkRenderer(scene);

    // 4. Setup Camera Controls (Orbit, Pan, Zoom)
    // Create interaction ref for delayed access
    const interactionRef = useRef<{ onTap: (e: MouseEvent) => void, getHoveredBlock: any } | null>(null);

    const { update: updateCamera, triggerShake } = useCameraControls({
        camera,
        renderer,
        autoRotate,
        rotationSpeed,
        onTap: (e) => interactionRef.current?.onTap(e), // Delayed access
        getHoveredBlock: (x, y) => interactionRef.current?.getHoveredBlock(x, y)
    });

    // Update ref so interaction can use it?
    // No, interaction is created below.
    // We can just pass `triggerShake` to interaction!
    // But interaction assumes it returns `onTap`, which controls uses.
    // So controls needs `onTap` which is created by interaction.
    // Controls uses onTap inside `handleMouseUp`.

    // Refactor strategy:
    // 1. Create interactionRef to hold the result of useInteraction (onTap, etc).
    // 2. Call useCameraControls, passing a proxy function that calls interactionRef.current.onTap.
    // 3. Call useInteraction, passing triggerShake (which we got from controls).
    // 4. Assign interaction result to interactionRef.


    // 3. Setup Interaction (Mining, Particles, Raycasting)
    const interaction = useInteraction({
        scene,
        camera,
        renderer,
        containerRef,
        chunksRef,
        currentTool,
        isToolBroken,
        damageMultiplier,
        onResourceCollected,
        triggerShake, // Pass the function we got from controls
        inventory
    });

    useEffect(() => {
        interactionRef.current = interaction;
    }, [interaction]);

    const { update: updateInteraction } = interaction;

    // External Shake Trigger
    useEffect(() => {
        if (externalShakeTrigger && externalShakeTrigger > 0) {
            triggerShake(0.5); // Default intensity for external events
        }
    }, [externalShakeTrigger, triggerShake]);

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
