import React from 'react';
import { Colors, Styles } from '../design/tokens';
import Panel from './Panel';

const TitleCard: React.FC = () => {
    return (
        <div style={{ pointerEvents: 'none' }}>
            <Panel style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(30, 30, 31, 0.95)', // Darker than standard panel
                boxShadow: Styles.Shadows.Bevel(Colors.Grey.Base, Colors.Black),
                marginBottom: '10px',
                pointerEvents: 'auto'
            }}>
                <div style={{
                    fontWeight: 'bold',
                    color: Colors.White,
                    fontSize: '16px',
                    marginBottom: '4px',
                    textShadow: '2px 2px 0px #000'
                }}>
                    OreForged Pre-Alpha
                </div>
                <div style={{
                    fontSize: '12px',
                    color: Colors.Grey.TextDim
                }}>
                    Press ESC for Store & Menu
                </div>
            </Panel>

            <div style={{
                fontSize: '12px',
                color: Colors.White,
                textShadow: '1px 1px 0px #000',
                lineHeight: '1.5',
                paddingLeft: '5px'
            }}>
                <div>• Left Click - hit block</div>
                <div>• Left Click (hold) - pan camera</div>
                <div>• Right click (hold) - rotate camera</div>
                <div>• Mouse wheel - zoom</div>
            </div>
        </div>
    );
};

export default TitleCard;
