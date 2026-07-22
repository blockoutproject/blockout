# REF-063 Figma Component Library

## Canonical library

The [`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) file now contains the first
bounded Blockout mobile component library on `20 - Components`. The library implements only the repeated families
proven by REF-061. Feature screens, business commands, request state, validation, navigation ownership, and domain copy
remain outside these components.

## Component scope

The library contains nine component sets:

| Component set     | Variants | Public properties                                     | Responsibility                                                                     |
| ----------------- | -------: | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Action`          |        9 | label, style, state                                   | Primary, secondary, and destructive actions, including disabled and loading states |
| `Chip`            |        9 | label, indicator, size, state                         | Filters, compact labels, and status pills                                          |
| `Field`           |        8 | label, value, helper, helper visibility, type, state  | Shared input and select anatomy                                                    |
| `Card`            |        4 | title, subtitle, meta, type, state                    | Entity summaries and form-group surfaces                                           |
| `Feedback`        |        4 | title, message, action label, action visibility, type | Loading, empty, no-result, and recoverable error views                             |
| `Entity Row`      |        3 | title, subtitle, meta, avatar visibility, state       | Repeated list and selector rows, including a real skeleton state                   |
| `Navigation Item` |        4 | label, type, state                                    | Bottom navigation and segmented tabs                                               |
| `Screen Header`   |        3 | title, trailing-action visibility, type               | Back, close, and plain mobile headers                                              |
| `Sheet`           |        4 | title, message, handle visibility, type, state        | Form and confirmation bottom sheets                                                |

`Sheet` composes the existing `Field` and `Action` masters rather than duplicating their visuals. Navigation exposes
icon slots but does not invent an icon library. No generic domain component, desktop variant, theme switch, detached
copy, or speculative boolean matrix was added.

## Design rules

Every family uses Auto Layout and the semantic variables established by REF-062. Finite visual choices use bounded
variant axes; user copy and optional anatomy use component properties. Interactive controls retain the 44-point minimum
target where applicable. The dark palette, current Blockout gradients, and representative Inter typography remain
consistent with the foundation record and do not change the native runtime font ownership.

## Validation

Each component was inspected immediately after creation. The complete page audit reports:

- 9 component sets and 48 component variants;
- zero unfinished placeholder;
- zero unnamed generic node;
- zero duplicate component-set name;
- a complete documentation root of 1,440 by 5,605 pixels without clipped sections.

Visual review caught and corrected a default Figma frame fill inside `Entity Row` and prevented loading metadata from
leaking into its skeleton. The final page capture confirms readable variants, explicit disabled/loading states, and a
consistent mobile hierarchy.

Temporary review captures remain outside Git. REF-063 changes no Expo source, API contract, generated artifact,
provider configuration, deployment, or production state. Screen composition remains owned by REF-064.
