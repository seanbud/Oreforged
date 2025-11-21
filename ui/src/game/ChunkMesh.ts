import * as THREE from 'three';

export interface ChunkData {
    chunkX: number;
    chunkZ: number;
    blocks: number[];
    size: number;
    height: number;
}

export class ChunkMesh {
    mesh: THREE.Mesh | null = null;
    chunkX: number;
    chunkZ: number;

    constructor(chunkX: number, chunkZ: number) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
    }

    rebuild(chunkData: ChunkData, scene: THREE.Scene, material: THREE.Material) {
        // Remove old mesh if it exists
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            // Material is shared, do not dispose it
            this.mesh = null;
        }

        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        const { blocks, size, height } = chunkData;

        // Helper to get block at local coordinates
        const getBlock = (x: number, y: number, z: number): number => {
            if (x < 0 || x >= size || y < 0 || y >= height || z < 0 || z >= size) {
                return 0; // Air outside chunk
            }
            const index = y * size * size + z * size + x;
            return blocks[index] || 0;
        };

        // Helper to check if block is transparent
        const isTransparent = (blockType: number): boolean => {
            return blockType === 0 || blockType === 4 || blockType === 6; // Air, Water, Leaves
        };

        // Texture atlas mapping (grid coordinates 0-3, y=0 is bottom)
        // Atlas is 4x4
        const getTextureUV = (blockType: number, faceDir: number[]) => {
            let gridX = 2; // Default Dirt
            let gridY = 3;

            // Face directions: 0=Top, 1=Bottom, 2=Front, 3=Back, 4=Right, 5=Left
            // My faces array order: Top, Bottom, Front, Back, Right, Left

            const isTop = faceDir[1] === 1;
            const isBottom = faceDir[1] === -1;
            const isSide = !isTop && !isBottom;

            switch (blockType) {
                case 1: // Grass
                    if (isTop) { gridX = 0; gridY = 3; } // Grass Top
                    else if (isBottom) { gridX = 2; gridY = 3; } // Dirt
                    else { gridX = 1; gridY = 3; } // Grass Side
                    break;
                case 2: // Dirt
                    gridX = 2; gridY = 3;
                    break;
                case 3: // Stone
                    gridX = 3; gridY = 3;
                    break;
                case 4: // Water
                    gridX = 0; gridY = 2;
                    break;
                case 5: // Wood
                    if (isSide) { gridX = 1; gridY = 2; } // Wood Side
                    else { gridX = 2; gridY = 2; } // Wood Top
                    break;
                case 6: // Leaves
                    gridX = 3; gridY = 2;
                    break;
                case 7: // Bedrock
                    gridX = 0; gridY = 1;
                    break;
            }

            // Convert grid coords to UVs
            // 4x4 grid, so each tile is 0.25
            const u = gridX * 0.25;
            const v = gridY * 0.25; // In Three.js UVs, 0 is bottom, 1 is top. 
            // If my atlas has Row 1 at top, that's V=0.75.
            // My gridY=3 corresponds to Top Row. 3 * 0.25 = 0.75. Correct.

            return [
                [u, v],             // Bottom-Left
                [u + 0.25, v],      // Bottom-Right
                [u + 0.25, v + 0.25], // Top-Right
                [u, v + 0.25]       // Top-Left
            ];
        };

        let vertexCount = 0;

        // Generate mesh for each block
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < size; z++) {
                for (let x = 0; x < size; x++) {
                    const blockType = getBlock(x, y, z);
                    if (blockType === 0) continue; // Skip air

                    // Check each face and only add if neighbor is transparent
                    const faces = [
                        { dir: [0, 1, 0], vertices: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },  // Top
                        { dir: [0, -1, 0], vertices: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]] },  // Bottom
                        { dir: [0, 0, 1], vertices: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]] },  // Front
                        { dir: [0, 0, -1], vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] },  // Back
                        { dir: [1, 0, 0], vertices: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]] },  // Right
                        { dir: [-1, 0, 0], vertices: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] },  // Left
                    ];

                    for (const face of faces) {
                        const [dx, dy, dz] = face.dir;
                        const neighborType = getBlock(x + dx, y + dy, z + dz);

                        if (isTransparent(neighborType)) {
                            // Add this face
                            for (const [vx, vy, vz] of face.vertices) {
                                vertices.push(x + vx, y + vy, z + vz);
                            }

                            // Add UVs
                            const faceUVs = getTextureUV(blockType, face.dir);
                            // Map vertices to UVs. 
                            // My vertices order: 0, 1, 2, 3 (BL, BR, TR, TL relative to face)
                            // My UVs order: BL, BR, TR, TL
                            for (const [u, v] of faceUVs) {
                                uvs.push(u, v);
                            }

                            // Add indices for two triangles (quad)
                            indices.push(
                                vertexCount, vertexCount + 1, vertexCount + 2,
                                vertexCount, vertexCount + 2, vertexCount + 3
                            );
                            vertexCount += 4;
                        }
                    }
                }
            }
        }

        if (vertices.length === 0) {
            // No visible blocks in this chunk
            return;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(geometry, material);

        // Position chunk in world space
        this.mesh.position.set(chunkData.chunkX * size, 0, chunkData.chunkZ * size);

        scene.add(this.mesh);
    }

    dispose(scene: THREE.Scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            // Material is shared, do not dispose it
            this.mesh = null;
        }
    }
}
