import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface DamageNumber {
    id: number;
    damage: number;
    x: number;
    y: number;
    timestamp: number;
}

interface DamageNumberOverlayProps {
    camera: THREE.Camera | null;
}

let damageNumberId = 0;
const damageNumbers: DamageNumber[] = [];

// Global function to spawn damage numbers
export function spawnDamageNumber(worldPos: THREE.Vector3, damage: number, camera: THREE.Camera, container: HTMLElement) {
    // Project world position to screen space
    const screenPos = worldPos.clone().project(camera);

    const rect = container.getBoundingClientRect();
    const x = (screenPos.x * 0.5 + 0.5) * rect.width;
    const y = (-(screenPos.y * 0.5) + 0.5) * rect.height;

    damageNumbers.push({
        id: damageNumberId++,
        damage,
        x,
        y,
        timestamp: Date.now(),
    });
}

export function DamageNumberOverlay({ camera }: DamageNumberOverlayProps) {
    const [numbers, setNumbers] = useState<DamageNumber[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            // Remove old damage numbers (after 1 second)
            const filtered = damageNumbers.filter(n => now - n.timestamp < 1000);
            setNumbers([...filtered]);

            // Clean up global array
            damageNumbers.length = 0;
            damageNumbers.push(...filtered);
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, []);

    if (!camera) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 100,
        }}>
            {numbers.map((num) => {
                const age = (Date.now() - num.timestamp) / 1000; // 0 to 1
                const yOffset = age * 50; // Rise up
                const opacity = Math.max(0, 1 - age);

                return (
                    <div
                        key={num.id}
                        style={{
                            position: 'absolute',
                            left: num.x,
                            top: num.y - yOffset,
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            opacity,
                            animation: 'damageNumberBounce 0.3s ease-out',
                        }}
                    >
                        {num.damage}
                    </div>
                );
            })}

            <style>{`
                @keyframes damageNumberBounce {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.2);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}
