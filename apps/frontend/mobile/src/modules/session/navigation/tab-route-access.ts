type TabRouteAccessInput = {
  isAuthenticated: boolean;
  routeName: string;
};

const authenticatedTabRoutes = new Set(["(feed)", "(notifications)"]);

export const isTabRouteVisible = ({
  isAuthenticated,
  routeName,
}: TabRouteAccessInput): boolean =>
  isAuthenticated || !authenticatedTabRoutes.has(routeName);
