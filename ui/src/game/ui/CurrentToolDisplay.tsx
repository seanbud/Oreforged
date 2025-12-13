import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import { ToolTier, TOOL_DEFINITIONS } from '../data/GameDefinitions';
import { ToolIcon } from './ToolIcon';

interface CurrentToolDisplayProps {
    currentTool: ToolTier;
    toolHealth: number;
    damageMultiplier?: number;
}

export const CurrentToolDisplay: React.FC<CurrentToolDisplayProps> = ({ currentTool, toolHealth, damageMultiplier = 1.0 }) => {
    // Stage 0: Don't show for Hand
    if (currentTool === ToolTier.HAND) return null;

    const def = TOOL_DEFINITIONS[currentTool];
    let name = def ? def.name.toUpperCase().replace(" PICKAXE", "_PICK") : "UNKNOWN";
    const baseDamage = def ? def.damage : 0;
    const finalDamage = baseDamage * damageMultiplier;

    const isBroken = toolHealth <= 0;

    // Display damage: show as integer if whole, otherwise up to 3 decimal places
    const damageDisplay = Number.isInteger(finalDamage)
        ? finalDamage.toString()
        : parseFloat(finalDamage.toFixed(3)).toString();

    // Pinkish hue for broken
    const textColor = isBroken ? '#F48FB1' : Colors.White;
    // Health bar color
    const barColor = isBroken ? '#D32F2F' : (toolHealth < 30 ? '#FBC02D' : Colors.Green.Base);

    const [isHovered, setIsHovered] = React.useState(false);

    if (isBroken) name += " (BROKEN)";

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: Styles.Font.Family,
                imageRendering: Styles.Font.Pixelated,
                pointerEvents: 'auto', // Auto to capture hover
                backgroundColor: 'rgba(20, 20, 20, 0.8)',
                border: `1px solid ${isBroken ? '#EF5350' : Colors.Grey.Light}`,
                padding: '4px 12px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                cursor: 'help'
            }}
        >
            {/* Tooltip */}
            {isHovered && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translate(-50%, -8px)',
                    backgroundColor: '#111',
                    border: '1px solid #fff',
                    padding: '8px',
                    width: 'max-content',
                    color: '#fff',
                    zIndex: 100,
                    fontSize: '10px',
                    textAlign: 'center',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: textColor }}>{name}</div>
                    <div>Durability: {Math.floor(toolHealth)}%</div>
                    <div>{isBroken ? "Status: BROKEN" : `DMG: ${damageDisplay}`}</div>
                </div>
            )}

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
                    overflow: 'hidden' // Ensure no overflow
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, toolHealth))}%`, // Clamp logic
                        backgroundColor: barColor,
                        transition: 'width 0.2s',
                    }} />
                </div>
            </div>
        </div>
    );
};
