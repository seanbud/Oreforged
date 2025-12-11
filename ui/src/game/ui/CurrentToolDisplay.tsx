import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import { ToolTier, TOOL_DEFINITIONS } from '../data/GameDefinitions';
import { ToolIcon } from './ToolIcon';

interface CurrentToolDisplayProps {
    currentTool: ToolTier;
    toolHealth: number;
}

export const CurrentToolDisplay: React.FC<CurrentToolDisplayProps> = ({ currentTool, toolHealth }) => {
    // Stage 0: Don't show for Hand
    if (currentTool === ToolTier.HAND) return null;

    const def = TOOL_DEFINITIONS[currentTool];
    let name = def ? def.name.toUpperCase().replace(" PICKAXE", "_PICK") : "UNKNOWN";
    const isBroken = toolHealth <= 0;

    // Pinkish hue for broken
    const textColor = isBroken ? '#F48FB1' : Colors.White;
    // Health bar color
    const barColor = isBroken ? '#D32F2F' : (toolHealth < 30 ? '#FBC02D' : Colors.Green.Base);

    if (isBroken) name += " (BROKEN)";

    return (
        <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: Styles.Font.Family,
            imageRendering: Styles.Font.Pixelated,
            pointerEvents: 'none',
            backgroundColor: 'rgba(20, 20, 20, 0.8)',
            border: `1px solid ${isBroken ? '#EF5350' : Colors.Grey.Light}`,
            padding: '4px 12px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            }}>
                <ToolIcon tier={currentTool} size={16} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{
                    fontSize: '12px',
                    color: textColor,
                    letterSpacing: '1px',
                }}>
                    {name}
                </span>

                {/* Health Bar */}
                <div style={{
                    width: '100%',
                    height: '2px',
                    backgroundColor: '#333',
                    marginTop: '0px',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.max(0, toolHealth)}%`,
                        backgroundColor: barColor,
                        transition: 'width 0.2s',
                    }} />
                </div>
            </div>
        </div>
    );
};
