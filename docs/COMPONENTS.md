# OreUI Component Library

A collection of Minecraft-styled UI components built with the Facet pattern for maximum performance.

## Design Tokens

All components use centralized design tokens for consistent styling:

```typescript
// ui/src/design/tokens.ts
export const Colors = {
    Grey: {
        Base: '#C6C6C6',
        Light: '#FFFFFF',
        Dark: '#373737',
        Text: '#3C3C3C'
    },
    Green: {
        Base: '#5EAF4E',
        Light: '#7FD96F',
        Dark: '#4E8F3E'
    },
    Red: {
        Base: '#E60F58',
        Light: '#FF3F88',
        Dark: '#B60F48'
    }
};
```

## Components

### Panel

Container with beveled borders and shadow.

```tsx
import Panel from './components/Panel';

<Panel style={{ width: '400px' }}>
    <h1>Title</h1>
    <p>Content goes here</p>
</Panel>
```

**Props**: Extends `React.HTMLAttributes<HTMLDivElement>`

### Button

Clickable button with hover and active states.

```tsx
import Button from './components/Button';

<Button 
    variant="green"  // 'green' | 'red'
    onClick={() => console.log('Clicked')}
>
    Click Me
</Button>
```

**Props**:
- `variant?: 'green' | 'red'` - Color scheme
- `onClick?: () => void` - Click handler
- Extends `React.ButtonHTMLAttributes<HTMLButtonElement>`

### Toggle

Boolean switch with label.

```tsx
import Toggle from './components/Toggle';

const [enabled, setEnabled] = useState(false);

<Toggle
    label="Enable Feature"
    checked={enabled}
    onChange={setEnabled}
/>
```

**Props**:
- `label: string` - Display text
- `checked: boolean` - Current state
- `onChange: (checked: boolean) => void` - Change handler

### Input

Text input field with optional label.

```tsx
import Input from './components/Input';

const [value, setValue] = useState('');

<Input
    label="Player Name"
    placeholder="Enter name..."
    value={value}
    onChange={(e) => setValue(e.target.value)}
/>
```

**Props**:
- `label?: string` - Optional label text
- Extends `React.InputHTMLAttributes<HTMLInputElement>`

### Slider

Range slider with live value updates.

```tsx
import Slider from './components/Slider';

const [distance, setDistance] = useState(12);

<Slider
    label="Render Distance"
    min={2}
    max={32}
    value={distance}
    onChange={setDistance}
/>
```

**Props**:
- `label?: string` - Optional label text
- `min: number` - Minimum value
- `max: number` - Maximum value
- `value: number` - Current value
- `onChange: (value: number) => void` - Change handler

### FastDiv

A `div` that accepts Facets in its `style` prop for zero-rerender updates.

```tsx
import { FastDiv } from './engine/components';
import { remoteFacet } from './engine/hooks';
import { useFacetMap } from '@react-facet/core';

const tickCount = remoteFacet<number>('tick_count', 0);
const style = useFacetMap(tick => ({
    transform: `translateX(${tick % 300}px)`
}), [], [tickCount]);

<FastDiv style={style}>
    Animated content
</FastDiv>
```

**Props**:
- `style?: CSSProperties | Facet<CSSProperties>` - Static or dynamic styles
- Extends `React.HTMLAttributes<HTMLDivElement>`

## Usage Examples

### Form with Multiple Components

```tsx
function SettingsForm() {
    const [worldName, setWorldName] = useState('New World');
    const [renderDistance, setRenderDistance] = useState(12);
    const [enableCheats, setEnableCheats] = useState(false);
    
    const handleSave = () => {
        updateGame('worldName', worldName);
        updateGame('renderDistance', renderDistance);
        updateGame('enableCheats', enableCheats);
    };
    
    return (
        <Panel style={{ width: '400px' }}>
            <h2>World Settings</h2>
            
            <Input
                label="World Name"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
            />
            
            <Slider
                label="Render Distance"
                min={2}
                max={32}
                value={renderDistance}
                onChange={setRenderDistance}
            />
            
            <Toggle
                label="Enable Cheats"
                checked={enableCheats}
                onChange={setEnableCheats}
            />
            
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="green" onClick={handleSave}>
                    Save
                </Button>
                <Button variant="red" onClick={() => window.close()}>
                    Cancel
                </Button>
            </div>
        </Panel>
    );
}
```

### Animated Health Bar

```tsx
function HealthBar() {
    const health = remoteFacet<number>('player_health', 100);
    
    const barStyle = useFacetMap(h => ({
        width: `${h}%`,
        height: '20px',
        backgroundColor: h < 30 ? Colors.Red.Base : Colors.Green.Base,
        transition: 'width 0.2s, background-color 0.3s',
        boxShadow: Styles.Shadows.Bevel(
            h < 30 ? Colors.Red.Light : Colors.Green.Light,
            h < 30 ? Colors.Red.Dark : Colors.Green.Dark
        )
    }), [], [health]);
    
    return (
        <Panel style={{ width: '200px', padding: '10px' }}>
            <div style={{ marginBottom: '5px', fontSize: '0.9rem' }}>
                Health
            </div>
            <div style={{ 
                border: `2px solid ${Colors.Grey.Dark}`,
                backgroundColor: Colors.Grey.Base
            }}>
                <FastDiv style={barStyle} />
            </div>
        </Panel>
    );
}
```

### Inventory Grid

```tsx
interface Item {
    id: string;
    count: number;
}

function InventoryGrid() {
    const inventory = remoteFacet<Item[]>('inventory', []);
    const [items, setItems] = useState<Item[]>([]);
    
    useEffect(() => {
        return inventory.observe(setItems);
    }, []);
    
    return (
        <Panel style={{ width: '400px' }}>
            <h2>Inventory</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
            }}>
                {items.map((item, i) => (
                    <Panel key={i} style={{ 
                        padding: '10px',
                        textAlign: 'center'
                    }}>
                        <div>{item.id}</div>
                        <div>×{item.count}</div>
                    </Panel>
                ))}
            </div>
        </Panel>
    );
}
```

## Styling Guidelines

### Use Design Tokens

Always use tokens instead of hardcoded values:

```tsx
// ✅ Good
<div style={{ color: Colors.Grey.Text }} />

// ❌ Bad
<div style={{ color: '#3C3C3C' }} />
```

### Maintain Pixelated Aesthetic

```tsx
<div style={{
    fontFamily: Styles.Font.Family,
    imageRendering: Styles.Font.Pixelated
}} />
```

### Apply Beveled Shadows

```tsx
<div style={{
    boxShadow: Styles.Shadows.Bevel(Colors.Grey.Light, Colors.Grey.Dark)
}} />
```

## Creating Custom Components

Follow these patterns when creating new components:

```tsx
import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface MyComponentProps {
    label: string;
    value: number;
}

const MyComponent: React.FC<MyComponentProps> = ({ label, value }) => {
    return (
        <div style={{
            backgroundColor: Colors.Grey.Base,
            border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Dark}`,
            padding: '10px',
            color: Colors.Grey.Text,
            fontFamily: Styles.Font.Family,
            boxShadow: Styles.Shadows.Bevel(Colors.Grey.Light, Colors.Grey.Dark)
        }}>
            <div>{label}</div>
            <div>{value}</div>
        </div>
    );
};

export default MyComponent;
```

## Next Steps

- [OreUI Guide](OREUI.md) - Learn the Facet pattern
- [Data Binding](DATA_BINDING.md) - Connect to C++ game state
- [Architecture](ARCHITECTURE.md) - Understand the system
