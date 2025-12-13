import React, { useState } from 'react';
import { Colors, Styles } from '../../../design/tokens';
import { ToolTier, BlockType, CRAFTING_RECIPES } from '../../data/GameDefinitions';

interface FramedLabelProps {
    label: string;
    icon?: React.ReactNode;
    color?: string;
    tooltip?: string;
}

const FramedLabel: React.FC<FramedLabelProps> = ({ label, icon, color = Colors.White, tooltip }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#2b2b2b',
                border: '2px solid #000',
                boxShadow: 'inset 2px 2px 0px rgba(255,255,255,0.1), inset -2px -2px 0px rgba(0,0,0,0.5)',
                fontFamily: Styles.Font.Family,
                color: color,
                fontSize: '12px',
                position: 'relative',
                cursor: tooltip ? 'help' : 'default',
                pointerEvents: 'auto'
            }}
        >
            {icon && <div style={{ display: 'flex' }}>{icon}</div>}
            <div style={{ textShadow: '2px 2px 0px #000' }}>{label}</div>

            {/* Tooltip */}
            {isHovered && tooltip && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    marginTop: '8px',
                    left: '50%',
                    transform: 'translate(-50%, 0)',
                    backgroundColor: '#111',
                    border: '2px solid #fff',
                    padding: '8px',
                    width: 'max-content',
                    maxWidth: '200px',
                    color: '#fff',
                    zIndex: 100,
                    fontSize: '10px',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
                }}>
                    {tooltip}
                </div>
            )}
        </div>
    );
};

interface StatsStripProps {
    energyLevel: number;
    oreLevel: number;
    treeLevel: number;
    currentTool: ToolTier;
    worldResourceCounts: Record<BlockType, number>; // World counts, not inventory
}

export const StatsStrip: React.FC<StatsStripProps> = ({
    energyLevel,
    oreLevel,
    treeLevel,
    currentTool,
    worldResourceCounts
}) => {
    // Unique Size Labels per Level (Max Level 12)
    const sizeLabels = [
        "Tiny Island",        // Lvl 0
        "Very Small Island",  // Lvl 1
        "Small Island",       // Lvl 2
        "Small-Mid Island",   // Lvl 3
        "Medium Island",      // Lvl 4
        "Big Island",         // Lvl 5
        "Bigger Island",      // Lvl 6
        "Large Island",       // Lvl 7 (map starts expanding)
        "Larger Island",      // Lvl 8
        "Huge Island",        // Lvl 9
        "Massive Island",     // Lvl 10
        "Epic Landmass",      // Lvl 11
        "Mega Continent"      // Lvl 12 (max)
    ];
    let sizeLabel = sizeLabels[Math.min(energyLevel, sizeLabels.length - 1)] || "Unknown";

    // Find all resources the player has already needed (from completed recipes)
    const completedRecipes = CRAFTING_RECIPES.filter(r => {
        if (r.result === ToolTier.HAND) return false;
        return r.result <= currentTool; // Player has this tool or has progressed past it
    });

    let lowResourceWarning: { name: string; worldCount: number } | null = null;

    // Check if any resources from completed recipes are depleted in the world
    for (const recipe of completedRecipes) {
        for (const [blockType, _needed] of recipe.cost.entries()) {
            const worldCount = worldResourceCounts[blockType] || 0;
            // Warning threshold: less than 30 blocks remaining in the world (increased from 10)
            if (worldCount < 30) {
                lowResourceWarning = {
                    name: BlockType[blockType],
                    worldCount: worldCount
                };
                break;
            }
        }
        if (lowResourceWarning) break;
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            alignItems: 'center',
            // marginLeft removed (Parent handles gap)
        }}>
            {/* World Stats Label */}
            <FramedLabel
                label={`${sizeLabel}`}
                tooltip={`TREES: (Lvl ${treeLevel})\nORE FIND: (Lvl ${oreLevel})\nSIZE: (Lvl ${energyLevel})`}
                icon={<div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', border: '1px solid #000' }}></div>}
            />

            {/* Dynamic Resource Warning - Contextual to world depletion */}
            {lowResourceWarning && (
                <FramedLabel
                    label={`Low ${lowResourceWarning.name}!`}
                    color="#FF5555"
                    tooltip={`This map is running low on ${lowResourceWarning.name}.\nConsider regenerating the world\nto get more resources.`}
                    icon={<div style={{ fontSize: '12px' }}>⚠️</div>}
                />
            )}
        </div >
    );
};
