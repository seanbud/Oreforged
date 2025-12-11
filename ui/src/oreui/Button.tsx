import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'green' | 'red' | 'grey';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'green', style, ...props }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    // Determine background color based on state and variant
    let bg = Colors.Green.Base;
    let hover = Colors.Green.Hover;
    let pressed = Colors.Green.Pressed;
    let borderLight = Colors.Green.BorderLight;
    let borderDark = Colors.Green.BorderDark;

    if (variant === 'grey') {
        bg = Colors.Grey.Light; // #48494a
        hover = '#5a5b5c';
        pressed = Colors.Grey.Dark; // #1e1e1f
        borderLight = Colors.Grey.Text; // lighter grey
        borderDark = Colors.Black;
    } else if (variant === 'red') {
        bg = Colors.Red.Base;
        hover = Colors.Red.Hover;
        pressed = Colors.Red.Pressed;
        borderLight = Colors.Red.BorderLight;
        borderDark = Colors.Red.BorderDark;
    }

    const currentBg = isPressed ? pressed : (isHovered ? hover : bg);

    return (
        <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
                backgroundColor: currentBg,
                border: 'none',
                padding: '12px 20px', // Match original padding
                color: Colors.White,
                fontFamily: Styles.Font.Family,
                fontSize: '14px', // Match original font size
                cursor: 'pointer',
                position: 'relative',
                // Use tokenized bevel shadow but adapted for variant
                boxShadow: Styles.Shadows.Bevel(borderLight, borderDark),
                imageRendering: Styles.Font.Pixelated,
                outline: 'none',
                width: '100%',
                pointerEvents: 'auto',
                ...style
            }}
            {...props}
        >
            <span style={{
                position: 'relative',
                top: isPressed ? '2px' : '0px',
                // Use tokenized text shadow
                textShadow: Styles.Shadows.Text(borderDark)
            }}>
                {children}
            </span>
        </button>
    );
};

export default Button;
