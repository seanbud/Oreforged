import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import { BlockType } from '../data/GameDefinitions';

interface ResourceManifestProps {
    inventory: Record<number, number>;
    totalMined: number;
}

export const ResourceManifest: React.FC<ResourceManifestProps> = ({ inventory, totalMined }) => {
    // Filter for collected items
    const items = Object.entries(inventory)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => Number(a[0]) - Number(b[0]));

    const getLabel = (type: BlockType) => {
        switch (type) {
            case BlockType.Wood: return "MAT_WOOD";
            case BlockType.Stone: return "MAT_STONE";
            case BlockType.Dirt: return "MAT_DIRT";
            case BlockType.Grass: return "MAT_GRASS";
            case BlockType.Sand: return "MAT_SAND";
            case BlockType.Coal: return "CRE_COAL";
            case BlockType.Bronze: return "ORE_BRONZE";
            case BlockType.Iron: return "ORE_IRON";
            case BlockType.Gold: return "ORE_GOLD";
            case BlockType.Diamond: return "X_DIAMOND";
            case BlockType.Leaves: return "BIO_LEAF";
            default: return "UNKNOWN";
        }
    };

    const getColor = (t: BlockType) => {
        switch (t) {
            case BlockType.Grass: return '#4a8522';
            case BlockType.Dirt: return '#5d4037';
            case BlockType.Stone: return '#6d6d6d';
            case BlockType.Wood: return '#6d4c1e';
            case BlockType.Leaves: return '#2d5a1e';
            case BlockType.Sand: return '#d4c483';
            case BlockType.Coal: return '#2a2a2a';
            case BlockType.Bronze: return '#CD7F32';
            case BlockType.Iron: return '#9c8c74';
            case BlockType.Diamond: return '#4AEDD9';
            case BlockType.Gold: return '#FFD700';
            default: return '#ff00ff';
        }
    };

    // const totalBlocks = Object.values(inventory).reduce((acc, val) => acc + val, 0); // This line is removed as totalMined is now a prop

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            fontFamily: Styles.Font.Family,
            imageRendering: Styles.Font.Pixelated,
            pointerEvents: 'none',
            alignItems: 'flex-end',
        }}>
            {/* Currency Counter (Total Usable Blocks) */}
            <div style={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: '8px 12px',
                marginBottom: '8px',
                border: `2px solid #FFD700`,
                color: '#FFD700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
                opacity: 1,
                transition: 'all 0.3s ease'
            }}>
                <div style={{ fontSize: '10px' }}>AVAILABLE</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{totalMined} BLOCKS</div>
            </div>

            {/* Existing List */}
            {items.map(([type, count]) => {
                const blockType = Number(type) as BlockType;
                const color = getColor(blockType);
                // Removed red background logic as per request

                return (
                    <div key={type} style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(20, 20, 20, 0.8)',
                        padding: '4px 8px',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        borderRight: `4px solid ${color}`,
                        transition: 'all 0.3s ease'
                    }}>
                        {/* Icon Block */}
                        <div style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: color,
                            boxShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                        }} />

                        <span style={{
                            fontSize: '10px',
                            color: Colors.Grey.TextDim,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                        }}>
                            {getLabel(blockType)}
                        </span>

                        <span style={{
                            fontSize: '12px',
                            color: Colors.White,
                            fontWeight: 'bold',
                            minWidth: '24px',
                            textAlign: 'right',
                        }}>
                            {count.toString()}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
