import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface DamageNumber {
    id: number;
    value: number | string;
    x: number;
    y: number;
    timestamp: number;
    color?: string;
    lifetime: number; // Duration in milliseconds
}

interface DamageNumberOverlayProps {
    camera: THREE.Camera | null;
}

let damageNumberId = 0;
const damageNumbers: DamageNumber[] = [];

// Global function to spawn damage numbers
export function spawnDamageNumber(
    worldPos: THREE.Vector3,
    value: number | string,
    camera: THREE.Camera,
    container: HTMLElement,
    color?: string,
    lifetime: number = 1000 // Default 1 second
) {
    // Project world position to screen space
    const screenPos = worldPos.clone().project(camera);

    const rect = container.getBoundingClientRect();
    const x = (screenPos.x * 0.5 + 0.5) * rect.width;
    const y = (-(screenPos.y * 0.5) + 0.5) * rect.height;

    damageNumbers.push({
        id: damageNumberId++,
        value,
        x,
        y,
        timestamp: Date.now(),
        color,
        lifetime
    });
}

export function DamageNumberOverlay({ camera }: DamageNumberOverlayProps) {
    const [numbers, setNumbers] = useState<DamageNumber[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            // Remove old damage numbers based on their lifetime
            const filtered = damageNumbers.filter(n => now - n.timestamp < n.lifetime);
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
                const age = (Date.now() - num.timestamp) / num.lifetime; // 0 to 1 over lifetime
                const yOffset = age * 50; // Rise up
                const opacity = Math.max(0, 1 - age);
                const isText = typeof num.value === 'string';

                return (
                    <div
                        key={num.id}
                        style={{
                            position: 'absolute',
                            left: num.x,
                            top: num.y - yOffset,
                            transform: 'translate(-50%, -50%)',
                            color: num.color || 'white',
                            fontSize: isText ? '14px' : '18px',
                            fontWeight: 'bold',
                            fontFamily: isText ? 'monospace' : 'inherit',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            opacity,
                            animation: 'damageNumberBounce 0.3s ease-out',
                        }}
                    >
                        {num.value}
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
