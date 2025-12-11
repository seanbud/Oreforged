import * as THREE from 'three';

interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    color: THREE.Color;
    active: boolean;
}

export class HitParticleSystem {
    private particles: Particle[] = [];
    private particleMesh: THREE.Points | null = null;
    private geometry: THREE.BufferGeometry;
    private material: THREE.PointsMaterial;
    private maxParticles = 1000;

    constructor(private scene: THREE.Scene) {
        // Create geometry for particles
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxParticles * 3);
        const colors = new Float32Array(this.maxParticles * 3);
        const sizes = new Float32Array(this.maxParticles);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Create material
        this.material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
        });

        // Create mesh
        this.particleMesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particleMesh);

        // Initialize particle pool
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1,
                color: new THREE.Color(),
                active: false,
            });
        }
    }

    // Spawn particles for a mining hit
    spawnHitParticles(position: THREE.Vector3, blockColor: THREE.Color): void {
        const particleCount = 5;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getInactiveParticle();
            if (!particle) continue;

            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Math.random() * 0.2 - 0.1,
                Math.random() * 0.2 - 0.1,
                Math.random() * 0.2 - 0.1
            ));

            // Random velocity upward and outward
            particle.velocity.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 2,
                (Math.random() - 0.5) * 2
            );

            particle.color.copy(blockColor);
            particle.life = 0;
            particle.maxLife = 0.4 + Math.random() * 0.3;
            particle.active = true;
        }
    }

    // Spawn particles for block break
    spawnBreakParticles(position: THREE.Vector3, blockColor: THREE.Color): void {
        const particleCount = 15;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getInactiveParticle();
            if (!particle) continue;

            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Math.random() * 0.3 - 0.15,
                Math.random() * 0.3 - 0.15,
                Math.random() * 0.3 - 0.15
            ));

            // Explosive velocity outward
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 3;
            particle.velocity.set(
                Math.cos(angle) * speed,
                Math.random() * 4 + 2,
                Math.sin(angle) * speed
            );

            particle.color.copy(blockColor);
            particle.life = 0;
            particle.maxLife = 0.6 + Math.random() * 0.4;
            particle.active = true;
        }
    }

    // Update all particles
    update(deltaTime: number): void {
        const positions = this.geometry.attributes.position.array as Float32Array;
        const colors = this.geometry.attributes.color.array as Float32Array;
        const sizes = this.geometry.attributes.size.array as Float32Array;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];

            if (!particle.active) {
                positions[i * 3] = 0;
                positions[i * 3 + 1] = -1000; // Hide offscreen
                positions[i * 3 + 2] = 0;
                continue;
            }

            // Update physics
            particle.life += deltaTime;
            particle.velocity.y -= 9.8 * deltaTime; // Gravity
            particle.velocity.multiplyScalar(0.95); // Drag
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

            // Update visual attributes
            const lifeRatio = particle.life / particle.maxLife;
            positions[i * 3] = particle.position.x;
            positions[i * 3 + 1] = particle.position.y;
            positions[i * 3 + 2] = particle.position.z;

            colors[i * 3] = particle.color.r;
            colors[i * 3 + 1] = particle.color.g;
            colors[i * 3 + 2] = particle.color.b;

            // Fade out based on life
            sizes[i] = (1 - lifeRatio) * 0.3;

            // Deactivate when dead
            if (particle.life >= particle.maxLife) {
                particle.active = false;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    private getInactiveParticle(): Particle | null {
        return this.particles.find(p => !p.active) || null;
    }

    dispose(): void {
        if (this.particleMesh) {
            this.scene.remove(this.particleMesh);
        }
        this.geometry.dispose();
        this.material.dispose();
    }
}
