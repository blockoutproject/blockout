import { getCenteredPillX } from "@/src/shared/ui/navigation/tab-bar-position";

describe("tab bar indicator position", () => {
  it.each([
    [
      "guest",
      [
        { x: 12, width: 74 },
        { x: 251, width: 74 },
      ],
    ],
    [
      "authenticated",
      [
        { x: 12, width: 74 },
        { x: 92, width: 74 },
        { x: 171, width: 74 },
        { x: 251, width: 74 },
      ],
    ],
  ] as const)(
    "shares the selected icon center for every %s destination",
    (_session, itemLayouts) => {
      itemLayouts.forEach((itemLayout) => {
        const indicatorX = getCenteredPillX(itemLayout, 50);

        expect(indicatorX + 25).toBe(itemLayout.x + itemLayout.width / 2);
      });
    },
  );
});
