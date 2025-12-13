import React from 'react';

interface PositiveBurstOverlayProps {
    isActive: boolean;
}

export const PositiveBurstOverlay: React.FC<PositiveBurstOverlayProps> = ({ isActive }) => {
    if (!isActive) return null;

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 150,
                animation: 'positiveBurst 1.5s ease-out forwards',
                background: 'radial-gradient(circle at center, rgba(76, 175, 80, 0.3) 0%, transparent 70%)',
            }} />

            {/* Corner bursts */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 151,
            }}>
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at top left, rgba(255, 215, 0, 0.2) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out forwards',
                }} />
                <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at top right, rgba(255, 215, 0, 0.2) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out 0.1s forwards',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at bottom left, rgba(64, 164, 223, 0.2) 0%, transparent 60%)',
                    animation: 'burstCorner 1s ease-out 0.2s forwards',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '40%',
                    height: '40%',
                    background: 'radial-gradient(circle at bottom right, rgba(64, 164, 223, 0.2) 0%, transparent 60%)',
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
