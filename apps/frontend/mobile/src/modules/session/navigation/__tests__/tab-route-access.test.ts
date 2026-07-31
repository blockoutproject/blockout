import { isTabRouteVisible } from "@/src/modules/session/navigation/tab-route-access";

describe("tab route access", () => {
  it.each(["(feed)", "(notifications)"])(
    "hides authenticated tab %s from guests",
    (routeName) => {
      expect(isTabRouteVisible({ isAuthenticated: false, routeName })).toBe(
        false,
      );
    },
  );

  it.each(["(search)", "profile"])(
    "keeps public tab %s visible to guests",
    (routeName) => {
      expect(isTabRouteVisible({ isAuthenticated: false, routeName })).toBe(
        true,
      );
    },
  );

  it.each(["(feed)", "(search)", "(notifications)", "profile"])(
    "keeps tab %s visible to authenticated sessions",
    (routeName) => {
      expect(isTabRouteVisible({ isAuthenticated: true, routeName })).toBe(
        true,
      );
    },
  );
});
