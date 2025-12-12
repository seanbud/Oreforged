# Contributing to OreForged

Thank you for your interest in contributing to OreForged! This document provides guidelines and information for contributors.

## Code of Conduct

Be respectful, constructive, and collaborative. We're all here to learn and build something cool together.

## Ways to Contribute

### 1. Bug Reports

Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, compiler version, etc.)

### 2. Feature Requests

Have an idea? Open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Why it fits the OreUI philosophy

### 3. Code Contributions

#### OreUI Components

We welcome new components! Follow these guidelines:

**Design Principles**:
- Use design tokens from `ui/src/design/tokens.ts`
- Maintain pixelated Minecraft aesthetic
- Support Facet props where appropriate
- Include TypeScript types

**Example Component**:

```tsx
import React from 'react';
import { Colors, Styles } from '../design/tokens';

interface ProgressBarProps {
    label?: string;
    value: number;  // 0-100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value }) => {
    return (
        <div>
            {label && <div style={{ marginBottom: '5px' }}>{label}</div>}
            <div style={{
                width: '200px',
                height: '20px',
                backgroundColor: Colors.Grey.Base,
                border: `${Styles.Border.Width} ${Styles.Border.Style} ${Colors.Grey.Dark}`,
                boxShadow: Styles.Shadows.Bevel(Colors.Grey.Light, Colors.Grey.Dark)
            }}>
                <div style={{
                    width: `${value}%`,
                    height: '100%',
                    backgroundColor: Colors.Green.Base,
                    boxShadow: Styles.Shadows.Bevel(Colors.Green.Light, Colors.Green.Dark)
                }} />
            </div>
        </div>
    );
};

export default ProgressBar;
```

#### C++ Contributions

**Code Style**:
- Use modern C++ (C++17+)
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and small

**Example**:

```cpp
// Good: Clear, focused function
void Game::UpdatePlayerPosition(float deltaTime) {
    m_state.playerX += m_state.velocityX * deltaTime;
    m_state.playerY += m_state.velocityY * deltaTime;
    
    UpdateFacet("player_pos", json{
        {"x", m_state.playerX},
        {"y", m_state.playerY}
    }.dump());
}
```

### 4. Documentation

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add examples
- Improve diagrams
- Translate to other languages

## Development Setup

### Prerequisites

```bash
# Windows
choco install cmake nodejs pnpm

# macOS
brew install cmake node pnpm

# Linux (Ubuntu/Debian)
sudo apt install cmake nodejs npm
npm install -g pnpm
```

### Building

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Oreforged.git
cd Oreforged

# Build
.\build.bat  # Windows
./build.sh   # Linux/Mac (if available)

# Or manually:
cd ui && pnpm install && pnpm build && cd ..
mkdir build && cd build
cmake .. && cmake --build . --config Release
```

### Testing

```bash
# Test UI changes
cd ui
pnpm dev  # Hot reload for UI development
```

### Packaging

To create a release zip (Windows):

```powershell
# Creates OreForged_Windows.zip in the root directory
./package_release.ps1
```

This script will:
1. Rebuild the entire project
2. Create a clean `release/` directory
3. Copy the executable and UI assets
4. Bundle them into a verified zip file

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the guidelines above
4. **Test** your changes thoroughly
5. **Commit** with clear messages: `git commit -m "Add amazing feature"`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open a Pull Request** with:
   - Clear description of changes
   - Screenshots/videos if UI changes
   - Reference to related issues

### Commit Message Format

```
type: brief description

Longer explanation if needed.

Fixes #123
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:
- `feat: add progress bar component`
- `fix: resolve facet memory leak`
- `docs: improve data binding guide`
- `perf: optimize facet updates`

## OreUI Philosophy

When contributing, keep these principles in mind:

### 1. Facets All The Way Down

Pass Facets through component trees instead of unwrapping early.

```tsx
// ✅ Good
<HealthBar health={healthFacet} />

// ❌ Bad
<HealthBar health={useFacetValue(healthFacet)} />
```

### 2. Zero React Re-renders

Use `FastDiv` and similar components for dynamic content.

```tsx
// ✅ Good
<FastDiv style={dynamicStyleFacet} />

// ❌ Bad
<div style={useFacetValue(dynamicStyleFacet)} />
```

### 3. Performance First

- Batch updates when possible
- Use appropriate update frequencies
- Profile before optimizing

## Questions?

- Open a [Discussion](https://github.com/yourusername/Oreforged/discussions)
- Join our Discord (if available)
- Ask in your Pull Request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to OreForged!** 🎮
