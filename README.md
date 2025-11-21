# OreForged

<p align="left">
  <img src="docs/images/banner.png" alt="OreForged" width="300">
</p>

> A high-performance C++ game engine demo showcasing **OreUI** - a React-based UI library inspired by Mojang's Bedrock Edition UI architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="left">
  <img src="https://i.gyazo.com/d1b056037b992ac613ebb0ca22aae0ab.gif" alt="OreForged GIF" width="300">
</p>

## 🎯 Project Goals

**OreForged** is an open-source "toy engine" designed to:

1. **Showcase OreUI**: Demonstrate best practices for high-performance game UIs using the Facet pattern
2. **Inspire Contribution**: Serve as a reference implementation to standardize game UI development
3. **Optimize for Fun**: Tight gameplay loop with minimal scope - "Collect → Upgrade → Repeat"

## ✨ Key Features

-   **Zero React Re-renders**: Direct DOM updates via Facets bypass React reconciliation
-   **60 TPS Game Loop**: Smooth C++ game logic running in parallel with UI
-   **Two-Way Data Binding**: Efficient C++ ↔ JavaScript communication
-   **Mojang-Inspired**: Patterns extracted from Minecraft Bedrock Edition
-   **Type-Safe**: Full TypeScript support with generics
-   **Pixelated Aesthetic**: Minecraft-style UI components

## 🚀 Quick Start

### Prerequisites

-   **C++**: CMake, MSVC (Windows) or GCC/Clang (Linux/Mac)
-   **Node.js**: v18+ with `pnpm` installed globally
-   **Git**: For cloning the repository

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

-   **[Architecture](docs/ARCHITECTURE.md)** - System design and patterns
-   **[Data Binding](docs/DATA_BINDING.md)** - How C++ and JavaScript communicate
-   **[OreUI Guide](docs/OREUI.md)** - Understanding the Facet-based UI system
-   **[Component Library](docs/COMPONENTS.md)** - Using OreUI components

## 🏗️ Architecture

<p align="center">
  <img src="docs/images/architecture.png" alt="Architecture" width="500">
</p>

### Data Flow

The system consists of four main layers:

1. **C++ Game Loop** - Runs at 60 TPS, manages game state
2. **WebView Bridge** - Chromium-based bridge between C++ and JavaScript
3. **FacetManager** - Central state management for UI updates
4. **React UI** - Component-based interface with direct DOM updates

<p align="center">
  <img src="docs/images/data_flow.png" alt="Data Flow" width="500">
</p>

## 🎨 OreUI Philosophy

OreUI follows three core principles inspired by Mojang's Bedrock UI:

### 1. **Facets All The Way Down**

Pass `Facet<T>` objects through your component tree instead of unwrapping values.

```tsx
// ✅ Good - Pass the Facet
const health = remoteFacet("player_health", 100);
return <HealthBar health={health} />;

// ❌ Bad - Unwrap and re-render entire tree
const health = useFacetValue(remoteFacet("player_health", 100));
return <HealthBar health={health} />;
```

### 2. **Direct DOM Updates**

Use `fast-` components that update the DOM directly when Facets change.

```tsx
const tickStyle = useFacetMap(
	(tick) => ({
		transform: `translateX(${tick % 300}px)`,
	}),
	[],
	[tickFacet]
);

<FastDiv style={tickStyle} />;
```

### 3. **Minimal React Surface Area**

Keep React for structure and event handling. Use Facets for all dynamic data.

## 🧩 Component Showcase

OreForged includes a complete set of Minecraft-styled UI components:

-   **Panel**: Container with beveled borders
-   **Button**: Clickable with hover/active states
-   **Toggle**: Boolean switch
-   **Input**: Text input field
-   **Slider**: Range control with live updates

All components support the OreUI Facet pattern for maximum performance.

## 🤝 Contributing

We welcome contributions! Whether it's:

-   Adding new OreUI components
-   Improving documentation
-   Optimizing the data binding layer
-   Creating example games

Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

-   **Mojang Studios** - For inspiring the Facet-based UI architecture
-   **@react-facet** - The underlying Facet library
-   **webview** - Cross-platform webview library

## 🔗 Links

-   [Documentation](docs/)
-   [Issue Tracker](https://github.com/yourusername/Oreforged/issues)
-   [Discussions](https://github.com/yourusername/Oreforged/discussions)

---

**Built with ❤️ by the OreForged community**
