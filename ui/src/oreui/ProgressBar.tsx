import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
    return (
        <div style={{ width: '100%', marginBottom: '10px' }}>
            {label && <div style={{ fontSize: '12px', color: Colors.Grey.TextDim, marginBottom: '4px' }}>{label}</div>}
            <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: Colors.Grey.Dark,
                border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Text}`,
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    height: '100%',
                    backgroundColor: Colors.Green.Base,
                    transition: 'width 0.3s ease',
                    boxShadow: progress > 0 ? Styles.Shadows.Bevel(Colors.Green.BorderLight, Colors.Green.BorderDark) : 'none'
                }} />
            </div>
        </div>
    );
};
