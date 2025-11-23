import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => {
    const width = 40;
    const height = 20;
    const thumbSize = 12;
    const padding = 4;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: Styles.Font.Family, color: Colors.Grey.Text }}>
            <div
                onClick={() => onChange(!checked)}
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: Colors.Grey.Dark,
                    position: 'relative',
                    cursor: 'pointer',
                    border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Base}`,
                    imageRendering: Styles.Font.Pixelated,
                }}
            >
                <div
                    style={{
                        width: `${thumbSize}px`,
                        height: `${thumbSize}px`,
                        backgroundColor: checked ? Colors.Green.Base : Colors.Grey.TextDim,
                        position: 'absolute',
                        top: `${(height - thumbSize) / 2 - parseInt(Styles.Border.Width.replace('px', ''), 10)}px`, // Center vertically accounting for border
                        left: checked
                            ? `${width - thumbSize - padding}px`
                            : `${padding}px`,
                        transition: 'left 0.1s ease-in-out, background-color 0.1s',
                        boxShadow: Styles.Shadows.Bevel(
                            checked ? Colors.Green.Hover : Colors.Grey.Text,
                            checked ? Colors.Green.Pressed : Colors.Grey.Base
                        )
                    }}
                />
            </div>
            {label && <span>{label}</span>}
        </div>
    );
};

export default Toggle;
