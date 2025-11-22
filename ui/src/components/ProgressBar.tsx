import React from 'react';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
    return (
        <div style={{ width: '100%', marginBottom: '10px' }}>
            {label && <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>{label}</div>}
            <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#333',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    height: '100%',
                    backgroundColor: '#4caf50',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
};
