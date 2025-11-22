import { useEffect, useState } from 'react';
import { VoxelRenderer } from './game/VoxelRenderer';
import Panel from './components/Panel';
import { remoteFacet } from './engine/hooks';
import { useFacetMap } from '@react-facet/core';
import { FastLabel } from './engine/components';

declare global {
    interface Window {
        uiReady?: () => void;
    }
}

const tickCountFacet = remoteFacet<number>('tick_count', 0);

function App() {
    const tickText = useFacetMap(tick => `Tick: ${tick}`, [], [tickCountFacet]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        console.log("App mounted, checking uiReady");
        // Signal C++ that UI is ready to receive data
        if (window.uiReady) {
            console.log("Calling uiReady");
            window.uiReady();
        } else {
            console.error("uiReady not defined on window object");
            console.log("Window keys:", Object.keys(window));
        }

        // Input listener for ESC
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {/* 3D Voxel World */}
            <VoxelRenderer />

            {/* UI Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none', // Allow clicks to pass through to 3D scene
            }}>
                {/* Top-left debug panel */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    pointerEvents: 'auto', // Re-enable pointer events for this panel
                }}>
                    <Panel style={{ padding: '12px', minWidth: '200px' }}>
                        <div style={{ color: '#fff', fontSize: '14px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>OreForged</div>
                            <div style={{ color: '#aaa' }}>
                                <FastLabel text={tickText} />
                            </div>
                            <div style={{ color: '#aaa', marginTop: '4px', fontSize: '12px' }}>
                                Press ESC for menu
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>

            {/* Menu Overlay */}
            {isMenuOpen && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100
                }}>
                    <Panel style={{ padding: '20px', minWidth: '300px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h2 style={{ color: 'white', margin: '0 0 20px 0', textAlign: 'center' }}>Game Menu</h2>
                            <button
                                style={{ padding: '10px', cursor: 'pointer', fontSize: '16px' }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Resume Game
                            </button>
                            <button style={{ padding: '10px', cursor: 'pointer', fontSize: '16px' }}>Settings</button>
                            <button style={{ padding: '10px', cursor: 'pointer', fontSize: '16px' }}>Quit</button>
                        </div>
                    </Panel>
                </div>
            )}
        </div>
    );
}

export default App;
