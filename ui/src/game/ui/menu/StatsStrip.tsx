import React, { useState } from 'react';
import { Colors, Styles } from '../../../design/tokens';

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
    lowResources?: boolean;
}

export const StatsStrip: React.FC<StatsStripProps> = ({
    energyLevel,
    oreLevel,
    treeLevel,
    lowResources
}) => {
    // Fuzzy Logic for World Size (based on energyLevel)
    // 1-3 = Tiny, 4-5 = Small, 6 = Medium, 7 = Large, 8+ = Very Large
    let sizeLabel = "Tiny";
    if (energyLevel >= 8) sizeLabel = "Very Large";
    else if (energyLevel >= 7) sizeLabel = "Large";
    else if (energyLevel >= 6) sizeLabel = "Medium";
    else if (energyLevel >= 4) sizeLabel = "Small";
    else sizeLabel = "Tiny";

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
                label={`${sizeLabel} Island`}
                tooltip={`TREES: (Lvl ${treeLevel})\nORE FIND: (Lvl ${oreLevel})\nSIZE: (Lvl ${energyLevel})`}
                icon={<div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', border: '1px solid #000' }}></div>}
            />

            {/* Warning Label - Conditional */}
            {lowResources && (
                <FramedLabel
                    label="Low Wood!"
                    color="#FF5555"
                    tooltip={`You are running low on wood.\nConsider regenerating the world\nto get more trees.`}
                    icon={<div style={{ fontSize: '12px' }}>⚠️</div>}
                />
            )}
        </div>
    );
};
