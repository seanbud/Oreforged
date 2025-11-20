import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const Input: React.FC<InputProps> = ({ label, style, ...props }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: Styles.Font.Family, color: Colors.Grey.Text }}>
            {label && <label>{label}</label>}
            <input
                style={{
                    backgroundColor: Colors.Grey.Dark,
                    border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Base}`, // Outer border
                    padding: '8px',
                    color: Colors.White,
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    outline: 'none',
                    boxShadow: Styles.Shadows.BevelInverted(Colors.Grey.Base, Colors.Grey.Base), // Simple inset look
                    ...style
                }}
                {...props}
            />
        </div>
    );
};

export default Input;
