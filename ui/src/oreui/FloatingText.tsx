import React from 'react';

interface FloatingTextItem {
    id: number;
    text: string;
    offset: number;
}

interface FloatingTextContainerProps {
    texts: FloatingTextItem[];
    color?: string;
    fontSize?: string;
    duration?: number;
}

export const FloatingTextContainer: React.FC<FloatingTextContainerProps> = ({
    texts,
    color = '#CCCCCC',
    fontSize = '14px',
    duration = 1000
}) => {
    return (
        <>
            {texts.map(item => (
                <div
                    key={item.id}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: `calc(50% + ${item.offset}px)`,
                        transform: 'translate(-50%, -50%)',
                        color: color,
                        fontWeight: 'bold',
                        fontSize: fontSize,
                        fontFamily: '"Minecraft", "Press Start 2P", monospace',
                        pointerEvents: 'none',
                        animation: `floatUpFade ${duration}ms ease-out forwards`,
                        textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
                        zIndex: 1000,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {item.text}
                </div>
            ))}

            <style>{`
                @keyframes floatUpFade {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) translateY(0px);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) translateY(-40px);
                    }
                }
            `}</style>
        </>
    );
};

// Hook for managing floating texts
export const useFloatingTexts = (duration: number = 1000) => {
    const [texts, setTexts] = React.useState<FloatingTextItem[]>([]);
    const nextId = React.useRef(0);

    const addText = React.useCallback((text: string, randomOffset: boolean = true) => {
        const offset = randomOffset ? (Math.random() - 0.5) * 40 : 0;
        const id = nextId.current++;

        setTexts(prev => [...prev, { id, text, offset }]);

        setTimeout(() => {
            setTexts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, [duration]);

    return { texts, addText };
};
