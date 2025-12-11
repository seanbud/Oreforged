export const Colors = {
    Green: {
        Base: '#3c8527',
        Hover: '#4ca032',
        Pressed: '#2a641c',
        BorderLight: '#5bb344',
        BorderDark: '#1e4d13',
    },
    Red: {
        Base: '#c0392b',
        Hover: '#e74c3c',
        Pressed: '#a93226',
        BorderLight: '#e74c3c',
        BorderDark: '#922b21',
    },
    Grey: {
        Base: '#313233',
        Dark: '#1e1e1f', // Borders
        Light: '#48494a', // Backgrounds
        Text: '#e0e0e0',
        TextDim: '#aaaaaa',
    },
    White: '#ffffff',
    Black: '#000000',
};

export const Styles = {
    Border: {
        Width: '2px',
        Style: 'solid',
    },
    Shadows: {
        Bevel: (light: string, dark: string) => `inset 2px 2px 0px ${light}, inset -2px -2px 0px ${dark}`,
        BevelInverted: (light: string, dark: string) => `inset -2px -2px 0px ${light}, inset 2px 2px 0px ${dark}`,
        Inset: `inset 2px 2px 0px rgba(0,0,0,0.5), inset -2px -2px 0px rgba(255,255,255,0.2)`,
        Text: (color: string) => `2px 2px 0px ${color}`,
    },
    Font: {
        Family: 'Mojangles, sans-serif',
        Pixelated: 'pixelated' as const,
    }
};
