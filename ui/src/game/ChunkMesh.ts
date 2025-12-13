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
    chunkData!: ChunkData; // Definite assignment assertion

    constructor(chunkX: number, chunkZ: number) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
    }

    rebuild(scene: THREE.Scene, material: THREE.Material, chunkData?: ChunkData) {
        if (chunkData) {
            this.chunkData = chunkData;
        } else if (!this.chunkData) {
            console.error("No chunk data available for rebuild");
            return;
        }

        const data = this.chunkData;

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

        const { blocks, size, height } = data;

        // Helper to get block at local coordinates
        const getBlock = (x: number, y: number, z: number): number => {
            if (x < 0 || x >= size || y < 0 || y >= height || z < 0 || z >= size) {
                return 0; // Air outside chunk
            }
            const index = y * size * size + z * size + x;
            return blocks[index] || 0;
        };


        // Helper to check if block is transparent (for face culling)
        const isTransparent = (blockType: number): boolean => {
            return blockType === 0; // Only Air is transparent
        };

        // Texture atlas mapping (grid coordinates 0-3, y=0 is bottom)
        // Atlas is 4x4
        const getTextureUV = (blockType: number, faceDir: number[]) => {
            let gridX = 2; // Default Dirt
            let gridY = 0;

            // Face directions: 0=Top, 1=Bottom, 2=Front, 3=Back, 4=Right, 5=Left
            // My faces array order: Top, Bottom, Front, Back, Right, Left

            const isTop = faceDir[1] === 1;
            const isBottom = faceDir[1] === -1;
            const isSide = !isTop && !isBottom;

            switch (blockType) {
                case 1: // Grass
                    if (isTop) { gridX = 0; gridY = 3; } // Grass Top
                    else if (isBottom) { gridX = 2; gridY = 3; } // Dirt (bottom of grass)
                    else { gridX = 3; gridY = 3; } // Grass Side
                    break;
                case 2: // Dirt
                    gridX = 2; gridY = 3;
                    break;
                case 3: // Stone
                    gridX = 1; gridY = 3;
                    break;
                case 4: // Water
                    gridX = 0; gridY = 0;
                    break;
                case 5: // Wood
                    if (isSide) { gridX = 0; gridY = 2; } // Wood Side
                    else { gridX = 1; gridY = 2; } // Wood Top
                    break;
                case 6: // Leaves
                    gridX = 2; gridY = 2;
                    break;
                case 7: // Bedrock
                    gridX = 1; gridY = 0;
                    break;
                case 8: // Sand
                    gridX = 3; gridY = 2;
                    break;
                case 9: // Coal
                    gridX = 0; gridY = 1;
                    break;
                case 10: // Iron
                    gridX = 1; gridY = 1;
                    break;
                case 11: // Gold
                    gridX = 2; gridY = 1;
                    break;
                case 12: // Diamond
                    gridX = 3; gridY = 1;
                    break;
                case 13: // Bronze
                    gridX = 2; gridY = 0;
                    break;
                default:
                    gridX = 2; gridY = 0; // Error/Empty
                    break;
            }

            // Convert grid coords to UVs
            // 4x4 grid, so each tile is 0.25
            const u0 = gridX * 0.25;
            const v0 = gridY * 0.25;
            const u1 = u0 + 0.25;
            const v1 = v0 + 0.25;

            // Return UVs based on face direction to match vertex winding
            // Vertices order for each face is different, so UVs must match

            // Top (Y+) and Right (X+) use Standard: BL, BR, TR, TL
            if (faceDir[1] === 1 || faceDir[0] === 1) {
                return [
                    [u0, v0], [u1, v0], [u1, v1], [u0, v1]
                ];
            }

            // Front (Z+): BL, TL, TR, BR
            if (faceDir[2] === 1) {
                return [
                    [u0, v0], [u0, v1], [u1, v1], [u1, v0]
                ];
            }

            // Back (Z-): BR, BL, TL, TR
            if (faceDir[2] === -1) {
                return [
                    [u1, v0], [u0, v0], [u0, v1], [u1, v1]
                ];
            }

            // Left (X-): BR, TR, TL, BL
            if (faceDir[0] === -1) {
                return [
                    [u1, v0], [u1, v1], [u0, v1], [u0, v0]
                ];
            }

            // Bottom (Y-): TL, BL, BR, TR
            if (faceDir[1] === -1) {
                return [
                    [u0, v1], [u0, v0], [u1, v0], [u1, v1]
                ];
            }

            // Fallback (should not happen)
            return [
                [u0, v0], [u1, v0], [u1, v1], [u0, v1]
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


        // Calculate Ambient Occlusion for each vertex
        const aoValues: number[] = [];

        // Helper to calculate AO for a single vertex
        const calculateVertexAO = (x: number, y: number, z: number, face: any): number => {
            const [dx, dy, dz] = face.dir;

            // For each vertex, check 3 neighbors: side1, side2, corner
            // This is a simplified AO - just checking if blocks are present
            // Returns 0.0 (full occlusion) to 1.0 (no occlusion)

            // Get tangent and bitangent for this face
            let side1 = [0, 0, 0];
            let side2 = [0, 0, 0];

            if (Math.abs(dx) > 0) {
                // Face is along X axis
                side1 = [0, 1, 0]; // Y
                side2 = [0, 0, 1]; // Z
            } else if (Math.abs(dy) > 0) {
                // Face is along Y axis  
                side1 = [1, 0, 0]; // X
                side2 = [0, 0, 1]; // Z
            } else {
                // Face is along Z axis
                side1 = [1, 0, 0]; // X
                side2 = [0, 1, 0]; // Y
            }

            // Sample 3 blocks around this vertex on the face
            const s1 = getBlock(x + dx + side1[0], y + dy + side1[1], z + dz + side1[2]);
            const s2 = getBlock(x + dx + side2[0], y + dy + side2[1], z + dz + side2[2]);
            const corner = getBlock(x + dx + side1[0] + side2[0], y + dy + side1[1] + side2[1], z + dz + side1[2] + side2[2]);

            // Count occlusion: 0 = air, >0 = solid
            let occlusion = 0;
            if (s1 > 0) occlusion++;
            if (s2 > 0) occlusion++;
            if (corner > 0 && (s1 > 0 || s2 > 0)) occlusion++; // Corner only counts if at least one side is occluded

            // Map 0-3 occlusion to 1.0-0.3 brightness
            return 1.0 - (occlusion * 0.23);
        };

        // Recalculate AO for each face that was added
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < size; z++) {
                for (let x = 0; x < size; x++) {
                    const blockType = getBlock(x, y, z);
                    if (blockType === 0) continue;

                    const faces = [
                        { dir: [0, 1, 0], vertices: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
                        { dir: [0, -1, 0], vertices: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]] },
                        { dir: [0, 0, 1], vertices: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]] },
                        { dir: [0, 0, -1], vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] },
                        { dir: [1, 0, 0], vertices: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]] },
                        { dir: [-1, 0, 0], vertices: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] },
                    ];

                    for (const face of faces) {
                        const [dx, dy, dz] = face.dir;
                        const neighborType = getBlock(x + dx, y + dy, z + dz);

                        if (isTransparent(neighborType)) {
                            // This face was added - calculate AO for its 4 vertices
                            for (const [vx, vy, vz] of face.vertices) {
                                const ao = calculateVertexAO(x + vx, y + vy, z + vz, face);
                                aoValues.push(ao);
                            }
                        }
                    }
                }
            }
        }

        geometry.setAttribute('ao', new THREE.Float32BufferAttribute(aoValues, 1));

        // Add Barycentric coordinates for wireframe shader
        const centers: number[] = [];
        // For each quad (2 triangles, 4 vertices), we need to add barycentric coords
        // We are processing 4 vertices at a time (Quad)
        for (let i = 0; i < vertices.length / 3; i += 4) {
            // Quad vertices: 0, 1, 2, 3
            // Triangle 1: 0, 1, 2 -> (1,0,0), (0,1,0), (0,0,1)
            // Triangle 2: 0, 2, 3 -> (1,0,0), (0,0,1), (0,1,0)
            // But wait, our index buffer is:
            // vertexCount, vertexCount + 1, vertexCount + 2,
            // vertexCount, vertexCount + 2, vertexCount + 3
            // So we just need to assign 1,0,0 etc to the vertices themselves.
            // Actually, for a quad to have a border, we can't just use barycentric of triangles because the diagonal edge will show up.
            // A better way for quads is to use a specific attribute that marks the UV or local position relative to the face.
            // But since we have UVs, we can just use UVs!
            // Our UVs are 0..0.25 on the atlas.
            // We can pass a separate attribute 'localUV' that is always 0..1 for the face.
            centers.push(
                0, 0, // BL
                1, 0, // BR
                1, 1, // TR
                0, 1  // TL
            );
        }
        geometry.setAttribute('localUV', new THREE.Float32BufferAttribute(centers, 2));

        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(geometry, material);

        // Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Position chunk in world space
        this.mesh.position.set(data.chunkX * size, 0, data.chunkZ * size);

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
