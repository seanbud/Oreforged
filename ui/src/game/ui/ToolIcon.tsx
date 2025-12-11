import React from 'react';
import { ToolTier } from '../data/GameDefinitions';

interface ToolIconProps {
    tier: ToolTier;
    size?: number;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ tier, size = 48 }) => {
    let headColor = '#fff';
    switch (tier) {
        case ToolTier.WOOD: headColor = '#8D6E63'; break; // Wood brown
        case ToolTier.STONE: headColor = '#9E9E9E'; break; // Stone grey
        case ToolTier.IRON: headColor = '#D7CCC8'; break; // Iron white-ish
        case ToolTier.GOLD: headColor = '#FFD54F'; break; // Gold yellow
        case ToolTier.DIAMOND: headColor = '#4DD0E1'; break; // Diamond cyan
        case ToolTier.HAND: headColor = '#FFAB91'; break; // Light skin tone
        default: headColor = '#fff';
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
