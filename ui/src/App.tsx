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
import { BlockType, ToolTier, CraftingRecipe, ModLevels, Modifier } from './game/data/GameDefinitions';

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [modLevels, setModLevels] = useState<ModLevels>({ energy: 0, ore: 0, tree: 0, damage: 0 });
    const [runModifiers, setRunModifiers] = useState<Modifier[]>([]);

    // STARTING SEED - Randomize on load
    const [seed, setSeed] = useState<string>(Math.floor(Math.random() * 90000 + 10000).toString());
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [progress, setProgress] = useState(0);

    // Camera State
    const [isRotating, setIsRotating] = useState(false);
    const [rotationSpeed, setRotationSpeed] = useState(0);

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

    // Progression Logic - New cost structure
    const getModCost = (type: keyof typeof modLevels, level: number) => {
        if (type === 'damage') {
            // Damage starts expensive: 100, 150, 225, 337...
            return Math.floor(100 * Math.pow(1.5, level));
        } else {
            // Others start cheap and double: 2, 4, 8, 16...
            return 2 * Math.pow(2, level);
        }
    };

    const buyMod = (type: keyof typeof modLevels) => {
        const cost = getModCost(type, modLevels[type]);
        if (totalMined >= cost) {
            setTotalMined(prev => prev - cost);
            setModLevels(prev => ({
                ...prev,
                [type]: prev[type] + 1
            }));
        }
    };

    const handleRegenerate = async () => {
        if (isGenerating) return;

        // Static regen cost
        const regenCost = 30;

        if (totalMined < regenCost) {
            console.log("Not enough blocks mined to regenerate!");
            return;
        }

        // Deduct cost
        setTotalMined(prev => prev - regenCost);

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

            // Calculate Next Gen Params
            // Start: Size 9, Height 32
            // Scale slowly: +2 size per level (reach size 33 at level 12)
            const nextSize = 9 + modLevels.energy * 2;
            const nextHeight = 32 + modLevels.energy * 2;
            const oreMult = 1.0 + modLevels.ore * 0.5;
            const treeMult = 1.0 + modLevels.tree * 0.5;
            const dmgMult = 1.0 + modLevels.damage * 0.5;

            console.log("Regenerating with mods:", { nextSize, nextHeight, oreMult, treeMult, dmgMult });

            await bridge.regenerateWorld(seedNum, nextSize, nextHeight, oreMult, treeMult);

            // Apply runtime modifiers
            setRunModifiers([{
                damage: dmgMult
            }]);

            // Reset Shop
            setModLevels({ energy: 0, ore: 0, tree: 0, damage: 0 });

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

    // Helper to render mod button
    const renderModButton = (label: string, type: keyof typeof modLevels, benefitDesc: string) => {
        const level = modLevels[type];
        const cost = getModCost(type, level);
        const canAfford = totalMined >= cost;

        const nextLevel = level + 1;

        return (
            <button
                onClick={() => buyMod(type)}
                disabled={!canAfford}
                title={benefitDesc}
                style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: canAfford ? '#4CAF50' : '#333',
                    color: canAfford ? '#fff' : '#888',
                    border: '2px solid #000',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontSize: '12px',
                    fontFamily: '"Minecraft", monospace',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: canAfford ? 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)' : 'none'
                }}
            >
                <div style={{ fontWeight: 'bold' }}>+{nextLevel} {label}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>Cost: {cost}</div>
            </button>
        );
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <VoxelRenderer
                autoRotate={isRotating}
                rotationSpeed={rotationSpeed}
                currentTool={currentTool}
                isToolBroken={toolHealth <= 0}
                onResourceCollected={handleResourceCollected}
                damageMultiplier={(runModifiers[0] as any)?.damage || 1.0}
            />

            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <Panel style={{ padding: '12px', minWidth: '200px', pointerEvents: 'auto' }}>
                    <div style={{ color: '#fff', fontSize: '14px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>OreForged Roguelite</div>
                        <div style={{ color: '#aaa', marginTop: '4px', fontSize: '12px' }}>
                            Press ESC for Store & Menu
                        </div>
                    </div>
                </Panel>

                <div style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0px 1px 2px rgba(0,0,0,0.8)',
                    fontFamily: '"Minecraft", sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    paddingLeft: '4px'
                }}>
                    <div>• Left Click: Mine</div>
                    <div>• Shift + Click: Pan Camera</div>
                    <div>• Right Click: Rotate</div>
                    <div>• Wheel: Zoom</div>
                </div>
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
                        minWidth: '450px',
                        color: 'white',
                        border: '4px solid #000',
                        boxShadow: 'inset -4px -4px 0px rgba(0,0,0,0.5), inset 4px 4px 0px rgba(255,255,255,0.3), 0 8px 16px rgba(0,0,0,0.5)',
                        imageRendering: 'pixelated',
                        maxHeight: '90vh',
                        overflowY: 'auto'
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
                        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
                            TIME PLAYED: {formatTime(timePlayed)} | BLOCKS: {totalMined}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                            <Input
                                label="World Seed"
                                value={seed}
                                onChange={handleSeedChange}
                                type="number"
                            />

                            <button
                                onClick={handleRegenerate}
                                disabled={isGenerating || totalMined < 30}
                                title={`Next Gen Specs:\nSize: ${9 + modLevels.energy * 2}\nHeight: ${32 + modLevels.energy * 2}\nOre: x${1.0 + modLevels.ore * 0.5}\nDMG: x${1.0 + modLevels.damage * 0.5}`}
                                style={{
                                    padding: '12px 20px',
                                    marginBottom: '10px',
                                    backgroundColor: (isGenerating || totalMined < 30) ? '#3B3B3B' : '#5B5B5B',
                                    color: (totalMined < 30) ? '#888' : '#fff',
                                    border: '2px solid #000',
                                    borderRadius: '0',
                                    cursor: (isGenerating || totalMined < 30) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                    fontSize: '14px',
                                    textShadow: '2px 2px 0px #000',
                                    boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)',
                                    imageRendering: 'pixelated',
                                    transition: 'all 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isGenerating && totalMined >= 30) e.currentTarget.style.backgroundColor = '#7B7B7B';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isGenerating && totalMined >= 30) e.currentTarget.style.backgroundColor = '#5B5B5B';
                                }}
                            >
                                Regenerate World (Cost: 30 Blocks)
                            </button>

                            {/* STORE SECTION - Now Below Regenerate */}
                            <div style={{
                                backgroundColor: '#2b2b2b',
                                border: '2px solid #000',
                                padding: '10px',
                            }}>
                                <div style={{
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    paddingBottom: '5px',
                                    marginBottom: '5px',
                                    color: '#FFD700',
                                    textAlign: 'center'
                                }}>
                                    Upgrades
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {renderModButton("Energy", "energy", "+Size & Height")}
                                    {renderModButton("Ore Find", "ore", "+Ore Density")}
                                    {renderModButton("Trees", "tree", "+Tree Density")}
                                    {renderModButton("DMG", "damage", "+Mining Damage")}
                                </div>
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
