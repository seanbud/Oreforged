import React, { useState, useRef, useEffect } from 'react';
import { Colors, Styles } from '../design/tokens';

interface SliderProps {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    label?: string;
}

const Slider: React.FC<SliderProps> = ({ value, min, max, onChange, label }) => {
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newValue = Math.round(min + percentage * (max - min));

        if (newValue !== value) {
            onChange(newValue);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div style={{ fontFamily: Styles.Font.Family, color: Colors.Grey.Text, width: '100%' }}>
            {label && <div style={{ marginBottom: '4px' }}>{label}: {value}</div>}
            <div
                ref={trackRef}
                onMouseDown={(e) => {
                    setIsDragging(true);
                    // Handle initial click jump
                    if (trackRef.current) {
                        const rect = trackRef.current.getBoundingClientRect();
                        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                        const p = x / rect.width;
                        onChange(Math.round(min + p * (max - min)));
                    }
                }}
                style={{
                    height: '20px',
                    backgroundColor: Colors.Grey.Dark,
                    border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Base}`,
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: Styles.Shadows.BevelInverted(Colors.Grey.Base, Colors.Grey.Base)
                }}
            >
                {/* Thumb */}
                <div
                    style={{
                        width: '10px',
                        height: '20px', // Full height
                        backgroundColor: Colors.Green.Base,
                        position: 'absolute',
                        left: `calc(${percentage}% - 5px)`,
                        top: '0',
                        border: 'none',
                        boxShadow: Styles.Shadows.Bevel(Colors.Green.Hover, Colors.Green.Pressed),
                        pointerEvents: 'none', // Let clicks pass through to track
                    }}
                />
            </div>
        </div>
    );
};

export default Slider;
