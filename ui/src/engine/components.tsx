import { Facet } from '@react-facet/core';
import React, { CSSProperties, useRef, useEffect } from 'react';

interface FastDivProps extends React.HTMLAttributes<HTMLDivElement> {
    style?: CSSProperties | Facet<CSSProperties> | any;
}

export const FastDiv: React.FC<FastDivProps> = ({ style, ...props }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        if (style && typeof (style as any).observe === 'function') {
            const facet = style as Facet<CSSProperties>;
            return facet.observe(newStyle => {
                if (ref.current) {
                    // Apply styles directly
                    Object.assign(ref.current.style, newStyle);
                }
            });
        } else if (style) {
            Object.assign(ref.current.style, style);
        }
    }, [style]);

    return <div ref={ ref } {...props } />;
};
