import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'green' | 'red'; // Keeping variant for future use, though only green is tokenized for now
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'green', style, ...props }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    // Determine background color based on state
    const bg = isPressed
        ? Colors.Green.Pressed
        : (isHovered ? Colors.Green.Hover : Colors.Green.Base);

    return (
        <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
                backgroundColor: bg,
                border: 'none',
                padding: '8px 16px',
                color: Colors.White,
                fontFamily: Styles.Font.Family,
                fontSize: '1rem',
                cursor: 'pointer',
                position: 'relative',
                // Use tokenized bevel shadow
                boxShadow: Styles.Shadows.Bevel(Colors.Green.BorderLight, Colors.Green.BorderDark),
                imageRendering: Styles.Font.Pixelated,
                outline: 'none',
                width: '100%',
                ...style
            }}
            {...props}
        >
            <span style={{
                position: 'relative',
                top: isPressed ? '2px' : '0px',
                // Use tokenized text shadow
                textShadow: Styles.Shadows.Text(Colors.Green.BorderDark)
            }}>
                {children}
            </span>
        </button>
    );
};

export default Button;
