# Data Binding: C++ ↔ JavaScript Communication

## Overview

OreForged uses a bidirectional data binding system that allows:
- **C++ → UI**: Game state updates pushed to React at 60 TPS
- **UI → C++**: User interactions sent back to game logic

## Architecture

![Data Flow Diagram](images/data_flow.png)

**C++ → UI Flow**:
1. Game loop calls `UpdateFacet()`
2. WebView evaluates JavaScript
3. `window.OreForged.updateFacet()` called
4. `FacetManager` updates facet value
5. `FastDiv` observes change and updates DOM directly

**UI → C++ Flow**:
1. User interacts with UI
2. Event handler calls `updateGame()`
3. `window.updateState()` invoked
4. C++ binding receives JSON data
5. Game state updated

## C++ → UI: Pushing State

### Step 1: Update Facet from C++

```cpp
void Game::Update() {
    m_state.tickCount++;
    
    // Push to UI
    UpdateFacet("tick_count", std::to_string(m_state.tickCount));
    UpdateFacet("player_health", std::to_string(m_state.playerHealth));
}

void Game::UpdateFacet(const std::string& id, const std::string& value) {
    if (!m_webview) return;
    
    m_webview->w.dispatch([=]() {
        std::string script = 
            "if(window.OreForged && window.OreForged.updateFacet) "
            "window.OreForged.updateFacet('" + id + "', " + value + ");";
        m_webview->w.eval(script);
    });
}
```

### Step 2: Receive in JavaScript

The `FacetManager` automatically handles incoming updates:

```typescript
// bridge.ts
window.OreForged.updateFacet = (id, value) => {
    facetManager.updateFacet(id, value);
};
```

### Step 3: Subscribe in React

```tsx
import { remoteFacet } from './engine/hooks';

function TickCounter() {
    const tickCount = remoteFacet<number>('tick_count', 0);
    const display = useFacetMap(t => `Tick: ${t}`, [], [tickCount]);
    
    return <FastDiv>{display}</FastDiv>;
}
```

## UI → C++: Sending Actions

### Step 1: Call from React

```tsx
import { updateGame } from './engine/bridge';

function SettingsPanel() {
    const [renderDistance, setRenderDistance] = useState(12);
    
    const handleChange = (value: number) => {
        setRenderDistance(value);
        updateGame('renderDistance', value);
    };
    
    return <Slider value={renderDistance} onChange={handleChange} />;
}
```

### Step 2: Bridge Function

```typescript
// bridge.ts
export function updateGame(key: string, value: any) {
    if ((window as any).updateState) {
        (window as any).updateState(key, value);
    }
}
```

### Step 3: Receive in C++

```cpp
void Game::InitUI() {
    m_webview->w.bind("updateState", [&](std::string seq, std::string req, void*) {
        try {
            auto args = json::parse(req);
            if (args.is_array() && args.size() >= 2) {
                std::string key = args[0];
                
                if (key == "renderDistance") {
                    m_state.renderDistance = args[1];
                    std::cout << "Updated Render Distance: " 
                              << m_state.renderDistance << std::endl;
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "JSON Parse Error: " << e.what() << std::endl;
        }
        m_webview->w.resolve(seq, 0, "OK");
    }, nullptr);
}
```

## Data Types

### Primitives

```cpp
// C++
UpdateFacet("score", std::to_string(1234));
UpdateFacet("name", "\"Player1\""); // Note: JSON string needs quotes
UpdateFacet("enabled", "true");
```

```tsx
// React
const score = remoteFacet<number>('score', 0);
const name = remoteFacet<string>('name', '');
const enabled = remoteFacet<boolean>('enabled', false);
```

### Objects

```cpp
// C++
json playerPos = {
    {"x", 10.5},
    {"y", 64.0},
    {"z", -23.7}
};
UpdateFacet("player_pos", playerPos.dump());
```

```tsx
// React
interface Vector3 { x: number; y: number; z: number; }
const playerPos = remoteFacet<Vector3>('player_pos', { x: 0, y: 0, z: 0 });
```

### Arrays

```cpp
// C++
json inventory = json::array();
inventory.push_back({{"id", "diamond"}, {"count", 5}});
inventory.push_back({{"id", "iron"}, {"count", 12}});
UpdateFacet("inventory", inventory.dump());
```

```tsx
// React
interface Item { id: string; count: number; }
const inventory = remoteFacet<Item[]>('inventory', []);
```

## Performance Considerations

### Batching Updates

For multiple related updates, consider batching:

```cpp
void Game::SendFullState() {
    json state = {
        {"tick_count", m_state.tickCount},
        {"player_health", m_state.playerHealth},
        {"player_pos", {
            {"x", m_state.playerX},
            {"y", m_state.playerY},
            {"z", m_state.playerZ}
        }}
    };
    UpdateFacet("game_state", state.dump());
}
```

### Update Frequency

Not all state needs 60 TPS updates:

```cpp
void Game::Update() {
    m_state.tickCount++;
    
    // Every tick (60 TPS)
    UpdateFacet("tick_count", std::to_string(m_state.tickCount));
    
    // Every second (1 TPS)
    if (m_state.tickCount % 60 == 0) {
        UpdateFacet("fps", std::to_string(CalculateFPS()));
    }
    
    // Only on change
    if (m_state.playerHealthChanged) {
        UpdateFacet("player_health", std::to_string(m_state.playerHealth));
        m_state.playerHealthChanged = false;
    }
}
```

## Error Handling

### C++ Side

```cpp
void Game::UpdateFacet(const std::string& id, const std::string& value) {
    if (!m_webview) {
        std::cerr << "Webview not initialized" << std::endl;
        return;
    }
    
    try {
        m_webview->w.dispatch([=]() {
            // ... eval script
        });
    } catch (const std::exception& e) {
        std::cerr << "UpdateFacet error: " << e.what() << std::endl;
    }
}
```

### JavaScript Side

```typescript
window.OreForged.updateFacet = (id, value) => {
    try {
        facetManager.updateFacet(id, value);
    } catch (error) {
        console.error(`Failed to update facet ${id}:`, error);
    }
};
```

## Debugging

### Enable Logging

```typescript
// bridge.ts
updateFacet(id: string, value: any) {
    console.log(`Facet Update: ${id} =`, value);
    // ... rest of implementation
}
```

### Monitor Performance

```tsx
function PerformanceMonitor() {
    const tickCount = remoteFacet<number>('tick_count', 0);
    const [fps, setFps] = useState(0);
    
    useEffect(() => {
        let lastTick = 0;
        let lastTime = performance.now();
        
        return tickCount.observe(tick => {
            const now = performance.now();
            const delta = tick - lastTick;
            const timeDelta = now - lastTime;
            
            if (timeDelta > 0) {
                setFps(Math.round((delta / timeDelta) * 1000));
            }
            
            lastTick = tick;
            lastTime = now;
        });
    }, []);
    
    return <div>Facet Updates: {fps} FPS</div>;
}
```

## Best Practices

### ✅ Do

- Use typed facets with TypeScript interfaces
- Batch related updates when possible
- Handle errors gracefully on both sides
- Use appropriate update frequencies
- Validate data before sending to C++

### ❌ Don't

- Send updates faster than necessary
- Forget to handle JSON parsing errors
- Mix Facets with traditional state for the same data
- Send large objects every frame
- Ignore type safety

## Next Steps

- [OreUI Guide](OREUI.md) - Learn the Facet pattern
- [Component Library](COMPONENTS.md) - Use pre-built components
- [Architecture](ARCHITECTURE.md) - Understand the system
