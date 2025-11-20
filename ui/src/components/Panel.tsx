import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ children, style, ...props }) => {
    return (
        <div
            style={{
                backgroundColor: Colors.Grey.Base,
                border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Dark}`,
                padding: '20px',
                color: Colors.Grey.Text,
                fontFamily: Styles.Font.Family,
                imageRendering: Styles.Font.Pixelated,
                boxShadow: Styles.Shadows.Bevel(Colors.Grey.Light, Colors.Grey.Dark),
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Panel;
