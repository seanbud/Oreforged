import React from 'react';
import { Colors } from '../design/tokens';

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
                height: '8px',
                backgroundColor: Colors.Grey.Dark,
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    height: '100%',
                    backgroundColor: Colors.Green.Base,
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
};
