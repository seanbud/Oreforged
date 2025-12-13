import { useState, useEffect, useCallback } from 'react';
import { VoxelRenderer } from './game/VoxelRenderer';
import { bridge } from './engine/bridge';
import { Colors, Styles } from './design/tokens';
import { CraftingRecipe, BlockType, ToolTier, ModLevels, Modifier, TOOL_DEFINITIONS } from './game/data/GameDefinitions';
import { GameLayout, GameLayer, HUDLayer } from './layouts/GameLayout';
import Button from './oreui/Button';
import Panel from './oreui/Panel';
import { Input } from './oreui/Input';
import Toggle from './oreui/Toggle';
import TitleCard from './oreui/TitleCard';
import { ObjectiveTracker } from './game/ui/ObjectiveTracker';
import { CurrentToolDisplay } from './game/ui/CurrentToolDisplay';
import { ResourceManifest } from './game/ui/ResourceManifest';
import { Slider } from './oreui/Slider';
import { ProgressBar } from './oreui/ProgressBar';
import { StatsStrip } from './game/ui/menu/StatsStrip';
import VignetteOverlay from './game/ui/VignetteOverlay';
import { PositiveBurstOverlay } from './game/effects/PositiveBurstOverlay';

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Game State
    // Initial inventory with ALL BlockTypes to avoid lookup errors
    const [inventory, setInventory] = useState<Record<BlockType, number>>({
        [BlockType.Air]: 0,
        [BlockType.Grass]: 0,
        [BlockType.Dirt]: 0,
        [BlockType.Stone]: 0,
        [BlockType.Water]: 0,
        [BlockType.Wood]: 0,
        [BlockType.Leaves]: 0,
        [BlockType.Bedrock]: 0,
        [BlockType.Sand]: 0,
        [BlockType.Coal]: 0,
        [BlockType.Iron]: 0,
        [BlockType.Gold]: 0,
        [BlockType.Diamond]: 0,
        [BlockType.Bronze]: 0,
    });

    const [totalMined, setTotalMined] = useState(0);
    const [currentTool, setCurrentTool] = useState<ToolTier>(ToolTier.HAND);
    const [toolHealth, setToolHealth] = useState(100);
    const [isToolBroken, setIsToolBroken] = useState(false);
    const [toastMessage, setToastMessage] = useState<string>('');

    // Generation Config
    // Start with a random seed
    const [seed, setSeed] = useState(Math.floor(Math.random() * 90000 + 10000).toString());
    const [autoRotate, setAutoRotate] = useState(false);
    const [rotationSpeed, setRotationSpeed] = useState(0.00); // Default speed 0 to start? Main handles it in VoxelRenderer? Main defaults 0.05? NO main defaults 0.

    // Regeneration State
    const [isGenerating, setIsGenerating] = useState(true); // Start true to hide initial world state
    const [progress, setProgress] = useState(0);

    // Modifiers State (Roguelite Progression) - MATCHING MAIN
    const [modLevels, setModLevels] = useState<ModLevels>({
        energy: 0,
        ore: 0,
        tree: 0,
        damage: 0
    });
    const [runModifiers, setRunModifiers] = useState<Modifier[]>([]);

    // New: Track spending for Free Regen logic
    const [spentOnCurrentGen, setSpentOnCurrentGen] = useState(0);
    const [autoRandomizeSeed, setAutoRandomizeSeed] = useState(true);

    // World Stats for contextual warnings
    const [worldStats, setWorldStats] = useState<Record<BlockType, number>>({
        [BlockType.Wood]: 100,
        [BlockType.Stone]: 100,
        [BlockType.Coal]: 100,
        [BlockType.Bronze]: 100,
        [BlockType.Iron]: 100,
        [BlockType.Gold]: 100,
        [BlockType.Diamond]: 100,
    } as Record<BlockType, number>);
    const [shakeTrigger, setShakeTrigger] = useState(0);
    const [showCelebrationBurst, setShowCelebrationBurst] = useState(false);

    // Timer Logic - REMOVED (Unused in HUD)
    /*
    useEffect(() => {
        const timer = setInterval(() => setTimePlayed(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    */

    // Helper functions from Main
    const getModCost = (type: keyof typeof modLevels, level: number) => {
        let baseCost = 2;
        if (type === 'tree') baseCost = 2;
        if (type === 'ore') baseCost = 4;
        if (type === 'energy') baseCost = 8; // Size

        if (type === 'damage') {
            return Math.floor(100 * Math.pow(1.5, level));
        } else {
            return baseCost * Math.pow(2, level);
        }
    };

    const buyMod = (type: keyof typeof modLevels) => {
        const cost = getModCost(type, modLevels[type]);
        if (totalMined >= cost) {
            setTotalMined(prev => prev - cost);
            // Track spending for this generation
            setSpentOnCurrentGen(prev => prev + cost);
            setModLevels(prev => ({
                ...prev,
                [type]: prev[type] + 1
            }));
        }
    };

    const [hasCalibrated, setHasCalibrated] = useState(false);

    // Handle Resources
    const handleResourceCollected = useCallback((type: BlockType, count: number) => {
        setInventory(prev => ({
            ...prev,
            [type]: (prev[type] || 0) + count
        }));

        setTotalMined(prev => {
            const newTotal = prev + count;
            // Calibration now requires manual unlock, no automatic trigger
            return newTotal;
        });

        // Reduce tool health
        if (currentTool !== ToolTier.HAND && !isToolBroken) {
            setToolHealth(prev => {
                const damage = 2.0; // Break faster (was 1.0)
                const newHealth = Math.max(0, prev - damage);
                if (newHealth <= 0) {
                    setIsToolBroken(true);
                    setShakeTrigger(Date.now());
                }
                return newHealth;
            });
        }
    }, [currentTool, isToolBroken, hasCalibrated]);

    // Unlock Crafting - Manual activation
    const handleUnlockCrafting = () => {
        setHasCalibrated(true);
        // Trigger celebration
        setShowCelebrationBurst(true);
        setTimeout(() => setShowCelebrationBurst(false), 1500);
        setToastMessage('🔨 Crafting Unlocked');
        setTimeout(() => setToastMessage(''), 3000);
    };

    // Crafting & Repair Logic
    const handleCraft = (recipe: CraftingRecipe) => {
        const affordable = Array.from(recipe.cost.entries()).every(([block, required]) => (inventory[block] || 0) >= required);
        if (!affordable) return;

        setInventory(prev => {
            const newInv = { ...prev };
            recipe.cost.forEach((amount, type) => {
                newInv[type] = (newInv[type] || 0) - amount;
            });
            return newInv;
        });

        setCurrentTool(recipe.result);
        setToolHealth(TOOL_DEFINITIONS[recipe.result].maxHealth);
        setIsToolBroken(false);
        console.log(`Crafted ${recipe.displayName}!`);
    };

    const handleRepair = () => {
        let costType = BlockType.Wood;
        let costAmount = 3;

        if (currentTool === ToolTier.STONE_PICK) costType = BlockType.Stone;
        if (currentTool === ToolTier.BRONZE_PICK) costType = BlockType.Bronze;
        if (currentTool === ToolTier.IRON_PICK) costType = BlockType.Iron;
        if (currentTool === ToolTier.GOLD_PICK) costType = BlockType.Gold;
        if (currentTool === ToolTier.DIAMOND_PICK) costType = BlockType.Diamond;

        if ((inventory[costType] || 0) >= costAmount) {
            setInventory(prev => ({ ...prev, [costType]: prev[costType] - costAmount }));
            setToolHealth(TOOL_DEFINITIONS[currentTool].maxHealth);
            setIsToolBroken(false);
            console.log("Repaired Tool!");
        }
    };

    // Regeneration
    const handleRegenerate = () => {
        const cost = spentOnCurrentGen >= 30 ? 0 : 30;
        if (isGenerating || totalMined < cost) return;

        // Auto-Randomize Seed
        let currentSeedStr = seed;
        if (autoRandomizeSeed) {
            const newSeed = Math.floor(Math.random() * 90000) + 10000;
            currentSeedStr = newSeed.toString();
            setSeed(currentSeedStr);
        }

        setTotalMined(prev => prev - cost);
        setSpentOnCurrentGen(0); // Reset free gen progress
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

        // Main Logic for Params
        const seedNum = parseInt(currentSeedStr) || 12345;

        // Map Size Scaling (Levels 0-6: fixed at 16, 7-12: expand)
        let nextSize = 16; // Fixed for early levels
        if (modLevels.energy >= 7) {
            nextSize = 16 + (modLevels.energy - 6); // 17, 18, 19, 20, 21, 22
        }

        // Island Factor: Quadratic 0-6 within size 16 (slow growth at start)
        let islandFactor = 1.0;
        if (modLevels.energy <= 6) {
            // Use quadratic curve for slower initial growth
            const minFactor = 0.08;  // Very tiny starting island (perfect)
            const maxFactor = 0.55;  // Medium island at level 6 (reduced from 0.65)
            const t = modLevels.energy / 6;  // 0 to 1
            // Quadratic easing (slower at start, faster at end)
            islandFactor = minFactor + (t * t) * (maxFactor - minFactor);
        }
        // Levels 7+ use default factor 1.0 (island fills the expanding map)

        const nextHeight = 32 + modLevels.energy * 2;
        const oreMult = 1.0 + modLevels.ore * 0.5;
        const treeMult = 1.0 + modLevels.tree * 0.5;
        const dmgMult = 1.0 + modLevels.damage; // Flat +1 damage per level

        bridge.regenerateWorld(seedNum, nextSize, nextHeight, oreMult, treeMult, islandFactor);

        // Apply runtime modifiers
        setRunModifiers([{ damage: dmgMult }]);

        setTimeout(() => {
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                setIsGenerating(false);
                setIsMenuOpen(false); // Close menu after regeneration
            }, 500);
        }, 1500);
    };

    // Toggle Menu on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Initial Load
    useEffect(() => {
        bridge.uiReady();
        // Show generating overlay immediately
        setIsGenerating(true);
        setProgress(0);

        // Simulated progress animation
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90;
                return prev + 5;
            });
        }, 50);

        setTimeout(() => {
            const seedNum = parseInt(seed) || 12345;

            // Cheat code: seed 25565 gives you 25565 blocks
            if (seedNum === 25565) {
                setTotalMined(25565);
            }

            bridge.regenerateWorld(seedNum, 16, 32, 1.0, 1.0, 0.08); // Level 0: very tiny starting island

            // Finish loading sequence
            setTimeout(() => {
                clearInterval(interval);
                setProgress(100);
                // Short delay to show 100% before hiding
                setTimeout(() => setIsGenerating(false), 200);
            }, 600);
        }, 100); // Reduced delay before generation starts
    }, []);

    // Watch for cheat code when seed changes
    useEffect(() => {
        const seedNum = parseInt(seed) || 0;
        if (seedNum === 25565 && totalMined !== 25565) {
            setTotalMined(25565);
            // Show toast notification
            setToastMessage('🎮 Cheat Enabled! 25565 blocks granted.');
            setTimeout(() => setToastMessage(''), 3000);
        }
    }, [seed]);

    // Helper to render mod button (Exact Copy from Main style logic)
    const renderModButton = (label: string, type: keyof typeof modLevels, benefitDesc: string) => {
        const level = modLevels[type];
        const cost = getModCost(type, level);
        const canAfford = totalMined >= cost;
        const nextLevel = level + 1;

        return (
            <div
                onClick={() => canAfford && buyMod(type)}
                title={benefitDesc}
                style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: canAfford ? '#4CAF50' : '#333',
                    color: canAfford ? '#fff' : '#888',
                    border: '2px solid #000', // Match Main
                    cursor: canAfford ? 'pointer' : 'default', // Main uses 'not-allowed' but we can strict key inputs off
                    fontSize: '12px',
                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: canAfford ? 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)' : 'none'
                }}
            >
                <div style={{ fontWeight: 'bold' }}>+{nextLevel} {label}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>Cost: {cost}</div>
            </div>
        );
    };

    // Derived stats
    const damageMultiplier = (runModifiers[0] as any)?.damage || 1.0;

    return (
        <GameLayout>
            <GameLayer zIndex={0}>
                {/* Rainbow celebration burst */}
                <PositiveBurstOverlay isActive={showCelebrationBurst} />

                <VoxelRenderer
                    autoRotate={autoRotate}
                    rotationSpeed={rotationSpeed}
                    currentTool={currentTool}
                    isToolBroken={isToolBroken}
                    damageMultiplier={damageMultiplier}
                    onResourceCollected={handleResourceCollected}
                    onWorldUpdate={setWorldStats}
                    externalShakeTrigger={shakeTrigger}
                    inventory={inventory}
                />
            </GameLayer>

            <HUDLayer>
                {/* Vignette Overlay */}
                <VignetteOverlay
                    healthRatio={toolHealth / 100}
                    isBroken={isToolBroken}
                />

                {/* Top Left - Title & Controls */}
                {!isMenuOpen && (
                    <div style={{ position: 'absolute', top: '20px', left: '20px', pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <TitleCard />
                        <div style={{ paddingTop: '4px' }}>
                            {/* Stats Strip - Hidden until calibration complete */}
                            {hasCalibrated && (
                                <StatsStrip
                                    energyLevel={modLevels.energy}
                                    oreLevel={modLevels.ore}
                                    treeLevel={modLevels.tree}
                                    currentTool={currentTool}
                                    worldResourceCounts={worldStats}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Regeneration Overlay - Only in GameLayer, not on top of menu */}
                {isGenerating && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: Colors.Black,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                    }}>
                        <Panel style={{ padding: '30px', textAlign: 'center' }}>
                            <h2 style={{
                                fontFamily: Styles.Font.Family,
                                fontSize: '18px',
                                marginBottom: '20px',
                                textShadow: Styles.Shadows.Text(Colors.Black),
                                color: Colors.White
                            }}>Generating World...</h2>
                            <div style={{ width: '300px' }}>
                                <ProgressBar progress={progress} />
                            </div>
                        </Panel>
                    </div>
                )}

                {/* Top Right - Resources - Hidden until calibrated */}
                {!isMenuOpen && hasCalibrated && <ResourceManifest
                    inventory={inventory}
                    totalMined={totalMined}
                />}

                {/* Bottom Right - Tool Status / Objective Tracker */}
                {!isMenuOpen && (
                    <>
                        <div style={{ pointerEvents: 'auto' }}>
                            <ObjectiveTracker
                                currentTool={currentTool}
                                inventory={inventory}
                                totalMined={totalMined}
                                toolHealth={toolHealth}
                                hasCalibrated={hasCalibrated}
                                onCraft={handleCraft}
                                onRepair={handleRepair}
                                onUnlockCrafting={handleUnlockCrafting}
                            />
                        </div>
                        <CurrentToolDisplay
                            currentTool={currentTool}
                            toolHealth={toolHealth}
                            damageMultiplier={damageMultiplier}
                        />
                    </>
                )}



                {/* Pause Menu - Restored Compact Layout from Main */}
                {isMenuOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backdropFilter: 'blur(2px)',
                        pointerEvents: 'auto'
                    }}>
                        <Panel style={{
                            width: '450px',
                            maxHeight: '95vh',
                            overflowY: 'auto',
                            padding: '24px',
                            backgroundColor: '#3C3C3C',
                            border: '4px solid #000',
                            borderRadius: '0',
                            boxShadow: 'inset -4px -4px 0px rgba(0,0,0,0.5), inset 4px 4px 0px rgba(255,255,255,0.3), 0 8px 16px rgba(0,0,0,0.5)'
                        }}>
                            <h1 style={{
                                textAlign: 'center',
                                marginBottom: '12px',
                                color: Colors.White,
                                fontSize: '18px',
                                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                textShadow: '3px 3px 0px #000',
                                borderBottom: '2px solid #000',
                                paddingBottom: '12px',
                                marginTop: 0
                            }}>Game Menu</h1>

                            {/* World Gen Settings */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px', fontWeight: 'bold' }}>World Seed</div>

                                {/* Horizontal Seed Input Row */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <Input
                                        value={seed}
                                        onChange={(e) => setSeed(e.target.value)}
                                        type="number"
                                        style={{ flex: 1, height: '40px', fontSize: '16px' }}
                                    />
                                    <Button
                                        onClick={() => setSeed(Math.floor(Math.random() * 90000 + 10000).toString())}
                                        style={{ height: '40px', width: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}
                                        title="Randomize Seed"
                                    >
                                        ↻
                                    </Button>
                                </div>

                                {/* Toggle on its own line */}
                                <Toggle
                                    label="Auto-Random Seed"
                                    checked={autoRandomizeSeed}
                                    onChange={setAutoRandomizeSeed}
                                />

                                <Button
                                    onClick={handleRegenerate}
                                    disabled={isGenerating || (hasCalibrated && totalMined < Math.max(0, 30 - spentOnCurrentGen))}
                                    variant="grey"
                                    style={{
                                        marginTop: '10px',
                                        width: '100%',
                                        backgroundColor: (!hasCalibrated || Math.max(0, 30 - spentOnCurrentGen) === 0 || totalMined >= Math.max(0, 30 - spentOnCurrentGen)) ? '#4CAF50' : '#555',
                                        color: 'white',
                                        opacity: (isGenerating || (hasCalibrated && totalMined < Math.max(0, 30 - spentOnCurrentGen))) ? 0.7 : 1,
                                        border: '2px solid #000',
                                        textShadow: '1px 1px 0px #000',
                                        boxShadow: (!hasCalibrated || Math.max(0, 30 - spentOnCurrentGen) === 0 || totalMined >= Math.max(0, 30 - spentOnCurrentGen)) ? 'inset -2px -2px 0px rgba(0,0,0,0.5), inset 2px 2px 0px rgba(255,255,255,0.3)' : 'none'
                                    }}
                                >
                                    {isGenerating ? "Regenerating..." : hasCalibrated ? `Regenerate World (Cost: ${Math.max(0, 30 - spentOnCurrentGen)} Blocks)` : "Regenerate World (Free)"}
                                </Button>
                            </div>

                            {/* Upgrades Section - Only after crafting unlocked */}
                            {hasCalibrated && (
                                <div style={{
                                    backgroundColor: '#2b2b2b',
                                    border: '2px solid #000',
                                    padding: '10px',
                                    marginBottom: '20px',
                                    position: 'relative'
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
                                    {/* Currency Display in Menu */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        fontSize: '10px',
                                        color: (spentOnCurrentGen >= 30 || totalMined >= 30) ? '#FFD700' : '#555',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold'
                                    }}>
                                        BLOCKS: {totalMined}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {/* Reordered: Trees -> Ore -> Energy -> Damage */}
                                        {renderModButton("Trees", "tree", "+Tree Density")}
                                        {renderModButton("Ore Find", "ore", "+Ore Density")}
                                        {renderModButton("Size", "energy", "+Size & Height")}
                                        {renderModButton("DMG", "damage", "+Mining Damage")}
                                    </div>
                                </div>
                            )}

                            <div style={{ borderTop: `2px solid ${Colors.Grey.Dark}`, margin: '20px 0' }}></div>

                            {/* Settings */}
                            <div style={{ marginBottom: '20px', pointerEvents: 'auto' }}>
                                <Toggle label="Auto-Rotate Camera" checked={autoRotate} onChange={setAutoRotate} />
                                <div style={{ marginTop: '10px' }}>
                                    <Slider
                                        label="Rotation Speed"
                                        min={-0.2}
                                        max={0.2}
                                        step={0.01}
                                        value={rotationSpeed}
                                        onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                                        disabled={!autoRotate}
                                    />
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <Button onClick={() => setIsMenuOpen(false)} variant="grey">Resume Game</Button>
                                <Button onClick={() => bridge.quitApplication()} variant="red">Quit Application</Button>
                                {hasCalibrated && (
                                    <Button
                                        onClick={() => {
                                            // Full reset to pre-calibration state
                                            setModLevels({ tree: 0, ore: 0, energy: 0, damage: 0 });
                                            setInventory({} as Record<BlockType, number>);
                                            setCurrentTool(ToolTier.HAND);
                                            setToolHealth(100);
                                            setTotalMined(0);
                                            setSpentOnCurrentGen(0);
                                            setHasCalibrated(false); // Reset calibration
                                            setRunModifiers([{ damage: 1.0 }]); // Reset damage multiplier

                                            // Wait for state to update, then regenerate with level 0 params
                                            setTimeout(() => {
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

                                                // Generate with level 0 settings
                                                const seedNum = parseInt(seed) || 12345;
                                                const nextSize = 16;
                                                const nextHeight = 32;
                                                const oreMult = 1.0;
                                                const treeMult = 1.0;
                                                const islandFactor = 0.08; // Starting island size

                                                bridge.regenerateWorld(seedNum, nextSize, nextHeight, oreMult, treeMult, islandFactor);

                                                setTimeout(() => {
                                                    clearInterval(interval);
                                                    setProgress(100);
                                                    setTimeout(() => {
                                                        setIsGenerating(false);
                                                        setIsMenuOpen(false);
                                                        setToastMessage('🔄 Full Reset Complete');
                                                        setTimeout(() => setToastMessage(''), 3000);
                                                    }, 500);
                                                }, 1500);
                                            }, 50);
                                        }}
                                        variant="red"
                                        style={{
                                            fontSize: '11px',
                                            padding: '8px 12px',
                                            opacity: 0.8
                                        }}
                                    >
                                        Reset Upgrades
                                    </Button>
                                )}
                            </div>
                        </Panel>
                    </div >
                )
                }

                {/* Toast Notification */}
                {toastMessage && (
                    <div style={{
                        position: 'fixed',
                        top: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%)',
                        backdropFilter: 'blur(10px)',
                        color: Colors.White,
                        padding: '16px 32px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        fontSize: '16px',
                        fontWeight: '600',
                        fontFamily: Styles.Font.Family,
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                        zIndex: 10000,
                        animation: 'toastSlideInFade 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        pointerEvents: 'none',
                        letterSpacing: '0.5px'
                    }}>
                        {toastMessage}
                    </div>
                )}

                <style>{`
                    @keyframes toastSlideInFade {
                        0% {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-20px);
                        }
                        10% {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                        85% {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                        100% {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-10px);
                        }
                    }
                `}</style>
            </HUDLayer >
        </GameLayout >
    );
}

export default App;
