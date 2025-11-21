# OreForged Architecture

## System Overview

OreForged is a hybrid C++/JavaScript application that combines:
- **C++ Game Engine**: High-performance game loop and logic
- **Chromium WebView**: Embedded browser for UI rendering
- **React + OreUI**: Facet-based UI framework

```mermaid
graph TB
    A[C++ Game Engine] -->|webview| B[Chromium WebView]
    B -->|JavaScript| C[React Application]
    C -->|OreUI Components| D[DOM]
    A -->|UpdateFacet| E[FacetManager]
    E -->|Facet.set| C
    C -->|updateGame| A
```

## Layer Breakdown

### 1. C++ Game Layer

**Files**:
- `src/main.cpp` - Entry point
- `src/Game.h` / `src/Game.cpp` - Game logic
- `CMakeLists.txt` - Build configuration

**Responsibilities**:
- Game loop (60 TPS)
- State management (`GameState`)
- Physics/logic updates
- Data binding to UI

**Key Classes**:

```cpp
class Game {
public:
    void Run();              // Start game loop + UI
    void Update();           // Called 60 times/second
    void UpdateFacet(...);   // Push state to UI
    
private:
    void GameLoop();         // Threaded loop
    void InitUI();           // Setup webview
    
    GameState m_state;
    std::unique_ptr<WebviewWrapper> m_webview;
    std::thread m_gameLoopThread;
    std::atomic<bool> m_isRunning;
};
```

### 2. WebView Bridge Layer

**Technology**: [webview/webview](https://github.com/webview/webview)

**Responsibilities**:
- Embed Chromium in C++ application
- Provide JavaScript ↔ C++ communication
- Execute JavaScript from C++
- Bind C++ functions to JavaScript

**Key APIs**:

```cpp
// C++ → JavaScript
m_webview->w.eval("window.OreForged.updateFacet('id', value)");

// JavaScript → C++
m_webview->w.bind("updateState", [](std::string seq, std::string req, void*) {
    // Handle request
    m_webview->w.resolve(seq, 0, "OK");
}, nullptr);
```

### 3. JavaScript Bridge Layer

**Files**:
- `ui/src/engine/bridge.ts` - FacetManager & window bindings
- `ui/src/engine/hooks.ts` - React hooks
- `ui/src/engine/components.tsx` - Fast components

**Responsibilities**:
- Manage Facet registry
- Expose `window.OreForged` API
- Provide React hooks
- Implement fast components

**Key Classes**:

```typescript
class FacetManager {
    private facets = new Map<string, WritableFacet<any>>();
    
    getFacet<T>(id: string, initialValue: T): Facet<T>;
    updateFacet(id: string, value: any): void;
}
```

### 4. React UI Layer

**Files**:
- `ui/src/App.tsx` - Main application
- `ui/src/components/*.tsx` - UI components
- `ui/src/design/tokens.ts` - Design system

**Responsibilities**:
- Render UI structure
- Handle user input
- Subscribe to Facets
- Update DOM efficiently

## Data Flow

### C++ → UI (State Updates)

```
1. Game::Update()
   ↓
2. UpdateFacet("tick_count", "123")
   ↓
3. webview.dispatch(() => webview.eval(...))
   ↓
4. window.OreForged.updateFacet("tick_count", 123)
   ↓
5. FacetManager.updateFacet(...)
   ↓
6. facet.set(123)
   ↓
7. FastDiv.observe() → element.style.transform = ...
```

### UI → C++ (User Actions)

```
1. User clicks slider
   ↓
2. onChange handler
   ↓
3. updateGame("renderDistance", 16)
   ↓
4. window.updateState("renderDistance", 16)
   ↓
5. C++ binding receives JSON: ["renderDistance", 16]
   ↓
6. m_state.renderDistance = 16
```

## Threading Model

```
┌─────────────────────┐
│   Main Thread       │
│  - UI Rendering     │
│  - Event Handling   │
│  - webview.run()    │
└──────────┬──────────┘
           │
           │ dispatch()
           ↓
┌─────────────────────┐
│   Game Thread       │
│  - Game Loop (60Hz) │
│  - Physics          │
│  - State Updates    │
└─────────────────────┘
```

**Important**: 
- `webview.run()` blocks the main thread
- Game loop runs on separate thread
- `dispatch()` queues work for main thread
- All UI updates must use `dispatch()`

## Build Process

```mermaid
graph LR
    A[build.bat] --> B[pnpm build]
    B --> C[Vite Build]
    C --> D[inline-build.cjs]
    D --> E[index.html]
    A --> F[CMake]
    F --> G[MSVC/GCC]
    G --> H[OreForged.exe]
    E --> H
```

**Steps**:
1. **UI Build**: `pnpm build` → Vite bundles React app
2. **Inline**: `inline-build.cjs` → Inlines JS into HTML (avoids CORS)
3. **C++ Build**: CMake → Compiles C++ code
4. **Link**: Executable includes `ui/index.html` path

## File Structure

```
Oreforged/
├── src/
│   ├── main.cpp           # Entry point
│   ├── Game.h             # Game class header
│   └── Game.cpp           # Game implementation
├── ui/
│   ├── src/
│   │   ├── App.tsx        # Main React app
│   │   ├── main.tsx       # React entry point
│   │   ├── components/    # UI components
│   │   ├── design/        # Design tokens
│   │   └── engine/        # OreUI core
│   │       ├── bridge.ts  # FacetManager
│   │       ├── hooks.ts   # React hooks
│   │       └── components.tsx  # Fast components
│   ├── index.html         # UI entry point
│   ├── inline-build.cjs   # Build script
│   └── package.json       # Dependencies
├── docs/                  # Documentation
├── build.bat              # Build script
└── CMakeLists.txt         # C++ build config
```

## Dependencies

### C++
- **webview**: Cross-platform webview library
- **nlohmann/json**: JSON parsing
- **CMake**: Build system

### JavaScript
- **React**: UI framework
- **@react-facet/core**: Facet library
- **@react-facet/dom-fiber**: Fast components
- **Vite**: Build tool
- **TypeScript**: Type safety

## Performance Characteristics

| Operation | Frequency | Overhead |
|-----------|-----------|----------|
| Game Loop | 60 TPS | ~16ms budget |
| Facet Update | 60 FPS | <1ms (direct DOM) |
| React Render | On demand | Minimal (structure only) |
| C++ → JS | 60 FPS | ~0.1ms (eval) |
| JS → C++ | On event | ~0.5ms (JSON parse) |

## Security Considerations

### Content Security Policy

The webview runs local HTML with inline scripts:

```html
<!-- No external resources loaded -->
<script>/* Inlined JavaScript */</script>
```

### C++ Bindings

Only expose necessary functions:

```cpp
// ✅ Safe - Validated input
m_webview->w.bind("updateState", [](std::string seq, std::string req, void*) {
    auto args = json::parse(req);
    // Validate args before using
});

// ❌ Unsafe - Direct eval
m_webview->w.bind("eval", [](std::string seq, std::string req, void*) {
    eval(req); // Don't do this!
});
```

## Debugging

### C++ Side

```cpp
std::cout << "Tick: " << m_state.tickCount << std::endl;
```

### JavaScript Side

```typescript
console.log("Facet updated:", id, value);
// Forwarded to C++ console via logFromUI binding
```

### Chrome DevTools

Right-click webview → Inspect (if debug mode enabled)

## Next Steps

- [OreUI Guide](OREUI.md) - Learn the Facet pattern
- [Data Binding](DATA_BINDING.md) - Understand communication
- [Component Library](COMPONENTS.md) - Use components
