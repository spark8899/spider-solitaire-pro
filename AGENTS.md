# Spider Solitaire Pro - Agent Guidelines

This document provides guidelines for agentic coding agents operating in this repository.

## Project Overview

- **Type**: React + TypeScript web game (Spider Solitaire)
- **Build Tool**: Vite
- **Key Dependencies**: React 19, Framer Motion, Lucide React
- **Language**: TypeScript with strict mode
- **Styling**: Vanilla CSS with CSS Variables

## Build Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Lint (ESLint)
npm run lint

# Preview production build
npm run preview
```

**No test framework configured** - this is a small game project without automated tests.

## TypeScript Configuration

- **Target**: ES2022
- **Strict mode**: ENABLED
- **Module resolution**: Bundler (Vite)
- **JSX**: react-jsx

Do NOT use `any` type or suppress type errors. All strict checks are enforced.

## Code Style Guidelines

### Imports

- Use `import type` for type-only imports (e.g., `import type { Card, Move } from './logic/GameModel'`)
- Use named imports for values/functions (e.g., `import { dealInitial, canMoveSequence } from './logic/GameModel'`)
- Group imports: React imports → third-party → local imports
- Order within groups: alphabetical

Example:
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, HelpCircle } from 'lucide-react';
import type { Card, Move } from './logic/GameModel';
import { translations } from './logic/translations';
```

### Naming Conventions

- **Files**: PascalCase for components (e.g., `GameModel.ts`, `App.tsx`)
- **Components**: PascalCase (e.g., `CardComponent`, `PipPattern`)
- **Functions/variables**: camelCase (e.g., `dealInitial`, `canMoveSequence`)
- **Constants**: PascalCase for compile-time constants (e.g., `SUIT_ICONS`), camelCase otherwise
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `Card`, `Move`, `Snapshot`)
- **Type aliases**: PascalCase (e.g., `type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'`)

### TypeScript Patterns

- Use explicit return types for exported functions
- Use type aliases for unions/literals (preferred over enums)
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `readonly` for immutable arrays
- Avoid `any` - use `unknown` when type is truly unknown

### React Patterns

- Use functional components with explicit `React.FC<Props>` typing
- Destructure props in component signatures
- Use `useCallback` for functions passed as props
- Use `useRef` for DOM references
- Prefer early returns for conditional rendering
- Use `AnimatePresence` for exit animations

### Error Handling

- Use `alert()` for user-facing error messages (as per existing patterns)
- Use `console.error` sparingly for debugging
- Validate function parameters at entry points
- Handle edge cases explicitly (empty arrays, undefined values)

### CSS/Styling

- Use CSS variables for theming (see `index.css`)
- Use className composition over inline styles
- Keep styles in separate `.css` files (not CSS-in-JS)
- Follow existing naming: BEM-like with dashes (e.g., `card-container`, `selected`)

### ESLint Rules

The project uses:
- `@eslint/js` (recommended)
- `typescript-eslint` (recommended)
- `eslint-plugin-react-hooks` (recommended)
- `eslint-plugin-react-refresh`

Key enforced rules:
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `strict`: true
- `noFallthroughCasesInSwitch`: true

## Project Structure

```
src/
├── App.tsx           # Main game component
├── main.tsx          # Entry point
├── App.css           # Component styles
├── index.css         # Global styles & CSS variables
└── logic/
    ├── GameModel.ts  # Game logic, types, state management
    └── translations.ts # i18n strings
```

## Common Operations

### Adding a new game feature
1. Add types to `GameModel.ts` if needed
2. Add logic functions to `GameModel.ts`
3. Import and use in `App.tsx`
4. Add CSS to `App.css`

### Adding translations
1. Edit `translations.ts`
2. Add keys to both `zh` and `en` objects

### Modifying card visuals
- CSS classes: `card-container`, `card-inner`, `card-front`, `card-back`
- Colors: use CSS variables from `index.css`

## Notes for Agents

- This is a small project - avoid over-engineering
- No tests exist - verify changes manually with `npm run dev`
- Linting is strict - run `npm run lint` before committing
- Build must pass: `npm run build` must succeed
