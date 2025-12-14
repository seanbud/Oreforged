import { Colors, Styles } from '../design/tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    containerStyle?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({ label, style, containerStyle, ...props }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', ...containerStyle }}>
            {label && (
                <label style={{
                    fontSize: '14px',
                    color: Colors.White,
                    fontFamily: Styles.Font.Family,
                    textShadow: Styles.Shadows.Text(Colors.Black)
                }}>
                    {label}
                </label>
            )}
            <input
                style={{
                    padding: '10px',
                    borderRadius: '0',
                    border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Black}`,
                    backgroundColor: Colors.Grey.Base,
                    color: Colors.White,
                    outline: 'none',
                    fontFamily: Styles.Font.Family,
                    fontSize: '14px',
                    boxShadow: Styles.Shadows.Inset,
                    imageRendering: Styles.Font.Pixelated,
                    pointerEvents: 'auto',
                    boxSizing: 'border-box',
                    ...style
                }}
                {...props}
            />
        </div>
    );
};
