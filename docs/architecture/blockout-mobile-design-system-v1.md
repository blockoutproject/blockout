# Blockout Mobile Design System V1

This document records the durable relationship between canonical Figma assets and the Expo implementation. It replaces
task-specific visual certification records; those records remain available through their issues and pull requests.

## Authority

- One canonical Blockout Figma file owns accepted visual composition, variables, components, and screen states.
- Repository tokens and components own runtime implementation.
- The Figma policy governs every read, comparison, decision, or mutation involving the canonical file.
- A task may change design or implementation only within the designated issue scope and exact Figma nodes.

## Foundations

- Color, typography, spacing, radius, elevation, and icon usage use semantic roles rather than screen-specific values.
- Platform-native behavior and safe-area constraints remain visible in component design.
- Repeated adjacent values converge only when they express the same semantic role.
- A design token is not introduced merely to rename a single literal.

## Components

- Shared components represent stable semantic roles with demonstrated consumers.
- Feature-specific content, copy, commands, and data ownership remain in the feature.
- Variants express real semantic or behavioral differences.
- Component APIs favor composition and concrete React Native props over boolean proliferation or configuration-driven
  screen frameworks.
- Accessibility state, loading, empty, error, disabled, and destructive behavior are part of the component contract.

## Screen Composition

- Expo Router and feature modules own runtime screen composition.
- Figma screens preserve representative states without becoming a second routing or business specification.
- Visual validation compares the current runtime state against the exact canonical frame and records deviations in the
  owning issue.
- Screen delivery evidence, simulator state, screenshots, and task-level certification do not become permanent
  documentation.

## Evolution

Change this model only when the durable design-system boundary changes. Put detailed visual evidence and completion
trace in GitHub, and keep canonical visual values in Figma and implementation tokens rather than duplicating them here.
