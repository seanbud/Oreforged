# OreForged documentation

<p align="left">
  <img src="images/banner.png" alt="OreForged" width="300">
</p>

Documentation for the OreForged project and OreUI framework.

## Documentation

-   **[Architecture](ARCHITECTURE.md)** - System design and structure
-   **[Data Binding](DATA_BINDING.md)** - C++ ↔ JavaScript communication
-   **[OreUI Guide](OREUI.md)** - Facet-based UI pattern
-   **[Component Library](COMPONENTS.md)** - UI components

## Overview

OreForged is a C++ game engine demo utilizing **OreUI**, a React-based UI library.

### Features

-   **Direct DOM Mutation**: Updates bypass React reconciliation.
-   **Fixed Tick Rate**: 60Hz C++ game loop.
-   **Bidirectional Interop**: Synchronized state between C++ and JavaScript.
-   **TypeScript**: Typed API bindings.

## Setup

```bash
git clone https://github.com/yourusername/Oreforged.git
cd Oreforged
.\build.bat
```

### Usage Example

```tsx
import { remoteFacet } from "./engine/hooks";
import { FastDiv } from "./engine/components";
import { useFacetMap } from "@react-facet/core";

function HealthBar() {
	const health = remoteFacet<number>("player_health", 100);
	const width = useFacetMap((h) => `${h}%`, [], [health]);

	return <FastDiv style={{ width }} />;
}
```

## Concepts

### Facets

Observable values updated without triggering React re-renders.

```tsx
const tickCount = remoteFacet<number>("tick_count", 0);
```

### Remote Facets

Connects to C++ game state.

**C++**
```cpp
UpdateFacet("tick_count", std::to_string(m_state.tickCount));
```

**React**
```tsx
const tickCount = remoteFacet<number>("tick_count", 0);
```

### Fast Components

Components that update the DOM directly.

```tsx
<FastDiv style={dynamicStyleFacet} />
```

## OreUI Design Pattern

1.  **Facets**: Pass Facets through the component tree. Do not unwrap values early.
2.  **Direct Updates**: Use `fast-` components to bypass React reconciliation.
3.  **Scope**: Use React for structure and events. Use Facets for dynamic data.

## Directory Structure

```
docs/
├── README.md          # Project root documentation
├── OREUI.md           # Facet pattern guide
├── DATA_BINDING.md    # C++ ↔ JS communication
├── COMPONENTS.md      # Component library
└── ARCHITECTURE.md    # System design
```

## Examples

### Transformations

```tsx
const tickCount = remoteFacet<number>("tick_count", 0);
const style = useFacetMap(
	(tick) => ({
		transform: `translateX(${tick % 300}px) rotate(${tick * 5}deg)`,
	}),
	[],
	[tickCount]
);

<FastDiv style={style}>Animated!</FastDiv>;
```

### Input Handling

```tsx
function LoginForm() {
	const [username, setUsername] = useState("");

	const handleSubmit = () => {
		updateGame("login", { username });
	};

	return (
		<Panel>
			<Input
				value={username}
				onChange={(e) => setUsername(e.target.value)}
			/>
			<Button onClick={handleSubmit}>Login</Button>
		</Panel>
	);
}
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../LICENSE).
