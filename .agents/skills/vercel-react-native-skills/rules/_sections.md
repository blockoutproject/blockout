# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Core Rendering (rendering)

**Impact:** CRITICAL<br>
**Description:** Fundamental React Native rendering rules. Violations cause
runtime crashes or broken UI.

## 2. List Performance (list-performance)

**Impact:** HIGH<br>
**Description:** Optimizing virtualized lists (FlatList, LegendList, FlashList)
for smooth scrolling and fast updates.

## 3. Animation (animation)

**Impact:** HIGH<br>
**Description:** GPU-accelerated animations, Reanimated patterns, and avoiding
render thrashing during gestures.

## 4. Scroll Performance (scroll)

**Impact:** HIGH<br>
**Description:** Tracking scroll position without causing render thrashing.

## 5. Navigation (navigation)

**Impact:** HIGH<br>
**Description:** Using native navigators for stack and tab navigation instead of
JS-based alternatives.

## 6. React State (react-state)

**Impact:** MEDIUM<br>
**Description:** Patterns for managing React state to avoid stale closures and
unnecessary re-renders.

## 7. State Architecture (state)

**Impact:** MEDIUM<br>
**Description:** Ground truth principles for state variables and derived values.

## 8. React Compiler (react-compiler)

**Impact:** MEDIUM<br>
**Description:** Compatibility patterns for React Compiler with React Native and
Reanimated.

## 9. User Interface (ui)

**Impact:** MEDIUM<br>
**Description:** Native UI patterns for images, menus, modals, styling, and
platform-consistent interfaces.

## 10. Design System (design-system)

**Impact:** MEDIUM<br>
**Description:** Architecture patterns for building maintainable component
libraries.

## 11. Monorepo (monorepo)

**Impact:** LOW<br>
**Description:** Dependency management and native module configuration in
monorepos.

## 12. Third-Party Dependencies (imports)

**Impact:** LOW<br>
**Description:** Wrapping and re-exporting third-party dependencies for
maintainability.

## 13. JavaScript (js)

**Impact:** LOW<br>
**Description:** Micro-optimizations like hoisting expensive object creation.

## 14. Fonts (fonts)

**Impact:** LOW<br>
**Description:** Native font loading for improved performance.
