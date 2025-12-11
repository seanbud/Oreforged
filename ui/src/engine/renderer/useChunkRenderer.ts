import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ChunkMesh, ChunkData } from '../../game/ChunkMesh';
import { remoteFacet } from '../hooks';
import { BLOCKS_TEXTURE } from '../../game/blocks_texture';

export function useChunkRenderer(scene: THREE.Scene | null) {
    const chunksRef = useRef<Map<string, ChunkMesh>>(new Map());
    const materialRef = useRef<THREE.Material | null>(null);

    const chunkDataFacet = remoteFacet<ChunkData | null>('chunk_data', null);
    const clearChunksFacet = remoteFacet<string | null>('clear_chunks', null);

    // 1. Initialize Material & Texture
    useEffect(() => {
        if (!scene) return;

        const loader = new THREE.TextureLoader();
        const texture = loader.load(BLOCKS_TEXTURE,
            () => console.log("Texture loaded successfully"),
            undefined,
            (err) => console.error("Error loading texture:", err)
        );
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.1
        });

        // Custom Shader Injection
        material.onBeforeCompile = (shader) => {
            shader.uniforms.fogDensityCustom = { value: 0.0015 };
            shader.uniforms.godRayIntensity = { value: 0.15 };

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

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying float vAo;
                varying vec3 vWorldPos;
                uniform float fogDensityCustom;
                uniform float godRayIntensity;
                
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

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                float aoFactor = vAo;
                float ditherPattern = dither4x4(gl_FragCoord.xy, aoFactor);
                vec3 shadowColor = vec3(0.7, 0.75, 0.85);
                vec3 aoTint = mix(shadowColor, vec3(1.0), ditherPattern);
                gl_FragColor.rgb *= aoTint;
                
                float highlightNoise = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
                vec3 highlightColor = vec3(1.0 + highlightNoise * 0.15, 0.98 + highlightNoise * 0.1, 0.9);
                float highlightStrength = pow(max(0.0, dot(vNormal, vec3(0.5, 0.8, 0.2))), 12.0) * 0.2;
                gl_FragColor.rgb += highlightColor * highlightStrength;
                
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float sunAlignment = max(0.0, dot(viewDir, vec3(0.5, 0.8, 0.2)));
                float godRay = pow(sunAlignment, 4.0) * godRayIntensity;
                gl_FragColor.rgb += vec3(godRay * 1.2, godRay * 1.1, godRay * 0.9);`
            );
        };

        materialRef.current = material;

        return () => {
            material.dispose();
            texture.dispose();
        };
    }, [scene]);

    // 2. Clear Chunks Listener
    useEffect(() => {
        const unsubscribe = clearChunksFacet.observe((signal) => {
            if (!signal || !scene) return;
            console.log('Clearing all chunks');
            chunksRef.current.forEach(chunk => chunk.dispose(scene));
            chunksRef.current.clear();
        });
        return () => unsubscribe();
    }, [clearChunksFacet, scene]);

    // 3. Chunk Data Listener
    useEffect(() => {
        const unsubscribe = chunkDataFacet.observe((chunkData) => {
            if (!chunkData || !scene || !materialRef.current) return;

            try {
                let data: ChunkData;
                if (typeof chunkData === 'string') {
                    data = JSON.parse(chunkData);
                } else {
                    data = chunkData;
                }

                const key = `${data.chunkX},${data.chunkZ}`;
                let chunkMesh = chunksRef.current.get(key);

                if (!chunkMesh) {
                    chunkMesh = new ChunkMesh(data.chunkX, data.chunkZ);
                    chunksRef.current.set(key, chunkMesh);
                }

                chunkMesh.rebuild(scene, materialRef.current, data);
            } catch (error) {
                console.error('Error processing chunk:', error);
            }
        });
        return () => unsubscribe();
    }, [chunkDataFacet, scene]);

    // 4. Helper to count blocks in all chunks
    const countBlocks = (blockType: number): number => {
        let count = 0;
        chunksRef.current.forEach(chunk => {
            if (chunk.chunkData && chunk.chunkData.blocks) {
                for (let i = 0; i < chunk.chunkData.blocks.length; i++) {
                    if (chunk.chunkData.blocks[i] === blockType) {
                        count++;
                    }
                }
            }
        });
        return count;
    };

    return { chunksRef, countBlocks };
}
