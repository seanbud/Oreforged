import { useState, useEffect } from 'react'
import Button from './components/Button'
import Panel from './components/Panel'
import Toggle from './components/Toggle'
import Input from './components/Input'
import Slider from './components/Slider'
import { Colors } from './design/tokens'

function App() {
    const [toggleState, setToggleState] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [sliderValue, setSliderValue] = useState(50);
    const [log, setLog] = useState<string[]>([]);

    useEffect(() => {
        console.log("OreUI App Mounted");
    }, []);

    const handleLog = (msg: string) => {
        setLog(prev => [...prev, msg].slice(-5)); // Keep last 5 logs
        console.log(msg); // Also log to console for C++ forwarding
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: Colors.Black, // Dark background for contrast
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <Panel style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h1 style={{ margin: 0, textAlign: 'center', fontSize: '1.5rem', textShadow: '2px 2px 0px #000' }}>
                    OreUI Components
                </h1>

                {/* Toggles */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Toggle
                        checked={toggleState}
                        onChange={(v) => { setToggleState(v); handleLog(`Toggle: ${v}`); }}
                        label="Enable Power"
                    />
                    <Toggle checked={true} onChange={() => { }} label="Always On" />
                </div>

                {/* Inputs */}
                <Input
                    label="World Name"
                    placeholder="New World"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />

                {/* Sliders */}
                <Slider
                    label="Render Distance"
                    min={2}
                    max={32}
                    value={sliderValue}
                    onChange={(v) => setSliderValue(v)}
                />

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button onClick={() => handleLog(`Input: ${inputValue}`)}>Save World</Button>
                    <Button onClick={() => handleLog('Cancelled')} style={{ filter: 'grayscale(100%)' }}>Cancel</Button>
                </div>

                {/* Log Output */}
                <div style={{
                    backgroundColor: '#000',
                    padding: '10px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#aaa',
                    minHeight: '80px'
                }}>
                    {log.map((l, i) => <div key={i}>&gt; {l}</div>)}
                    {log.length === 0 && <div>&gt; Ready...</div>}
                </div>
            </Panel>
        </div>
    )
}

export default App
