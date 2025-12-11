import React from 'react';
import { Colors, Styles } from '../design/tokens';
import Panel from './Panel';
import { ToolTier, TOOL_DEFINITIONS } from '../game/data/GameDefinitions';

interface ToolStatusProps {
    currentTool: ToolTier;
    toolHealth: number;
}

const ToolStatus: React.FC<ToolStatusProps> = ({ currentTool, toolHealth }) => {
    const toolDef = TOOL_DEFINITIONS[currentTool];
    const name = toolDef.name.toUpperCase();
    const shortName = name.split(' ')[0].substring(0, 3); // "WOO", "STO", "IRO"

    // Calculate health display "5/10" based on percentage
    // Assuming max health is 10 for display purposes to match screenshot style "5/10"
    // Or just map 100% to 10 units.
    const maxHealth = 10;
    const currentHealth = Math.ceil((toolHealth / 100) * maxHealth);

    return (
        <Panel style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(30, 30, 31, 0.95)',
            boxShadow: Styles.Shadows.Bevel(Colors.Grey.Base, Colors.Black),
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto'
        }}>
            {/* Simple Icon Representation */}
            <div style={{ fontSize: '20px' }}>
                ⛏️
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    fontWeight: 'bold',
                    color: Colors.White,
                    fontSize: '14px',
                    textShadow: '1px 1px 0px #000'
                }}>
                    {name}
                </div>
                <div style={{
                    fontSize: '12px',
                    color: Colors.Grey.TextDim,
                    fontFamily: 'monospace' // Or pixel font if available
                }}>
                    {shortName} {currentHealth}/{maxHealth}
                </div>
            </div>
        </Panel>
    );
};

export default ToolStatus;
