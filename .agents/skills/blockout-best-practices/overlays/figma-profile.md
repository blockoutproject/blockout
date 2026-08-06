# Blockout Figma Profile

This overlay supplies repository-specific design values to the portable Figma and mobile policies.

- Canonical file: [`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb)
- Design-system authority: `docs/architecture/blockout-mobile-design-system-v1.md`
- Visual source and comparison platform: iOS simulator
- Supported runtime platforms: iOS and Android
- Product identity: current dark Blockout visual direction
- Runtime UI font: Outfit variable
- Portable font fallback for reusable Figma masters: matching Inter weight
- Icon library: `@expo/vector-icons` `15.0.3`, using the Material Community Icons and Ionicons families evidenced by
  the mobile source
- Canonical mobile viewport: a `393 × 852` iOS application frame inside its `393 × 876` status-bar reference
- Orientation and foundations pages: `000 - Cover`, `100 - Foundations`, and `150 - Icons`
- Component category bands: `210-219` actions, `220-229` status and badges, `230-239` inputs, `240-249`
  navigation, `250-259` feedback, `260-269` data display, `270-279` overlays, and `280-289` structure
- Pattern category band: `300-399`, created only when an evidenced reusable product pattern exists
- Lifecycle pages: `400 - Exploration`, `500 - In Design`, `600 - Ready for Development`, and `700 - Shipped`
- Divider pages: unnumbered `---` pages may separate foundations, reusable assets, and lifecycle pages

Only the canonical file may receive repository design mutations. Runtime behavior, contracts, permissions,
accessibility, and data remain owned by their repository sources.
