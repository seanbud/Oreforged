import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, ...props }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {label && (
                <label style={{
                    fontSize: '14px',
                    color: '#fff',
                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                    textShadow: '2px 2px 0px #000'
                }}>
                    {label}
                </label>
            )}
            <input
                style={{
                    padding: '10px',
                    borderRadius: '0',
                    border: '2px solid #000',
                    backgroundColor: '#8B8B8B',
                    color: '#fff',
                    outline: 'none',
                    fontFamily: '"Minecraft", monospace',
                    fontSize: '14px',
                    boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.5), inset -2px -2px 0px rgba(255,255,255,0.3)',
                    imageRendering: 'pixelated',
                    ...style
                }}
                {...props}
            />
        </div>
    );
};
