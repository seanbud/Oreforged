import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import { CraftingRecipe, ToolTier } from '../data/GameDefinitions';

interface UpgradePopupProps {
    recipe: CraftingRecipe;
    onCraft: () => void;
}

const ToolIcon = ({ tier }: { tier: ToolTier }) => {
    let headColor = '#fff';
    switch (tier) {
        case ToolTier.WOOD_STICK: headColor = '#8D6E63'; break;
        case ToolTier.WOOD_PICK: headColor = '#8D6E63'; break;
        case ToolTier.STONE_PICK: headColor = '#9E9E9E'; break;
        case ToolTier.FURNACE: headColor = '#424242'; break;
        case ToolTier.BRONZE_PICK: headColor = '#CD7F32'; break;
        case ToolTier.IRON_PICK: headColor = '#D7CCC8'; break;
        case ToolTier.GOLD_PICK: headColor = '#FFD54F'; break;
        case ToolTier.DIAMOND_PICK: headColor = '#4DD0E1'; break;
        default: headColor = '#fff';
    }

    return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Handle */}
            <path d="M14 34L24 24" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" />
            {/* Pick Head */}
            <path d="M18 18C18 18 21 12 27 12C33 12 30 21 30 21" stroke={headColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Simple geometric representation */}
            <path d="M22 14L34 26" stroke={headColor} strokeWidth="6" strokeLinecap="round" />
        </svg>
    );
};

export const UpgradePopup: React.FC<UpgradePopupProps> = ({ recipe, onCraft }) => {
    return (
        <>
            <style>
                {`
                    @keyframes slide-up-spring {
                        0% { transform: translate(-50%, 20px); opacity: 0; }
                        100% { transform: translate(-50%, 0); opacity: 1; }
                    }
                `}
            </style>
            <div style={{
                position: 'absolute',
                top: '20%', // Higher up
                left: '50%',
                transform: 'translate(-50%, 0)', // Centered X
                animation: 'slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                zIndex: 100,
            }}>
                <button
                    onClick={onCraft}
                    style={{
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        border: `1px solid ${Colors.Grey.Light}`,
                        borderRadius: '8px',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        color: Colors.White,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(8px)',
                        transition: 'transform 0.1s ease, background-color 0.1s',
                        outline: 'none',
                        minWidth: '300px',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.backgroundColor = 'rgba(40, 40, 40, 0.95)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
                    }}
                    onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.98)';
                    }}
                >
                    {/* Icon Container */}
                    <div style={{
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                    }}>
                        <ToolIcon tier={recipe.result} />
                    </div>

                    {/* Text Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                        <div style={{
                            fontSize: '12px',
                            color: Colors.Green.BorderLight,
                            fontWeight: '600',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            fontFamily: '"Inter", sans-serif', // Clean font for label
                            marginBottom: '2px',
                        }}>
                            Upgrade Available
                        </div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            fontFamily: Styles.Font.Family, // Pixel font for header
                            color: Colors.White,
                        }}>
                            Craft {recipe.displayName}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: '#aaa',
                            marginTop: '4px',
                            fontFamily: '"Inter", sans-serif',
                            display: 'flex',
                            gap: '8px',
                        }}>
                            {Array.from(recipe.cost.entries()).map(([type, count]) => (
                                <span key={type}>{count}x Blocks</span>
                            ))}
                        </div>
                    </div>

                    {/* Arrow / Action hint */}
                    <div style={{
                        color: Colors.Grey.TextDim,
                        fontSize: '20px',
                    }}>
                        →
                    </div>
                </button>
            </div>
        </>
    );
};
