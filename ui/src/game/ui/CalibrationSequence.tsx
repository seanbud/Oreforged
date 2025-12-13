import React, { useState, useEffect } from 'react';
import { Colors, Styles } from '../../design/tokens';
import Panel from '../../oreui/Panel';
import { ProgressBar } from '../../oreui/ProgressBar';

interface CalibrationSequenceProps {
    currentProgress: number;
    targetProgress: number;
    onComplete: () => void;
}

type SequenceStage = 'calibrating' | 'upgrading' | 'complete' | 'online' | 'done';

export const CalibrationSequence: React.FC<CalibrationSequenceProps> = ({
    currentProgress,
    targetProgress,
    onComplete
}) => {
    const [stage, setStage] = useState<SequenceStage>('calibrating');
    const [upgradeProgress, setUpgradeProgress] = useState(0);

    const progress = (currentProgress / targetProgress) * 100;
    const isComplete = currentProgress >= targetProgress;

    useEffect(() => {
        if (!isComplete || stage !== 'calibrating') return;

        // Trigger celebration sequence
        setStage('upgrading');

        // Progress bar animation
        const progressInterval = setInterval(() => {
            setUpgradeProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 5;
            });
        }, 50);

        // Sequence timeline
        setTimeout(() => setStage('complete'), 1500);
        setTimeout(() => setStage('online'), 3000);
        setTimeout(() => {
            setStage('done');
            onComplete();
        }, 4500);

        return () => clearInterval(progressInterval);
    }, [isComplete, stage, onComplete]);

    if (stage === 'done') return null;

    return (
        <div style={{
            position: 'fixed',
            top: stage === 'calibrating' ? '20px' : '50%',
            left: '50%',
            transform: stage === 'calibrating' ? 'translateX(-50%)' : 'translate(-50%, -50%)',
            zIndex: 200,
            pointerEvents: 'none',
            transition: 'all 0.5s ease',
        }}>
            {stage === 'calibrating' && (
                <Panel style={{
                    padding: '16px 24px',
                    backgroundColor: '#2b2b2b',
                    border: '2px solid #FFD700',
                    animation: 'pulse 2s infinite',
                }}>
                    <div style={{
                        fontFamily: Styles.Font.Family,
                        color: '#FFD700',
                        fontSize: '14px',
                        textShadow: '2px 2px 0px #000',
                        textAlign: 'center',
                    }}>
                        CALIBRATING SENSORS... {currentProgress}/{targetProgress}
                    </div>
                    <div style={{ marginTop: '12px', width: '300px' }}>
                        <ProgressBar progress={progress} />
                    </div>
                </Panel>
            )}

            {stage === 'upgrading' && (
                <Panel style={{
                    padding: '24px 32px',
                    backgroundColor: '#2b2b2b',
                    border: '3px solid #4CAF50',
                    animation: 'slideDown 0.3s ease-out',
                }}>
                    <div style={{
                        fontFamily: Styles.Font.Family,
                        color: Colors.White,
                        fontSize: '18px',
                        textShadow: '2px 2px 0px #000',
                        textAlign: 'center',
                        marginBottom: '16px',
                    }}>
                        UPGRADING SYSTEMS...
                    </div>
                    <div style={{ width: '400px' }}>
                        <ProgressBar progress={upgradeProgress} />
                    </div>
                </Panel>
            )}

            {stage === 'complete' && (
                <Panel style={{
                    padding: '32px 48px',
                    backgroundColor: '#1a3a1a',
                    border: '4px solid #4CAF50',
                    boxShadow: '0 0 40px rgba(76, 175, 80, 0.6)',
                    animation: 'scaleIn 0.4s ease-out',
                }}>
                    <div style={{
                        fontFamily: Styles.Font.Family,
                        color: '#4CAF50',
                        fontSize: '24px',
                        textShadow: '3px 3px 0px #000, 0 0 20px rgba(76, 175, 80, 0.8)',
                        textAlign: 'center',
                        animation: 'glow 1s infinite alternate',
                    }}>
                        ✓ SENSORS CALIBRATION COMPLETE
                    </div>
                </Panel>
            )}

            {stage === 'online' && (
                <Panel style={{
                    padding: '24px 40px',
                    backgroundColor: '#1a2a3a',
                    border: '3px solid #40A4DF',
                    boxShadow: '0 0 30px rgba(64, 164, 223, 0.5)',
                    animation: 'fadeInScale 0.4s ease-out',
                }}>
                    <div style={{
                        fontFamily: Styles.Font.Family,
                        color: '#40A4DF',
                        fontSize: '20px',
                        textShadow: '2px 2px 0px #000, 0 0 15px rgba(64, 164, 223, 0.8)',
                        textAlign: 'center',
                    }}>
                        ENGINE ONLINE
                    </div>
                </Panel>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                @keyframes slideDown {
                    from { transform: translate(-50%, -120%); opacity: 0; }
                    to { transform: translate(-50%, -50%); opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes fadeInScale {
                    from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes glow {
                    from { text-shadow: 3px 3px 0px #000, 0 0 20px rgba(76, 175, 80, 0.8); }
                    to { text-shadow: 3px 3px 0px #000, 0 0 40px rgba(76, 175, 80, 1); }
                }
            `}</style>
        </div>
    );
};
