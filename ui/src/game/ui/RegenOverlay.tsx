import React from 'react';
import { Colors, Styles } from '../../design/tokens';
import Panel from '../../oreui/Panel';
import { ProgressBar } from '../../oreui/ProgressBar';
import { remoteFacet, useFacetState } from '../../engine/hooks';

const isGenerating = remoteFacet('is_generating', false);

export const RegenOverlay: React.FC = () => {
    const generating = useFacetState(isGenerating);
    const [progress, setProgress] = React.useState(0);

    // Visual simulation of progress when generating starts
    React.useEffect(() => {
        if (generating) {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 90) return 90;
                    return p + 5;
                });
            }, 100);
            return () => clearInterval(interval);
        } else {
            setProgress(100);
        }
    }, [generating]);

    if (!generating) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: Colors.Black,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, pointerEvents: 'auto'
        }}>
            <Panel style={{ padding: '30px', textAlign: 'center' }}>
                <h2 style={{
                    fontFamily: Styles.Font.Family, fontSize: '18px', marginBottom: '20px',
                    textShadow: Styles.Shadows.Text(Colors.Black), color: Colors.White
                }}>Generating World...</h2>
                <div style={{ width: '300px' }}>
                    <ProgressBar progress={progress} />
                </div>
            </Panel>
        </div>
    );
};
