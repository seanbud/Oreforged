import React from 'react';

interface ToastNotificationProps {
    message: string;
    onComplete?: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message, onComplete }) => {
    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onComplete?.();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onComplete]);

    if (!message) return null;

    return (
        <>
            <div style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                zIndex: 20,
                pointerEvents: 'none',
                animation: 'toastSlideInFade 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                border: '2px solid rgba(255, 255, 255, 0.2)',
            }}>
                {message}
            </div>

            <style>{`
                @keyframes toastSlideInFade {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-30px);
                    }
                    10% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0px);
                    }
                    90% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0px);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-10px);
                    }
                }
            `}</style>
        </>
    );
};
