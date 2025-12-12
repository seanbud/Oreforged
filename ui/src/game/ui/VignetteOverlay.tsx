import React, { useEffect, useState } from 'react';

interface VignetteOverlayProps {
    healthRatio: number; // 0 to 1
    isBroken: boolean;
}

const VignetteOverlay: React.FC<VignetteOverlayProps> = ({ healthRatio, isBroken }) => {
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (isBroken) {
            setOpacity(0.6); // Base opacity for pulsing
            return;
        }

        // Only start showing when health is below 30%
        if (healthRatio < 0.3) {
            // Map 0.3 -> 0 to 0 -> 0.8 opacity
            // (0.3 - ratio) / 0.3 * 0.8
            const intensity = ((0.3 - healthRatio) / 0.3) * 0.8;
            setOpacity(intensity);
        } else {
            setOpacity(0);
        }
    }, [healthRatio, isBroken]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 90, // Below UI menus but above game
                background: 'radial-gradient(circle, transparent 50%, rgba(200, 20, 20, 0.9) 150%)',
                opacity: opacity,
                transition: isBroken ? 'none' : 'opacity 0.5s ease-out',
                animation: isBroken ? 'pulse-vignette 2s infinite ease-in-out' : 'none'
            }}
        >
            <style>{`
                @keyframes pulse-vignette {
                    0% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                    100% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default VignetteOverlay;
