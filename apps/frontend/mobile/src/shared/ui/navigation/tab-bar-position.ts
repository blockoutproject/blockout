export type TabDestinationLayout = {
  x: number;
  width: number;
};

/** Returns the indicator origin that shares the destination icon's center. */
export const getCenteredPillX = (
  itemLayout: TabDestinationLayout,
  pillWidth: number,
): number => itemLayout.x + (itemLayout.width - pillWidth) / 2;
