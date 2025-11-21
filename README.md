# OreForged

> A high-performance C++ game engine demo showcasing **OreUI** - a React-based UI library inspired by Mojang's Bedrock Edition UI architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Project Goals

**OreForged** is an open-source "toy engine" designed to:

1. **Showcase OreUI**: Demonstrate best practices for high-performance game UIs using the Facet pattern
2. **Inspire Contribution**: Serve as a reference implementation to standardize game UI development
3. **Optimize for Fun**: Tight gameplay loop with minimal scope - "Collect → Upgrade → Repeat"

## ✨ Key Features

- **Zero React Re-renders**: Direct DOM updates via Facets bypass React reconciliation
- **60 TPS Game Loop**: Smooth C++ game logic running in parallel with UI
- **Two-Way Data Binding**: Efficient C++ ↔ JavaScript communication
- **Mojang-Inspired**: Patterns extracted from Minecraft Bedrock Edition
- **Type-Safe**: Full TypeScript support with generics
- **Pixelated Aesthetic**: Minecraft-style UI components

## 🚀 Quick Start

### Prerequisites

- **C++**: CMake, MSVC (Windows) or GCC/Clang (Linux/Mac)
- **Node.js**: v18+ with `pnpm` installed globally
- **Git**: For cloning the repository

### Build & Run

```bash
# Clone the repository
git clone https://github.com/yourusername/Oreforged.git
cd Oreforged

# Build everything (UI + C++)
.\build.bat

# Run the application
build\bin\Release\OreForged.exe
```

## 📚 Documentation

- **[OreUI Guide](docs/OREUI.md)** - Understanding the Facet-based UI system
- **[Data Binding](docs/DATA_BINDING.md)** - How C++ and JavaScript communicate
- **[Component Library](docs/COMPONENTS.md)** - Using OreUI components
- **[Architecture](docs/ARCHITECTURE.md)** - System design and patterns

## 🎨 OreUI Philosophy

OreUI follows three core principles inspired by Mojang's Bedrock UI:

### 1. **Facets All The Way Down**
Pass `Facet<T>` objects through your component tree instead of unwrapping values. This allows child components to subscribe directly to changes.

```tsx
// ✅ Good - Pass the Facet
const health = remoteFacet('player_health', 100);
return <HealthBar health={health} />;

// ❌ Bad - Unwrap and re-render entire tree
const health = useFacetValue(remoteFacet('player_health', 100));
return <HealthBar health={health} />;
```

### 2. **Direct DOM Updates**
Use `fast-` components that update the DOM directly when Facets change, avoiding React's reconciliation.

```tsx
const tickStyle = useFacetMap(tick => ({
    transform: `translateX(${tick % 300}px)`
}), [], [tickFacet]);

<FastDiv style={tickStyle} />
```

### 3. **Minimal React Surface Area**
Keep React for structure and event handling. Use Facets for all dynamic data.

## 🏗️ Architecture

```
┌─────────────────┐
│   C++ Game      │  60 TPS Loop
│   Loop          │  
└────────┬────────┘
         │ UpdateFacet()
         ▼
┌─────────────────┐
│   WebView       │  JavaScript Bridge
│   (Chromium)    │
└────────┬────────┘
         │ window.OreForged.updateFacet()
         ▼
┌─────────────────┐
│ FacetManager    │  State Management
└────────┬────────┘
         │ facet.set()
         ▼
┌─────────────────┐
│ React UI        │  Components
│ (FastDiv, etc)  │
└─────────────────┘
```

## 🧩 Component Showcase

OreForged includes a complete set of Minecraft-styled UI components:

- **Panel**: Container with beveled borders
- **Button**: Clickable with hover/active states
- **Toggle**: Boolean switch
- **Input**: Text input field
- **Slider**: Range control with live updates

All components support the OreUI Facet pattern for maximum performance.

## 🤝 Contributing

We welcome contributions! Whether it's:

- Adding new OreUI components
- Improving documentation
- Optimizing the data binding layer
- Creating example games

Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Mojang Studios** - For inspiring the Facet-based UI architecture
- **@react-facet** - The underlying Facet library
- **webview** - Cross-platform webview library

## 🔗 Links

- [Documentation](docs/)
- [Issue Tracker](https://github.com/yourusername/Oreforged/issues)
- [Discussions](https://github.com/yourusername/Oreforged/discussions)

---

**Built with ❤️ by the OreForged community**
