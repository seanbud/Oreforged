import React from 'react';
import { HUDLayer } from '../../layouts/GameLayout';
import VignetteOverlay from './VignetteOverlay';
import TitleCard from '../../oreui/TitleCard';
import { StatsStrip } from './menu/StatsStrip';
import { ResourceManifest } from './ResourceManifest';
import { ObjectiveTracker } from './ObjectiveTracker';
import { CurrentToolDisplay } from './CurrentToolDisplay';
import { useFacetState } from '../../engine/hooks';
import { bridge } from '../../engine/bridge';
import { BlockType, ToolTier } from '../data/GameDefinitions';
import { Facets } from '../data/Facets';
import { PositiveBurstOverlay } from './PositiveBurstOverlay';
import { ToastNotification } from './ToastNotification';

interface GameHUDProps {
    isMenuOpen: boolean;
    worldStats: Partial<Record<BlockType, number>>; // Passed from Renderer
}

export const GameHUD: React.FC<GameHUDProps> = ({ isMenuOpen, worldStats }) => {
    const stats = useFacetState(Facets.PlayerStats);
    const ups = useFacetState(Facets.Progression);
    const inv = useFacetState(Facets.Inventory);
    const hasCalibrated = Boolean(useFacetState(Facets.UnlockCrafting));
    const toastMessage = useFacetState(Facets.ShowToast);

    const currentTool = stats.currentTool as ToolTier;

    // Celebration Logic
    const [showBurst, setShowBurst] = React.useState(false);
    const prevCalibrated = React.useRef(hasCalibrated);

    React.useEffect(() => {
        // Only trigger on rising edge (false -> true)
        if (!prevCalibrated.current && hasCalibrated) {
            setShowBurst(true);
            const timer = setTimeout(() => setShowBurst(false), 1500);
            return () => clearTimeout(timer);
        }
        prevCalibrated.current = hasCalibrated;
    }, [hasCalibrated]);

    return (
        <HUDLayer>
            <PositiveBurstOverlay isActive={showBurst} />
            <PositiveBurstOverlay isActive={showBurst} />
            <VignetteOverlay healthRatio={stats.toolHealth / 100} isBroken={stats.isToolBroken} />

            {!isMenuOpen && (
                <>
                    {/* Top Left */}
                    <div style={{ position: 'absolute', top: '20px', left: '20px', pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <TitleCard />
                        <div style={{ paddingTop: '4px' }}>
                            {/* Stats Strip - Only show if calibrated */}
                            {hasCalibrated && (
                                <StatsStrip
                                    energyLevel={ups.energy}
                                    oreLevel={ups.ore}
                                    treeLevel={ups.tree}
                                    currentTool={currentTool}
                                    worldResourceCounts={worldStats as Record<BlockType, number>}
                                />
                            )}
                        </div>
                    </div>

                    {/* Top Right - Only show if calibrated */}
                    {hasCalibrated && (
                        <ResourceManifest inventory={inv} totalMined={stats.totalMined} />
                    )}

                    {/* Bottom Right */}
                    <div style={{ pointerEvents: 'auto' }}>
                        <ObjectiveTracker
                            currentTool={currentTool}
                            inventory={inv}
                            totalMined={stats.totalMined}
                            toolHealth={stats.toolHealth}
                            hasCalibrated={hasCalibrated}
                            onCraft={(r) => bridge.call('craft', [JSON.stringify(r)])}
                            onRepair={() => bridge.call('repairTool', [])}
                            onUnlockCrafting={() => bridge.call('unlockCrafting', [])}
                        />
                    </div>
                    <CurrentToolDisplay
                        currentTool={currentTool}
                        toolHealth={stats.toolHealth}
                        damageMultiplier={stats.damageMultiplier}
                    />
                </>
            )}

            <ToastNotification
                message={toastMessage}
                onComplete={() => bridge.call('updateGame', ['show_toast', ''])}
            />
        </HUDLayer>
    );
}
