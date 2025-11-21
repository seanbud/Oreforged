import { useState } from 'react'
import Panel from './components/Panel'
import Toggle from './components/Toggle'
import Input from './components/Input'
import Slider from './components/Slider'
import Button from './components/Button'
import { remoteFacet } from './engine/hooks'
import { FastDiv } from './engine/components'
import { useFacetMap } from '@react-facet/core'
import { updateGame } from './engine/bridge'

const tickCountFacet = remoteFacet<number>('tick_count', 0);

function App() {
    const [toggleValue, setToggleValue] = useState(false)
    const [inputValue, setInputValue] = useState('Hello OreUI')
    const [sliderValue, setSliderValue] = useState(50)

    const handleToggle = (val: boolean) => {
        setToggleValue(val)
        console.log("Toggle:", val)
    }

    const tickStyle = useFacetMap(tick => ({
        width: '50px',
        height: '50px',
        backgroundColor: '#E60F58',
        transform: `translateX(${tick % 300}px) rotate(${tick * 5}deg)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        borderRadius: '4px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    }), [], [tickCountFacet]);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1e1e1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Panel style={{ width: '400px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h1 style={{ margin: 0, textAlign: 'center', color: '#fff', fontSize: '1.2rem' }}>OreUI Component Showcase</h1>

                    <div style={{ border: '1px solid #444', padding: '20px', borderRadius: '4px', backgroundColor: '#252526' }}>
                        <div style={{ marginBottom: '10px', color: '#aaa', fontSize: '0.9rem' }}>C++ Data Binding (60 TPS)</div>
                        <div style={{ height: '60px', position: 'relative', overflow: 'hidden', backgroundColor: '#1e1e1e', borderRadius: '4px' }}>
                            <FastDiv style={tickStyle}>
                                {/* Visual box */}
                            </FastDiv>
                        </div>
                    </div>

                    <Toggle
                        label="Enable Feature"
                        checked={toggleValue}
                        onChange={handleToggle}
                    />

                    <Input
                        placeholder="Type something..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />

                    <Slider
                        min={0}
                        max={100}
                        value={sliderValue}
                        onChange={(v) => {
                            setSliderValue(v);
                            updateGame('renderDistance', v);
                        }}
                    />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="green" onClick={() => console.log("Primary Clicked")}>
                            Primary
                        </Button>
                        <Button variant="red" onClick={() => console.log("Secondary Clicked")}>
                            Secondary
                        </Button>
                    </div>

                </div>
            </Panel>
        </div>
    )
}

export default App
