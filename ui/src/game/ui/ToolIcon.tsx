import React from 'react';
import { ToolTier } from '../data/GameDefinitions';

interface ToolIconProps {
    tier: ToolTier;
    size?: number;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ tier, size = 48 }) => {
    let headColor = '#fff';
    switch (tier) {
        case ToolTier.WOOD_STICK: headColor = '#8D6E63'; break;
        case ToolTier.WOOD_PICK: headColor = '#8D6E63'; break;
        case ToolTier.STONE_PICK: headColor = '#9E9E9E'; break;
        case ToolTier.FURNACE: headColor = '#424242'; break;
        case ToolTier.BRONZE_PICK: headColor = '#CD7F32'; break;
        case ToolTier.IRON_PICK: headColor = '#ECEFF1'; break; // Brighter Iron
        case ToolTier.GOLD_PICK: headColor = '#FFD54F'; break;
        case ToolTier.DIAMOND_PICK: headColor = '#4DD0E1'; break;
        case ToolTier.HAND: headColor = '#FFAB91'; break;
        default: headColor = '#fff';
    }

    if (tier === ToolTier.FURNACE) {
        return (
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="28" height="28" fill={headColor} stroke="#212121" strokeWidth="4" />
                <rect x="18" y="24" width="12" height="10" fill="#FF5722" />
                <rect x="14" y="14" width="20" height="4" fill="#616161" />
            </svg>
        );
    }

    if (tier === ToolTier.WOOD_STICK) {
        return (
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 36L36 12" stroke={headColor} strokeWidth="6" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {tier === ToolTier.HAND ? (
                // Simple Hand Icon (Fist/Palm?)
                <circle cx="24" cy="24" r="10" stroke={headColor} strokeWidth="4" />
            ) : (
                <>
                    {/* Handle */}
                    <path d="M14 34L24 24" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" />
                    {/* Pick Head */}
                    <path d="M18 18C18 18 21 12 27 12C33 12 30 21 30 21" stroke={headColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Simple geometric representation */}
                    <path d="M22 14L34 26" stroke={headColor} strokeWidth="6" strokeLinecap="round" />
                </>
            )}
        </svg>
    );
};
