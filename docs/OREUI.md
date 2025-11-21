# OreUI: High-Performance Game UI with Facets

## What is OreUI?

OreUI is a React-based UI library designed for game engines, inspired by Mojang's Bedrock Edition UI architecture. It achieves **zero React re-renders** for dynamic data by using the **Facet pattern**.

## The Problem with Traditional React

In a typical game UI, you might have:

```tsx
function HealthBar() {
    const [health, setHealth] = useState(100);
    
    useEffect(() => {
        const interval = setInterval(() => {
            // Game updates health 60 times per second
            setHealth(getHealthFromGame());
        }, 16);
        return () => clearInterval(interval);
    }, []);
    
    return <div style={{ width: `${health}%` }} />; // Re-renders 60 FPS!
}
```

**Problem**: Every health update triggers a full React reconciliation, even though only the `width` style changed.

## The OreUI Solution: Facets

```tsx
function HealthBar() {
    const health = remoteFacet('player_health', 100);
    const width = useFacetMap(h => `${h}%`, [], [health]);
    
    return <FastDiv style={{ width }} />; // Zero re-renders!
}
```

**How it works**:
1. C++ game loop calls `UpdateFacet('player_health', 85)`
2. `FacetManager` updates the facet value
3. `FastDiv` observes the facet and updates `element.style.width` directly
4. React never re-renders

## Core Concepts

### 1. Remote Facets

Remote Facets connect to C++ game state:

```tsx
const tickCount = remoteFacet<number>('tick_count', 0);
const playerPos = remoteFacet<Vector3>('player_pos', { x: 0, y: 0, z: 0 });
```

### 2. Facet Mapping

Transform facet values without unwrapping:

```tsx
const health = remoteFacet('health', 100);
const color = useFacetMap(h => h < 30 ? 'red' : 'green', [], [health]);
```

### 3. Fast Components

Components that accept Facets in props:

```tsx
<FastDiv style={{ 
    backgroundColor: colorFacet,
    transform: transformFacet 
}} />
```

## The Three Principles

### Principle 1: Facets All The Way Down

**Don't unwrap Facets early**. Pass them through your component tree.

```tsx
// ✅ Good
function App() {
    const health = remoteFacet('health', 100);
    return <HealthBar health={health} />;
}

function HealthBar({ health }: { health: Facet<number> }) {
    const width = useFacetMap(h => `${h}%`, [], [health]);
    return <FastDiv style={{ width }} />;
}

// ❌ Bad
function App() {
    const health = useFacetValue(remoteFacet('health', 100));
    return <HealthBar health={health} />; // Re-renders on every change!
}
```

### Principle 2: Direct DOM Updates

Use `fast-` components for dynamic properties:

```tsx
// ✅ Good - Direct DOM update
<FastDiv style={dynamicStyleFacet} />

// ❌ Bad - React re-render
<div style={useFacetValue(dynamicStyleFacet)} />
```

### Principle 3: Minimal React Surface

Keep React for:
- Component structure
- Event handlers
- Static content

Use Facets for:
- Game state
- Animations
- Dynamic styles/content

## API Reference

### `remoteFacet<T>(id: string, initialValue: T): Facet<T>`

Creates or retrieves a facet connected to C++ game state.

```tsx
const score = remoteFacet<number>('player_score', 0);
```

### `useFacetMap<T, R>(fn, deps, facets): Facet<R>`

Transforms facet values.

```tsx
const health = remoteFacet('health', 100);
const barWidth = useFacetMap(
    h => `${h}%`,
    [],
    [health]
);
```

### `<FastDiv>`

A `div` that accepts Facets in its `style` prop.

```tsx
<FastDiv style={{
    width: widthFacet,
    backgroundColor: colorFacet
}} />
```

## Performance Comparison

| Approach | Updates/sec | React Re-renders | DOM Updates |
|----------|-------------|------------------|-------------|
| Traditional React | 60 | 60 | 60 |
| OreUI Facets | 60 | 0 | 60 |

## Best Practices

### ✅ Do

- Pass Facets through component props
- Use `useFacetMap` for transformations
- Use `FastDiv` for dynamic styles
- Keep game state in C++

### ❌ Don't

- Call `useFacetValue` unless necessary
- Mix Facets with `useState` for the same data
- Create Facets inside render functions
- Unwrap Facets early in the component tree

## Example: Animated Health Bar

```tsx
import { remoteFacet } from './engine/hooks';
import { FastDiv } from './engine/components';
import { useFacetMap } from '@react-facet/core';

function HealthBar() {
    const health = remoteFacet<number>('player_health', 100);
    
    const barStyle = useFacetMap(h => ({
        width: `${h}%`,
        backgroundColor: h < 30 ? '#E60F58' : '#4CAF50',
        transition: 'width 0.2s, background-color 0.3s'
    }), [], [health]);
    
    return (
        <div style={{ 
            width: '200px', 
            height: '20px', 
            border: '2px solid #333' 
        }}>
            <FastDiv style={barStyle} />
        </div>
    );
}
```

## Next Steps

- [Data Binding Guide](DATA_BINDING.md) - Learn how C++ communicates with UI
- [Component Library](COMPONENTS.md) - Explore available components
- [Architecture](ARCHITECTURE.md) - Understand the system design
