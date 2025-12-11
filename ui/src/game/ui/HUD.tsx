import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import { BlockType, BLOCK_DEFINITIONS } from '../data/GameDefinitions';

interface HUDProps {
    inventory: Record<number, number>;
}

export const HUD: React.FC<HUDProps> = ({ inventory }) => {
    // We want to show at least a few empty slots or just the collected ones
    // For now, let's show all block types that have > 0 count
    const items = Object.entries(inventory).filter(([_, count]) => count > 0);

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px', // Tighter blocking
            padding: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Subtle backing
            border: `${Styles.Border.Width} solid ${Colors.Grey.Dark}`,
            boxShadow: Styles.Shadows.Bevel(Colors.Grey.Light, Colors.Grey.Dark),
            imageRendering: Styles.Font.Pixelated,
            fontFamily: Styles.Font.Family,
        }}>
            {items.length === 0 && (
                <div style={{ padding: '10px', color: Colors.Grey.TextDim }}>
                    Mine blocks to collect resources...
                </div>
            )}

            {items.map(([type, count]) => {
                const blockType = Number(type) as BlockType;
                // Use definitions for colors
                const def = BLOCK_DEFINITIONS[blockType];
                const color = '#' + def.color.toString(16).padStart(6, '0');

                return (
                    <div key={type} style={{
                        width: '50px',
                        height: '50px',
                        backgroundColor: '#8b8b8b', // Slot background
                        border: '2px solid #373737',
                        borderRightColor: '#ffffff',
                        borderBottomColor: '#ffffff',
                        // Actually, standard MC slots are dark grey with light bottom-right? 
                        // No, usually inset. Top-Left Dark, Bottom-Right Light.
                        boxShadow: 'inset 2px 2px 0px #373737, inset -2px -2px 0px #ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: color,
                            boxShadow: '2px 2px 0px rgba(0,0,0,0.5)', // Block shadow
                        }} />
                        <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '4px',
                            color: Colors.White,
                            textShadow: Styles.Shadows.Text(Colors.Black),
                            fontSize: '16px',
                            fontWeight: 'bold',
                        }}>
                            {count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
