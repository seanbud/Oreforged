import { useState, useEffect } from 'react';
import { VoxelRenderer } from './game/VoxelRenderer';
import { bridge } from './engine/bridge';
import { GameLayout, GameLayer, HUDLayer } from './layouts/GameLayout';
import { GameMenu } from './game/ui/menu/GameMenu';
import { GameHUD } from './game/ui/GameHUD';
import { RegenOverlay } from './game/ui/RegenOverlay';
import ScanlineOverlay from './game/ui/ScanlineOverlay';
import { useFacetState } from './engine/hooks';
import { BlockType, ToolTier } from './game/data/GameDefinitions';

import { Facets } from './game/data/Facets';

import { ErrorBoundary } from './engine/ErrorBoundary';

// Facets (Removed local definitions)

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // View State
    const [autoRotate, setAutoRotate] = useState(false);
    const [rotationSpeed, setRotationSpeed] = useState(0.5);

    // Unwrapped State for VoxelRenderer
    const stats = useFacetState(Facets.PlayerStats);
    const inventory = useFacetState(Facets.Inventory);
    const [worldStats, setWorldStats] = useState<Partial<Record<BlockType, number>>>({});

    // Shake Trigger Logic
    const [shakeTrigger, setShakeTrigger] = useState(0);
    const isToolBroken = stats.isToolBroken;

    useEffect(() => {
        if (isToolBroken) {
            setShakeTrigger(Date.now());
        }
    }, [isToolBroken]);

    // Handle inputs
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-close menu when generating
    const isGenerating = useFacetState(Facets.IsGenerating);
    useEffect(() => {
        if (isGenerating) {
            setIsMenuOpen(false);
        }
    }, [isGenerating]);

    // Initial Ready Call
    useEffect(() => {
        bridge.uiReady();
    }, []);

    const currentTool = stats.currentTool as ToolTier;

    return (
        <ErrorBoundary>
            <GameLayout>
                <GameLayer zIndex={0}>
                    {/* Visuals */}
                    <VoxelRenderer
                        autoRotate={autoRotate}
                        rotationSpeed={rotationSpeed}
                        currentTool={currentTool}
                        isToolBroken={stats.isToolBroken}
                        damageMultiplier={stats.damageMultiplier}
                        onResourceCollected={(type, count) => bridge.call('interact', [type, count])}
                        onWorldUpdate={setWorldStats}
                        externalShakeTrigger={shakeTrigger} // Use one-shot state
                        cameraResetTrigger={0}
                        inventory={inventory}
                    />
                    <ScanlineOverlay />
                </GameLayer>

                <HUDLayer>
                    <GameHUD isMenuOpen={isMenuOpen} worldStats={worldStats} />
                    <RegenOverlay />
                    <GameMenu
                        isOpen={isMenuOpen}
                        onClose={() => setIsMenuOpen(false)}
                        autoRotate={autoRotate}
                        onToggleAutoRotate={setAutoRotate}
                        rotationSpeed={rotationSpeed}
                        onChangeRotationSpeed={setRotationSpeed}
                    />
                </HUDLayer>
            </GameLayout>
        </ErrorBoundary>
    );
}

export default App;
