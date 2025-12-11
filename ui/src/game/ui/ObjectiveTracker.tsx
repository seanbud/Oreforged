import React, { useState, useEffect } from 'react';
import { Colors, Styles } from '../../design/tokens';
import { CraftingRecipe, ToolTier, BlockType, CRAFTING_RECIPES } from '../data/GameDefinitions';

interface ObjectiveTrackerProps {
    currentTool: ToolTier;
    inventory: Record<number, number>;
    onCraft: (recipe: CraftingRecipe) => void;
}

export const ObjectiveTracker: React.FC<ObjectiveTrackerProps> = ({ currentTool, inventory, onCraft }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Find next objective
    const nextRecipe = CRAFTING_RECIPES.find(r =>
        (r.requires === null && currentTool === ToolTier.HAND) ||
        r.requires === currentTool
    );

    // Auto-expand/notify when affordable
    const canAfford = nextRecipe ? Array.from(nextRecipe.cost.entries()).every(([block, required]) => (inventory[block] || 0) >= required) : false;

    useEffect(() => {
        if (canAfford) {
            // Optional: Auto expand or trigger sound
            // setIsExpanded(true); 
        }
    }, [canAfford]);

    if (!nextRecipe) return null; // Or show "Complete" state

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                fontFamily: Styles.Font.Family,
                imageRendering: Styles.Font.Pixelated,
                display: 'flex',
                alignItems: 'flex-end',
                flexDirection: 'column',
                zIndex: 50,
            }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => !canAfford && setIsExpanded(false)} // Keep expanded if ready? No, consistent interaction.
        >
            <style>
                {`
                    @keyframes slide-up {
                        0% { transform: translateY(100%); opacity: 0; }
                        100% { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes pulse-ready {
                        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                        70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                    }
                `}
            </style>

            {/* Main Toggle / Summary Bar */}
            <button
                onClick={() => canAfford ? onCraft(nextRecipe) : setIsExpanded(!isExpanded)}
                style={{
                    backgroundColor: canAfford ? Colors.Green.Base : 'rgba(30, 30, 30, 0.9)',
                    border: `1px solid ${canAfford ? Colors.Green.BorderLight : Colors.Grey.Light}`,
                    padding: '12px 16px',
                    color: Colors.White,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    minWidth: '240px',
                    justifyContent: 'space-between',
                    boxShadow: canAfford ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
                    animation: canAfford ? 'pulse-ready 2s infinite' : 'slide-up 0.5s ease-out',
                    transition: 'all 0.2s ease',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{
                        fontSize: '10px',
                        color: canAfford ? 'rgba(255,255,255,0.8)' : Colors.Grey.TextDim,
                        textTransform: 'uppercase'
                    }}>
                        {canAfford ? 'UPGRADE AVAILABLE' : 'CURRENT OBJECTIVE'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {nextRecipe.displayName.toUpperCase()}
                    </span>
                </div>

                <div style={{
                    fontSize: '18px',
                    color: canAfford ? Colors.White : Colors.Grey.TextDim,
                }}>
                    {canAfford ? '▲' : (isExpanded ? '▼' : '◄')}
                </div>
            </button>

            {/* Collapsible Details */}
            {isExpanded && !canAfford && (
                <div style={{
                    marginTop: '8px',
                    width: '100%',
                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                    border: `1px solid ${Colors.Grey.Dark}`,
                    padding: '12px',
                    borderRadius: '4px',
                    animation: 'slide-up 0.2s ease-out',
                }}>
                    {Array.from(nextRecipe.cost.entries()).map(([block, required]) => {
                        const current = inventory[block] || 0;
                        const progress = Math.min(1, current / required);
                        const isComplete = current >= required;
                        const blockName = BlockType[block].toUpperCase();

                        return (
                            <div key={block} style={{ fontSize: '10px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: Colors.Grey.Text }}>
                                    <span>MAT_{blockName}</span>
                                    <span style={{ color: isComplete ? Colors.Green.BorderLight : Colors.Grey.TextDim }}>
                                        {current}/{required}
                                    </span>
                                </div>
                                <div style={{
                                    height: '4px',
                                    width: '100%',
                                    backgroundColor: '#111',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progress * 100}%`,
                                        backgroundColor: isComplete ? Colors.Green.Base : Colors.Grey.Light,
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
