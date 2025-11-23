import React from 'react';

interface GameLayoutProps {
    renderer: React.ReactNode;
    children: React.ReactNode;
}

/**
 * GameLayout
 * 
 * A layout component that composes the 3D renderer (background) and the UI overlay (foreground).
 * The renderer is placed at z-index 0.
 * The children (UI) are placed at z-index 1 with pointer-events: none by default.
 * Interactive UI elements must explicitly set pointer-events: auto.
 */
export const GameLayout: React.FC<GameLayoutProps> = ({ renderer, children }) => {
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* Renderer Layer (Background) */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                {renderer}
            </div>

            {/* UI Layer (Foreground) */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                {children}
            </div>
        </div>
    );
};
