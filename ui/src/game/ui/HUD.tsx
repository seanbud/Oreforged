import { BlockType, BLOCK_DEFINITIONS } from '../data/GameDefinitions';

interface HUDProps {
    inventory: Record<number, number>;
}

const RESOURCES_TO_SHOW = [
    BlockType.Wood,
    BlockType.Stone,
    BlockType.Coal,
    BlockType.Iron,
    BlockType.Gold,
    BlockType.Diamond
];

export function HUD({ inventory }: HUDProps) {
    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px',
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            pointerEvents: 'none', // Let clicks pass through
            userSelect: 'none',
        }}>
            {RESOURCES_TO_SHOW.map(type => {
                const count = inventory[type] || 0;
                const def = BLOCK_DEFINITIONS[type];

                return (
                    <div key={type} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '50px',
                        opacity: count > 0 ? 1 : 0.4, // Dim if 0
                        transition: 'opacity 0.2s',
                    }}>
                        {/* Icon placeholder - colored block */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#' + def.color.toString(16).padStart(6, '0'),
                            borderRadius: '6px',
                            boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            position: 'relative',
                        }}>
                            {/* Gloss effect */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '40%',
                                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px',
                            }} />
                        </div>

                        {/* Count */}
                        <span style={{
                            color: '#fff',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                        }}>
                            {count}
                        </span>

                        {/* Label (optional, might be too cluttered) */}
                        {/* <span style={{ fontSize: '10px', color: '#aaa' }}>{def.name}</span> */}
                    </div>
                );
            })}
        </div>
    );
}
