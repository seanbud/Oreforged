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
                    boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
                }}>
                    {tooltip}
                </div>
            )}
        </div>
    );
};

interface StatsStripProps {
    worldSize: number;
    worldHeight: number;
    oreDensity: number;
    treeDensity: number;
    lowResources?: boolean;
}

export const StatsStrip: React.FC<StatsStripProps> = ({
    worldSize,
    worldHeight,
    oreDensity,
    treeDensity,
    lowResources
}) => {
    // Fuzzy Logic for World Size
    let sizeLabel = "Unknown";
    if (worldSize <= 9) sizeLabel = "Tiny";
    else if (worldSize <= 11) sizeLabel = "Small";
    else if (worldSize <= 13) sizeLabel = "Medium";
    else if (worldSize <= 15) sizeLabel = "Large";
    else sizeLabel = "Massive";

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
                label={`World: ${sizeLabel} (H:${worldHeight})`}
                tooltip={`Size: ${worldSize}x${worldSize} chunks\nMax Height: ${worldHeight} blocks\nOre Mult: x${oreDensity.toFixed(1)}\nTree Mult: x${treeDensity.toFixed(1)}`}
                icon={<div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', border: '1px solid #000' }}></div>}
            />

            {/* Warning Label - Conditional */}
            {lowResources && (
                <FramedLabel
                    label="Low Wood!"
                    color="#FF5555"
                    tooltip="You are running low on wood.\nConsider regenerating the world\nto get more trees."
                    icon={<div style={{ fontSize: '12px' }}>⚠️</div>}
                />
            )}
        </div>
    );
};
