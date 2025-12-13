import React from 'react';

interface PositiveBurstOverlayProps {
    isActive: boolean;
}

export const PositiveBurstOverlay: React.FC<PositiveBurstOverlayProps> = ({ isActive }) => {
    if (!isActive) return null;

    return (
        <>
            {/* Center white burst */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 150,
                animation: 'positiveBurst 1.5s ease-out forwards',
                background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
            }} />

            {/* Rainbow corner bursts */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 151,
            }}>
                {/* Top-left: Red */}
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at top left, rgba(255, 0, 0, 0.3) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out forwards',
                }} />
                {/* Top-right: Yellow */}
                <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at top right, rgba(255, 255, 0, 0.3) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out 0.1s forwards',
                }} />
                {/* Bottom-left: Cyan */}
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at bottom left, rgba(0, 255, 255, 0.3) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out 0.2s forwards',
                }} />
                {/* Bottom-right: Magenta */}
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at bottom right, rgba(255, 0, 255, 0.3) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out 0.3s forwards',
                }} />
            </div>

            <style>{`
                @keyframes positiveBurst {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    30% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(1.5);
                    }
                }
                @keyframes burstCorner {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(1.2);
                    }
                }
            `}</style>
        </>
    );
};
