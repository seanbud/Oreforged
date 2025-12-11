import { useState, useEffect } from 'react';
import { VoxelRenderer } from './game/VoxelRenderer';
import { bridge } from './engine/bridge';
import { Input } from './oreui/Input';
import { ProgressBar } from './oreui/ProgressBar';
import { Slider } from './oreui/Slider';
import Panel from './oreui/Panel';
import { ResourceManifest } from './game/ui/ResourceManifest';
import { ObjectiveTracker } from './game/ui/ObjectiveTracker';
import { CurrentToolDisplay } from './game/ui/CurrentToolDisplay';
import { BlockType, ToolTier, CraftingRecipe } from './game/data/GameDefinitions';

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [seed, setSeed] = useState('12345');
    const [isRotating, setIsRotating] = useState(false);
    const [rotationSpeed, setRotationSpeed] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Rendering settings
    const [showEdges, setShowEdges] = useState(true);

    // Gameplay state
    const [inventory, setInventory] = useState<Record<number, number>>({});
    const [totalMined, setTotalMined] = useState(0);
    const [currentTool, setCurrentTool] = useState<ToolTier>(ToolTier.HAND);
    const [toolHealth, setToolHealth] = useState(100);
    const [timePlayed, setTimePlayed] = useState(0);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => setTimePlayed(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        console.log('App mounted, checking uiReady');
        let attempts = 0;
        const maxAttempts = 50;

        const checkReady = () => {
            if (window.uiReady) {
                console.log('Calling uiReady');
                bridge.uiReady();
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`window.uiReady not found, retrying... (${attempts}/${maxAttempts})`);
                    setTimeout(checkReady, 100);
                } else {
                    console.error('Given up waiting for window.uiReady');
                }
            }
        };

        checkReady();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSeed(e.target.value);
    };

    const handleRegenerate = async () => {
        if (isGenerating) return;

        // Cost Check
        const cost = 100;
        if (totalMined < cost) {
            console.log("Not enough blocks mined to regenerate!");
            return;
        }

        // Deduct cost
        setTotalMined(prev => prev - cost);

        setIsGenerating(true);
        setProgress(0);

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 100);

        try {
            const seedNum = parseInt(seed) || 12345;
            await bridge.call('regenerateWorld', [seedNum]);
        } catch (e) {
            console.error("Regeneration failed", e);
        }

        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setIsGenerating(false), 500);
    };

    const handleQuit = async () => {
        try {
            await bridge.call('quitApplication', []);
        } catch (e) {
            console.error('Failed to quit:', e);
        }
    };

    const handleResourceCollected = (type: BlockType, count: number) => {
        setTotalMined(prev => prev + count);

        // Tool Durability Logic
        if (currentTool !== ToolTier.HAND) {
            setToolHealth(prev => Math.max(0, prev - 1));
        }

        setInventory(prev => ({
            ...prev,
            [type]: (prev[type] || 0) + count
        }));
    };

    // Smart Upgrade Logic (Now handled by ObjectiveTracker visually, but we verify here)
    const handleCraft = (recipe: CraftingRecipe) => {
        // Double check affordability
        const affordable = Array.from(recipe.cost.entries()).every(([block, required]) => (inventory[block] || 0) >= required);
        if (!affordable) return;

        // Deduct resources
        setInventory(prev => {
            const newInv = { ...prev };
            recipe.cost.forEach((amount, type) => {
                newInv[type] = (newInv[type] || 0) - amount;
            });
            return newInv;
        });

        // Upgrade tool: Reset health to 100
        setCurrentTool(recipe.result);
        setToolHealth(100);

        // Play sound? (Future)
        console.log(`Crafted ${recipe.displayName}!`);
    };

    const handleRepair = () => {
        // Determine cost (Simple for now: 3 of base material)
        let costType = BlockType.Wood;
        let costAmount = 3;

        if (currentTool === ToolTier.STONE) costType = BlockType.Stone;
        if (currentTool === ToolTier.IRON) costType = BlockType.Iron;
        if (currentTool === ToolTier.GOLD) costType = BlockType.Gold;
        if (currentTool === ToolTier.DIAMOND) costType = BlockType.Diamond;

        if ((inventory[costType] || 0) >= costAmount) {
            setInventory(prev => ({ ...prev, [costType]: prev[costType] - costAmount }));
            setToolHealth(100);
            console.log("Repaired Tool!");
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <VoxelRenderer
                autoRotate={isRotating}
                rotationSpeed={rotationSpeed}
                currentTool={currentTool}
                isToolBroken={toolHealth <= 0}
                onResourceCollected={handleResourceCollected}
            />

            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                pointerEvents: 'none'
            }}>
                <Panel style={{ padding: '12px', minWidth: '200px', pointerEvents: 'auto' }}>
                    <div style={{ color: '#fff', fontSize: '14px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>OreForged Pre-Alpha</div>
                        <div style={{ color: '#aaa', marginTop: '4px', fontSize: '12px' }}>
                            Press ESC for menu
                        </div>
                    </div>
                </Panel>
            </div>

            <ObjectiveTracker
                currentTool={currentTool}
                inventory={inventory}
                totalMined={totalMined}
                toolHealth={toolHealth}
                onCraft={handleCraft}
                onRepair={handleRepair}
            />

            <CurrentToolDisplay currentTool={currentTool} toolHealth={toolHealth} />

            <ResourceManifest inventory={inventory} />

            {isGenerating && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    color: 'white'
                }}>
                    <h2 style={{
                        fontFamily: '"Minecraft", "Press Start 2P", monospace',
                        textShadow: '3px 3px 0px #000'
                    }}>Regenerating World...</h2>
                    <div style={{ width: '300px' }}>
                        <ProgressBar progress={progress} />
                    </div>
                </div>
            )}

            {isMenuOpen && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#3C3C3C',
                        padding: '24px',
                        borderRadius: '0',
                        minWidth: '350px',
                        color: 'white',
                        border: '4px solid #000',
                        boxShadow: 'inset -4px -4px 0px rgba(0,0,0,0.5), inset 4px 4px 0px rgba(255,255,255,0.3), 0 8px 16px rgba(0,0,0,0.5)',
                        imageRendering: 'pixelated'
                    }}>
                        <h2 style={{
                            marginTop: 0,
                            textAlign: 'center',
                            borderBottom: '2px solid #000',
                            paddingBottom: '12px',
                            fontFamily: '"Minecraft", "Press Start 2P", monospace',
                            fontSize: '18px',
                            color: '#fff',
                            textShadow: '3px 3px 0px #000'
                        }}>
                            Game Menu
                        </h2>
                        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '10px', fontFamily: 'monospace' }}>
                            TIME PLAYED: {formatTime(timePlayed)}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <Input
                                label="World Seed"
                                value={seed}
                                onChange={handleSeedChange}
                                type="number"
                            />

                            <button
                                onClick={handleRegenerate}
                                disabled={isGenerating || totalMined < 100}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: (isGenerating || totalMined < 100) ? '#3B3B3B' : '#5B5B5B',
                                    color: (totalMined < 100) ? '#888' : '#fff',
                                    border: '2px solid #000',
                                    borderRadius: '0',
                                    cursor: (isGenerating || totalMined < 100) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                    fontSize: '14px',
                                    textShadow: '2px 2px 0px #000',
                                    boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)',
                                    imageRendering: 'pixelated',
                                    transition: 'all 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isGenerating && totalMined >= 100) e.currentTarget.style.backgroundColor = '#7B7B7B';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isGenerating && totalMined >= 100) e.currentTarget.style.backgroundColor = '#5B5B5B';
                                }}
                            >
                                Regenerate World (Cost: 100 Blocks)
                            </button>

                            <div style={{ marginTop: '16px', borderTop: '2px solid #000', paddingTop: '16px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    marginBottom: '12px',
                                    fontFamily: '"Minecraft", monospace',
                                    fontSize: '14px',
                                    color: '#fff',
                                    textShadow: '2px 2px 0px #000'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isRotating}
                                        onChange={(e) => setIsRotating(e.target.checked)}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    Auto-Rotate Camera
                                </label>

                                {isRotating && (
                                    <Slider
                                        label="Rotation Speed"
                                        min={-0.2}
                                        max={0.2}
                                        step={0.01}
                                        value={rotationSpeed}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRotationSpeed(parseFloat(e.target.value))}
                                    />
                                )}
                            </div>

                            <div style={{ marginTop: '16px', borderTop: '2px solid #000', paddingTop: '16px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    marginBottom: '12px',
                                    fontFamily: '"Minecraft", monospace',
                                    fontSize: '14px',
                                    color: '#fff',
                                    textShadow: '2px 2px 0px #000'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={showEdges}
                                        onChange={(e) => setShowEdges(e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                    Show Block Edges
                                </label>
                            </div>

                            <button
                                onClick={() => setIsMenuOpen(false)}
                                style={{
                                    marginTop: '20px',
                                    padding: '12px 20px',
                                    backgroundColor: '#5B5B5B',
                                    color: '#fff',
                                    border: '2px solid #000',
                                    borderRadius: '0',
                                    cursor: 'pointer',
                                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                    fontSize: '14px',
                                    textShadow: '2px 2px 0px #000',
                                    boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)',
                                    imageRendering: 'pixelated',
                                    transition: 'all 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#7B7B7B';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#5B5B5B';
                                }}
                            >
                                Resume Game
                            </button>

                            <button
                                onClick={handleQuit}
                                style={{
                                    marginTop: '10px',
                                    padding: '12px 20px',
                                    backgroundColor: '#8B0000',
                                    color: '#fff',
                                    border: '2px solid #000',
                                    borderRadius: '0',
                                    cursor: 'pointer',
                                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                    fontSize: '14px',
                                    textShadow: '2px 2px 0px #000',
                                    boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)',
                                    imageRendering: 'pixelated',
                                    transition: 'all 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#B00000';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#8B0000';
                                }}
                            >
                                Quit Application
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}

export default App;
