import React from 'react';
import { Colors } from '../design/tokens';

interface GameLayoutProps {
    children: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ children }) => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: Colors.Black,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {children}
        </div>
    );
};

export const GameLayer: React.FC<{ children: React.ReactNode, zIndex?: number, pointerEvents?: 'auto' | 'none' }> = ({ children, zIndex = 0, pointerEvents = 'auto' }) => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: zIndex,
            pointerEvents: pointerEvents
        }}>
            {children}
        </div>
    );
};

export const HUDLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <GameLayer zIndex={10} pointerEvents="none">
            {/* HUD container allows clicks to pass through, but children (buttons) catch them */}
            <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                {children}
            </div>
        </GameLayer>
    );
};
