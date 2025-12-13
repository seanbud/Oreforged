import React from 'react';
import { HUDLayer } from '../../layouts/GameLayout';
import VignetteOverlay from './VignetteOverlay';
import TitleCard from '../../oreui/TitleCard';
import { StatsStrip } from './menu/StatsStrip';
import { ResourceManifest } from './ResourceManifest';
import { ObjectiveTracker } from './ObjectiveTracker';
import { CurrentToolDisplay } from './CurrentToolDisplay';
import { remoteFacet, useFacetState } from '../../engine/hooks';
import { bridge } from '../../engine/bridge';
import { BlockType, ToolTier } from '../data/GameDefinitions';

// Facets
const playerStats = remoteFacet('player_stats', {
    totalMined: 0,
    currentTool: 0,
    toolHealth: 100,
    isToolBroken: false,
    damageMultiplier: 1.0,
});

const progression = remoteFacet('progression', {
    tree: 0,
    ore: 0,
    energy: 0,
    damage: 0
});

const inventoryFacet = remoteFacet('inventory', {} as Record<BlockType, number>);
// Note: We need a way to detect "has calibrated". 
// In C++, we don't have a specific flag, but we can infer it or add it.
// For now, let's assume if totalMined > 0 or tool > HAND, we have started. 
// Or add 'unlock_crafting' facet.
const unlockCraftingFacet = remoteFacet('unlock_crafting', false);

// World Stats for now still local or needs backend support?
// The backend didn't implement 'worldStats' (resource counts in world). 
// Let's keep `worldStats` as passed props from VoxelRenderer for now since that comes from chunk scanning?
// Wait, VoxelRenderer computes it.
import { VoxelRenderer } from '../VoxelRenderer';

interface GameHUDProps {
    isMenuOpen: boolean;
    worldStats: Partial<Record<BlockType, number>>; // Passed from Renderer
}

export const GameHUD: React.FC<GameHUDProps> = ({ isMenuOpen, worldStats }) => {
    const stats = useFacetState(playerStats);
    const ups = useFacetState(progression);
    const inv = useFacetState(inventoryFacet);
    // Explicitly cast to boolean as sometimes it might be string "true" depending on backend push (though we handled it)
    const hasCalibrated = Boolean(useFacetState(unlockCraftingFacet));

    const currentTool = stats.currentTool as ToolTier;

    return (
        <HUDLayer>
            <VignetteOverlay healthRatio={stats.toolHealth / 100} isBroken={stats.isToolBroken} />

            {!isMenuOpen && (
                <>
                    {/* Top Left */}
                    <div style={{ position: 'absolute', top: '20px', left: '20px', pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <TitleCard />
                        <div style={{ paddingTop: '4px' }}>
                            {/* We show StatsStrip only if calibrated or significant progress */}
                            {(hasCalibrated || stats.totalMined > 10) && (
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

                    {/* Top Right */}
                    <ResourceManifest inventory={inv} totalMined={stats.totalMined} />

                    {/* Bottom Right */}
                    <div style={{ pointerEvents: 'auto' }}>
                        <ObjectiveTracker
                            currentTool={currentTool}
                            inventory={inv}
                            totalMined={stats.totalMined}
                            toolHealth={stats.toolHealth}
                            hasCalibrated={hasCalibrated}
                            onCraft={(r) => bridge.call('craft', [JSON.stringify(r)])}
                            onRepair={() => bridge.call('repairTool')}
                            onUnlockCrafting={() => bridge.call('unlockCrafting')}
                        />
                    </div>
                    <CurrentToolDisplay
                        currentTool={currentTool}
                        toolHealth={stats.toolHealth}
                        damageMultiplier={stats.damageMultiplier}
                    />
                </>
            )}
        </HUDLayer>
    );
}
