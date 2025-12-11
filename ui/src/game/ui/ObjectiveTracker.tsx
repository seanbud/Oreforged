import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import { CraftingRecipe, ToolTier, BlockType, CRAFTING_RECIPES } from '../data/GameDefinitions';
import { ToolIcon } from './ToolIcon';

interface ObjectiveTrackerProps {
    currentTool: ToolTier;
    inventory: Record<number, number>;
    totalMined: number;
    toolHealth: number;
    onCraft: (recipe: CraftingRecipe) => void;
    onRepair: () => void;
}

export const ObjectiveTracker: React.FC<ObjectiveTrackerProps> = ({ currentTool, inventory, totalMined, toolHealth, onCraft, onRepair }) => {
    // Stage 0: Stealth
    if (totalMined < 6) return null;

    // Stage 1: Calibration
    const calibrationTarget = 16;
    if (totalMined < calibrationTarget) {
        return (
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                fontFamily: Styles.Font.Family,
                imageRendering: Styles.Font.Pixelated,
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                border: `1px solid ${Colors.Grey.Light}`,
                padding: '8px 16px',
                color: Colors.Grey.TextDim,
                fontSize: '10px',
            }}>
                CALIBRATING SENSORS... {totalMined}/{calibrationTarget}
            </div>
        );
    }

    // Repair Logic (Overrides Upgrade if Broken)
    if (currentTool !== ToolTier.HAND && toolHealth <= 0) {
        // Determine Repair Cost
        let repairType = BlockType.Wood;
        if (currentTool === ToolTier.STONE) repairType = BlockType.Stone;
        if (currentTool === ToolTier.IRON) repairType = BlockType.Iron;
        if (currentTool === ToolTier.GOLD) repairType = BlockType.Gold;
        if (currentTool === ToolTier.DIAMOND) repairType = BlockType.Diamond;

        const cost = 3;
        const current = inventory[repairType] || 0;
        const canRepair = current >= cost;
        const matName = BlockType[repairType].toUpperCase();

        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    fontFamily: Styles.Font.Family,
                    imageRendering: Styles.Font.Pixelated,
                    zIndex: 100,
                    cursor: canRepair ? 'pointer' : 'default',
                }}
                onClick={() => canRepair && onRepair()}
            >
                <div style={{
                    backgroundColor: canRepair ? Colors.Green.Base : '#3E2723', // Dark Red/Brown
                    border: `1px solid ${canRepair ? Colors.Green.BorderLight : '#EF5350'}`,
                    padding: '8px 16px',
                    color: Colors.White,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    animation: canRepair ? 'pulse-ready 2s infinite' : 'none',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFEB3B' }}>
                            SYSTEM CRITICAL: TOOL BROKEN
                        </span>
                        <span style={{ fontSize: '10px', color: canRepair ? 'white' : '#FFCDD2' }}>
                            {canRepair ? 'CLICK TO REPAIR' : `REPAIR: ${matName} ${current}/${cost}`}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Stage 2+: Upgrades
    const nextRecipe = CRAFTING_RECIPES.find(r =>
        (r.requires === null && currentTool === ToolTier.HAND) ||
        r.requires === currentTool
    );

    if (!nextRecipe) return null;

    const canAfford = Array.from(nextRecipe.cost.entries()).every(([block, required]) => (inventory[block] || 0) >= required);

    // Build cost string (Show ALL costs now)
    const costElements = Array.from(nextRecipe.cost.entries()).map(([block, required]) => {
        const current = inventory[block] || 0;
        const name = BlockType[block].toUpperCase().slice(0, 3);
        const isMet = current >= required;
        return (
            <span key={block} style={{ color: isMet ? Colors.Green.BorderLight : Colors.Grey.TextDim, marginRight: '8px' }}>
                {name} {current}/{required}
            </span>
        );
    });

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                fontFamily: Styles.Font.Family,
                imageRendering: Styles.Font.Pixelated,
                zIndex: 50,
                cursor: canAfford ? 'pointer' : 'default',
            }}
            onClick={() => canAfford && onCraft(nextRecipe)}
        >
            <style>
                {`
                    @keyframes pulse-ready {
                        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                        70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                    }
                `}
            </style>

            <div style={{
                backgroundColor: canAfford ? Colors.Green.Base : 'rgba(30, 30, 30, 0.9)',
                border: `1px solid ${canAfford ? Colors.Green.BorderLight : Colors.Grey.Light}`,
                padding: '8px 16px',
                color: Colors.White,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '4px',
                boxShadow: canAfford ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
                animation: canAfford ? 'pulse-ready 2s infinite' : 'none',
                transition: 'all 0.2s ease',
            }}>
                <div style={{
                    width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px'
                }}>
                    <ToolIcon tier={nextRecipe.result} size={18} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {nextRecipe.displayName.toUpperCase()}
                    </span>
                    <div style={{ fontSize: '10px', display: 'flex' }}>
                        {canAfford ? 'UPGRADE READY' : costElements}
                    </div>
                </div>
            </div>
        </div>
    );
};
