import React from 'react';

interface SliderProps {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

export function Slider({ label, min, max, step, value, onChange, disabled }: SliderProps) {
    // Calculate the percentage for the gradient
    const percentage = ((value - min) / (max - min)) * 100;
    const zeroPercentage = ((0 - min) / (max - min)) * 100;

    // Determine gradient based on slider position
    let gradient;
    if (value < 0) {
        // Moving left (CCW) - red fill from current position to center
        gradient = `linear-gradient(to right, 
            #555 0%, 
            #555 ${percentage}%, 
            #e74c3c ${percentage}%, 
            #e74c3c ${zeroPercentage}%, 
            #555 ${zeroPercentage}%, 
            #555 100%)`;
    } else if (value > 0) {
        // Moving right (CW) - green fill from center to current position
        gradient = `linear-gradient(to right, 
            #555 0%, 
            #555 ${zeroPercentage}%, 
            #4caf50 ${zeroPercentage}%, 
            #4caf50 ${percentage}%, 
            #555 ${percentage}%, 
            #555 100%)`;
    } else {
        // At center - no fill
        gradient = '#555';
    }

    return (
        <div style={{ marginBottom: '12px', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                color: '#fff',
                textShadow: '2px 2px 0px #000'
            }}>
                {label}: {value.toFixed(1)}x
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                disabled={disabled}
                style={{
                    width: '100%',
                    height: '12px',
                    background: gradient,
                    outline: 'none',
                    borderRadius: '0',
                    imageRendering: 'pixelated',
                    border: '2px solid #000',
                    boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.5), inset -2px -2px 0px rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                }}
            />
            <style>{`
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #c6c6c6;
                    border: 2px solid #000;
                    border-radius: 0;
                    box-shadow: 2px 2px 0px rgba(0,0,0,0.5);
                    cursor: pointer;
                    image-rendering: pixelated;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                    background: #fff;
                }
                input[type="range"]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: #c6c6c6;
                    border: 2px solid #000;
                    border-radius: 0;
                    box-shadow: 2px 2px 0px rgba(0,0,0,0.5);
                    cursor: pointer;
                    image-rendering: pixelated;
                }
                input[type="range"]::-moz-range-thumb:hover {
                    background: #fff;
                }
            `}</style>
        </div>
    );
}
