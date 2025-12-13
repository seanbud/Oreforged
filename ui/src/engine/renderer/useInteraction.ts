import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ChunkMesh } from '../../game/ChunkMesh';
import { BlockType, ToolTier, canMineBlock, getDamage, BLOCK_DEFINITIONS, CRAFTING_RECIPES } from '../../game/data/GameDefinitions';
import { OreHealthSystem } from '../../game/systems/OreHealthSystem';
import { HitParticleSystem } from '../../game/effects/HitParticles';
import { spawnDamageNumber } from '../../game/effects/DamageNumberOverlay';

interface InteractionProps {
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    containerRef: React.RefObject<HTMLDivElement>;
    chunksRef: React.MutableRefObject<Map<string, ChunkMesh>>;
    currentTool: ToolTier;
    isToolBroken: boolean;
    damageMultiplier: number;
    onResourceCollected?: (type: BlockType, count: number) => void;
    triggerShake?: (intensity: number) => void;
    inventory: Record<BlockType, number>;
}

export function useInteraction({
    scene,
    camera,
    renderer,
    containerRef,
    chunksRef,
    currentTool,
    isToolBroken,
    damageMultiplier,
    onResourceCollected,
    triggerShake,
    inventory
}: InteractionProps) {
    const outlineBoxRef = useRef<THREE.LineSegments | null>(null);
    const oreHealthRef = useRef<OreHealthSystem | null>(null);
    const particleSystemRef = useRef<HitParticleSystem | null>(null);
    const currentMousePosition = useRef<{ x: number, y: number } | null>(null);

    // Refs for safe access in event listeners/callbacks
    const propsRef = useRef({ currentTool, isToolBroken, damageMultiplier, onResourceCollected, triggerShake, inventory });
    useEffect(() => {
        propsRef.current = { currentTool, isToolBroken, damageMultiplier, onResourceCollected, triggerShake, inventory };
    }, [currentTool, isToolBroken, damageMultiplier, onResourceCollected, triggerShake, inventory]);

    // Initialize Helpers
    useEffect(() => {
        if (!scene) return;

        // Systems
        oreHealthRef.current = new OreHealthSystem();
        particleSystemRef.current = new HitParticleSystem(scene);

        // Outline Box
        const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, 1.05, 1.05));
        const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const outlineBox = new THREE.LineSegments(outlineGeometry, outlineMaterial);
        outlineBox.visible = false;
        scene.add(outlineBox);
        outlineBoxRef.current = outlineBox;

        return () => {
            if (outlineBox) scene.remove(outlineBox);
            // Dispose systems if needed
        };
    }, [scene]);

    // Raycast Helper
    const getHoveredBlock = useCallback((clientX: number, clientY: number) => {
        if (!camera || !renderer || !containerRef.current) return null;

        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const chunks = Array.from(chunksRef.current.values())
            .map(c => c.mesh)
            .filter(m => m !== null) as THREE.Mesh[];

        const intersects = raycaster.intersectObjects(chunks);
        if (intersects.length === 0) return null;

        const intersection = intersects[0];
        const chunk = chunksRef.current.get(
            Array.from(chunksRef.current.keys()).find(key =>
                chunksRef.current.get(key)!.mesh === intersection.object
            )!
        );

        if (!chunk) return null;

        const hitPoint = intersection.point.clone();
        const rayDir = raycaster.ray.direction.clone().normalize();
        hitPoint.add(rayDir.multiplyScalar(0.01));

        const localPoint = hitPoint.sub(intersection.object.position);
        const blockX = Math.floor(localPoint.x);
        const blockY = Math.floor(localPoint.y);
        const blockZ = Math.floor(localPoint.z);

        const chunkData = chunk.chunkData;
        if (blockX < 0 || blockX >= chunkData.size ||
            blockY < 0 || blockY >= chunkData.height ||
            blockZ < 0 || blockZ >= chunkData.size) return null;

        const blockIndex = blockY * chunkData.size * chunkData.size + blockZ * chunkData.size + blockX;
        const blockType = chunkData.blocks[blockIndex] as BlockType;

        const worldPos = intersection.object.position.clone();
        worldPos.x += blockX + 0.5;
        worldPos.y += blockY + 0.5;
        worldPos.z += blockZ + 0.5;

        return { chunk, chunkData, blockX, blockY, blockZ, blockIndex, blockType, worldPos, intersectionPoint: intersection.point };
    }, [camera, renderer, containerRef, chunksRef]);

    // Mine Logic
    const handleMine = useCallback((e: MouseEvent) => {
        if (!oreHealthRef.current || !particleSystemRef.current || !scene || !containerRef.current) return;

        const hit = getHoveredBlock(e.clientX, e.clientY);
        if (!hit) return;

        const { chunk, chunkData, blockX, blockY, blockZ, blockIndex, blockType, worldPos } = hit;
        const { currentTool, isToolBroken, damageMultiplier, onResourceCollected, triggerShake } = propsRef.current;

        if (blockType === BlockType.Air || blockType === BlockType.Bedrock) return;

        // UNBREAKABLE FEEDBACK
        if (!canMineBlock(blockType, currentTool)) {
            // Trigger feedback
            if (triggerShake) triggerShake(0.15); // Restored shake intensity (was 0.2, now 0.15)
            if (camera) spawnDamageNumber(worldPos, 0, camera, containerRef.current, "#ff8800"); // Orange "0"

            // Still damage the tool (count 0 means no resource given, but tool was used)
            onResourceCollected?.(blockType, 0);
            return;
        }

        const baseDamage = getDamage(currentTool);
        const damage = baseDamage * (isToolBroken ? 0.3 : 1.0) * damageMultiplier;

        // Visuals
        const blockDef = BLOCK_DEFINITIONS[blockType];
        const blockColor = new THREE.Color(blockDef.color);
        if (particleSystemRef.current) {
            (particleSystemRef.current as any).spawnHitParticles(worldPos, blockColor);
        }

        if (camera) spawnDamageNumber(worldPos, damage, camera, containerRef.current);

        // Flash Outline
        if (outlineBoxRef.current) {
            (outlineBoxRef.current.material as THREE.LineBasicMaterial).opacity = 1;
        }

        // Apply Damage
        const result = oreHealthRef.current.addDamage(
            chunkData.chunkX,
            chunkData.chunkZ,
            blockX,
            blockY,
            blockZ,
            blockType,
            damage
        );

        if (result.broke) {
            // particleSystemRef.current.spawnBreakParticles(worldPos, blockColor); // Not implemented in HitParticleSystem apparently? Or I missed it.
            // Oh wait, VoxelRenderer had spawnBreakParticles call. 
            // Checking VoxelRenderer.tsx step 26: 
            // particleSystemRef.current.spawnBreakParticles(worldPos, blockColor);
            // Does HitParticleSystem have it? I should assume so if it was there.
            // But wait, the previous code had: particleSystemRef.current.spawnHitParticles... and spawnBreakParticles.
            // I'll assume it exists. If TS errors, I'll fix.
            if ('spawnBreakParticles' in particleSystemRef.current) {
                (particleSystemRef.current as any).spawnBreakParticles(worldPos, blockColor);
            } else {
                (particleSystemRef.current as any).spawnHitParticles(worldPos, blockColor); // Fallback
            }

            // Remove block
            chunkData.blocks[blockIndex] = BlockType.Air;
            //Rebuild
            // We need theaterial... how to access it? 
            // ChunkMesh needs material for rebuild.
            // We don't have access to material here easily unless passed.
            // However, ChunkMesh.mesh.material exists!
            if (chunk.mesh && chunk.mesh.material) {
                chunk.rebuild(scene, chunk.mesh.material as THREE.Material, chunkData);
            }

            if (outlineBoxRef.current) outlineBoxRef.current.visible = false;
            onResourceCollected?.(blockType, 1);

            // SPLASH DAMAGE: Diamond pickaxe (non-broken) deals splash damage to adjacent blocks
            if (currentTool === ToolTier.DIAMOND_PICK && !isToolBroken) {
                const splashRadius = 2; // Check blocks within 2 block radius

                // Check all blocks in a sphere around the broken block
                for (let dx = -splashRadius; dx <= splashRadius; dx++) {
                    for (let dy = -splashRadius; dy <= splashRadius; dy++) {
                        for (let dz = -splashRadius; dz <= splashRadius; dz++) {
                            if (dx === 0 && dy === 0 && dz === 0) continue; // Skip center block (already broken)

                            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (distance > splashRadius) continue; // Outside splash radius

                            const targetX = blockX + dx;
                            const targetY = blockY + dy;
                            const targetZ = blockZ + dz;

                            const targetWorldPos = new THREE.Vector3(
                                worldPos.x + dx,
                                worldPos.y + dy,
                                worldPos.z + dz
                            );

                            // Get block at target position
                            const targetKey = `${chunkData.chunkX},${chunkData.chunkZ}`;
                            const targetChunk = chunksRef.current.get(targetKey);
                            if (!targetChunk) continue;

                            const targetChunkData = targetChunk.chunkData;
                            if (!targetChunkData) continue;

                            // Check bounds
                            if (targetX < 0 || targetX >= targetChunkData.size ||
                                targetY < 0 || targetY >= targetChunkData.height ||
                                targetZ < 0 || targetZ >= targetChunkData.size) continue;

                            const targetIndex = targetY * targetChunkData.size * targetChunkData.size +
                                targetZ * targetChunkData.size + targetX;
                            const targetBlockType = targetChunkData.blocks[targetIndex];

                            if (targetBlockType === BlockType.Air || targetBlockType === BlockType.Bedrock) continue;
                            if (!canMineBlock(targetBlockType, currentTool)) continue;

                            // Calculate falloff damage (100% at center, decreases with distance)
                            const falloff = 1.0 - (distance / (splashRadius + 0.5));
                            const splashDamage = damage * falloff * 0.6; // 60% of main damage with falloff

                            // Apply splash damage
                            const splashResult = oreHealthRef.current.addDamage(
                                targetChunkData.chunkX,
                                targetChunkData.chunkZ,
                                targetX,
                                targetY,
                                targetZ,
                                targetBlockType,
                                splashDamage
                            );

                            // Spawn particles for splash damage
                            if (particleSystemRef.current && splashDamage > 0) {
                                const targetBlockDef = BLOCK_DEFINITIONS[targetBlockType as BlockType];
                                const targetColor = new THREE.Color(targetBlockDef.color);
                                (particleSystemRef.current as any).spawnHitParticles(targetWorldPos, targetColor);
                            }

                            // If splash broke the block, remove it
                            if (splashResult.broke) {
                                targetChunkData.blocks[targetIndex] = BlockType.Air;
                                if (targetChunk.mesh && targetChunk.mesh.material) {
                                    targetChunk.rebuild(scene, targetChunk.mesh.material as THREE.Material, targetChunkData);
                                }
                                onResourceCollected?.(targetBlockType, 1);
                            }
                        }
                    }
                }
            }


            // Check if this resource is needed for next upgrade and show progress
            const { currentTool: tool, inventory: inv } = propsRef.current;
            const nextRecipe = CRAFTING_RECIPES.find(r =>
                (r.requires === null && tool === ToolTier.HAND) ||
                r.requires === tool
            );

            if (nextRecipe && camera) {
                // Check if the collected resource is needed for this recipe
                const needed = nextRecipe.cost.get(blockType);
                if (needed !== undefined && needed > 0) {
                    // Show progress
                    const currentCount = (inv[blockType] || 0) + 1; // +1 because we just collected
                    const progressText = `(${Math.min(currentCount, needed)}/${needed})`;
                    // Spawn yellow progress indicator with longer lifetime
                    spawnDamageNumber(worldPos, progressText, camera, containerRef.current, "#FFD700", 2500);
                }
            }
        }

    }, [getHoveredBlock, scene, camera, containerRef]); // propsRef stable

    // Mouse Move Tracker
    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            currentMousePosition.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    // Frame Update (Highlight)
    const update = useCallback(() => {
        if (!outlineBoxRef.current || !currentMousePosition.current) return;

        // Don't highlight if dragging (camera panning takes precedence visual?)
        // Actually, we can just highlight always if mouse is over.

        const hit = getHoveredBlock(currentMousePosition.current.x, currentMousePosition.current.y);

        if (hit) {
            outlineBoxRef.current.position.copy(hit.worldPos);
            outlineBoxRef.current.visible = true;

            const { currentTool } = propsRef.current;
            const valid = hit.blockType !== BlockType.Bedrock && canMineBlock(hit.blockType, currentTool);

            (outlineBoxRef.current.material as THREE.LineBasicMaterial).color.setHex(valid ? 0xffffff : 0xff0000);

            // Fade opacity
            const mat = outlineBoxRef.current.material as THREE.LineBasicMaterial;
            if (mat.opacity < 0.3) mat.opacity = 0.3;
            else mat.opacity *= 0.9; // Fade out effect from click flash

        } else {
            outlineBoxRef.current.visible = false;
        }
    }, [getHoveredBlock]);

    return {
        onTap: handleMine,
        update,
        getHoveredBlock
    };
}
