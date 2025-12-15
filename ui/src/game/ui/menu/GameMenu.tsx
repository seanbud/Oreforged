import React from 'react';
import { Colors } from '../../../design/tokens';
import Panel from '../../../oreui/Panel';
import Button from '../../../oreui/Button';
import Toggle from '../../../oreui/Toggle';
import { Input } from '../../../oreui/Input';
import { Slider } from '../../../oreui/Slider';
import { FloatingTextContainer, useFloatingTexts } from '../../../oreui/FloatingText';
import { useFacetState } from '../../../engine/hooks';
import { bridge } from '../../../engine/bridge';

interface GameMenuProps {
    isOpen: boolean;
    onClose: () => void;
    autoRotate: boolean;
    onToggleAutoRotate: (v: boolean) => void;
    rotationSpeed: number;
    onChangeRotationSpeed: (v: number) => void;
}

import { Facets } from '../../data/Facets';

// Local Facet definitions removed in favor of singleton Facets

export const GameMenu: React.FC<GameMenuProps> = ({
    isOpen, onClose,
    autoRotate, onToggleAutoRotate,
    rotationSpeed, onChangeRotationSpeed
}) => {
    // Local UI state for form inputs
    const [seedInput, setSeedInput] = React.useState("12345");
    const [autoRand, setAutoRand] = React.useState(true);

    // Sync seed from C++
    const seedVal = useFacetState(Facets.WorldSeed);
    // Hoist conditional hook to top level
    const isUnlocked = Boolean(useFacetState(Facets.UnlockCrafting));

    React.useEffect(() => setSeedInput(seedVal), [seedVal]);

    if (!isOpen) return null;

    return (
        <div style={{
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(2px)', pointerEvents: 'auto',
            zIndex: 10
        }}>
            <Panel style={{
                // ...
            }}>
                {/* ... */}
                {/* World Gen */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px', fontWeight: 'bold' }}>World Seed</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                value={seedInput}
                                onChange={(e: any) => {
                                    setSeedInput(e.target.value);
                                    setAutoRand(false);
                                }}
                                onBlur={(e: any) => {
                                    // Trigger instant cheat when user finishes editing (clicks out)
                                    bridge.call('instantCheatCheck', [e.target.value]);
                                }}
                                type="number"
                                style={{ width: '100%' }}
                                containerStyle={{ marginBottom: 0 }}
                            />
                        </div>
                        <Button
                            onClick={() => setSeedInput(Math.floor(Math.random() * 90000 + 10000).toString())}
                            style={{
                                width: '40px',
                                height: '40px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px'
                            }}
                        >↺</Button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Toggle label="Auto-Random Seed" checked={autoRand} onChange={setAutoRand} />
                        <Toggle label="Auto-Rotate Camera" checked={autoRotate} onChange={onToggleAutoRotate} />

                        {autoRotate && (
                            <Slider
                                label="Speed"
                                min={-1.0}
                                max={1.0}
                                step={0.1}
                                value={rotationSpeed}
                                onChange={(e) => onChangeRotationSpeed(parseFloat(e.target.value))}
                            />
                        )}
                    </div>

                    <RegenButton seed={seedInput} autoRand={autoRand} />
                </div>

                {/* Visual / Gameplay Toggles - REMOVED per user request (Internal only) */}

                {isUnlocked && (
                    <UpgradeSection />
                )}

                <div style={{ borderTop: `2px solid ${Colors.Grey.Dark}`, margin: '20px 0' }}></div>

                {/* Footer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Button onClick={onClose} variant="grey">Resume Game</Button>
                    <Button onClick={() => bridge.quitApplication()} variant="red">Quit Application</Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                    <a
                        onClick={() => bridge.call('resetProgression', [])}
                        style={{
                            fontSize: '11px',
                            color: '#cc5544',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontFamily: '"Minecraft", "Press Start 2P", monospace',
                            opacity: 0.7,
                            transition: 'opacity 0.2s',
                            userSelect: 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    >
                        Reset Game (Full Wipe)
                    </a>
                </div>
            </Panel >
        </div >
    );
};

const RegenButton = ({ seed, autoRand }: { seed: string, autoRand: boolean }) => {
    const generating = useFacetState(Facets.IsGenerating);
    const stats = useFacetState(Facets.PlayerStats);
    const isUnlocked = Boolean(useFacetState(Facets.UnlockCrafting));
    const cost = stats.regenCost !== undefined ? stats.regenCost : 0;
    const canAfford = stats.totalMined >= cost;

    // Track cost changes for floating text
    const [prevCost, setPrevCost] = React.useState(cost);
    const [shake, setShake] = React.useState(false);
    const { texts, addText } = useFloatingTexts(1000);

    React.useEffect(() => {
        if (cost < prevCost && prevCost > 0) {
            const reduction = prevCost - cost;
            addText(`cost -${reduction}`);
            setShake(true);
            setTimeout(() => setShake(false), 200);
        }
        setPrevCost(cost);
    }, [cost, prevCost, addText]);

    // Determine cost display text
    let costText = "Free";
    if (isUnlocked) {
        costText = cost > 0 ? `Cost: ${cost} Blocks` : `0 Blocks`;
    } else if (stats.totalMined > 0 || stats.currentTool !== 0) {
        costText = cost > 0 ? `Cost: ${cost} Blocks` : `Free`;
    }

    return (
        <div style={{ position: 'relative' }}>
            <FloatingTextContainer texts={texts} color="#DDDDDD" fontSize="12px" />

            <Button
                onClick={() => bridge.call('regenerateWorld', [parseInt(seed), autoRand])}
                disabled={generating || !canAfford}
                variant="green"
                style={{
                    marginTop: '10px',
                    width: '100%',
                    opacity: (generating || !canAfford) ? 0.7 : 1,
                    animation: shake ? 'subtleShake 0.2s ease-in-out' : 'none'
                }}
            >
                {generating ? "Regenerating..." : `Regenerate World (${costText})`}
            </Button>

            <style>{`
                @keyframes subtleShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    75% { transform: translateX(2px); }
                }
            `}</style>
        </div>
    );
};

const UpgradeSection = () => {
    const prog = useFacetState(Facets.Progression);
    const stats = useFacetState(Facets.PlayerStats);

    return (
        <div style={{
            backgroundColor: '#2b2b2b', border: '2px solid #000', padding: '10px',
            marginBottom: '20px', position: 'relative'
        }}>
            <div style={{
                fontSize: '14px', fontWeight: 'bold', color: '#FFD700',
                textAlign: 'center', marginBottom: '12px',
                textShadow: '2px 2px 0px #000'
            }}>
                Available Blocks: <span style={{ color: '#fff' }}>{stats.totalMined}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <UpgradeButton label="Trees" type="tree" level={prog.tree} currentMined={stats.totalMined} />
                <UpgradeButton label="Ore" type="ore" level={prog.ore} currentMined={stats.totalMined} />
                <UpgradeButton label="Size" type="energy" level={prog.energy} currentMined={stats.totalMined} />
                <UpgradeButton label="DMG" type="damage" level={prog.damage} currentMined={stats.totalMined} />
            </div>
        </div>
    );
};

const UpgradeButton = ({ label, type, level, currentMined }: { label: string, type: string, level: number, currentMined: number }) => {
    // Calculate cost locally for display (duplicated logic, acceptable for UI hint)
    // C++ handles authoritative check
    let cost = 0;
    if (type === 'tree') cost = 2 * Math.pow(2, level);
    else if (type === 'ore') cost = 4 * Math.pow(2, level);
    else if (type === 'energy') cost = 8 * Math.pow(2, level);
    else if (type === 'damage') cost = Math.floor(100 * Math.pow(1.5, level));

    const canAfford = currentMined >= cost;

    return (
        <div
            onClick={() => canAfford && bridge.call('upgrade', [type])}
            style={{
                flex: 1, padding: '8px', backgroundColor: canAfford ? '#4CAF50' : '#333',
                color: canAfford ? '#fff' : '#888', border: '2px solid #000',
                cursor: canAfford ? 'pointer' : 'default', fontSize: '12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
            }}
        >
            <div style={{ fontWeight: 'bold' }}>+{level + 1} {label}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>Cost: {cost}</div>
        </div>
    );
};
