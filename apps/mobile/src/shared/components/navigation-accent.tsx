import { useRoute } from "expo-router";
import { useNavigationState } from "expo-router/react-navigation";
import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { solidForeground } from "@/shared/theme/solid-foreground";
import type { TabSelection } from "./tabs";

export interface NavigationAccentSelection extends TabSelection {
  routeKey: string;
}

type AccentScope = {
  selectedRouteKey?: string;
  setAccent: Dispatch<SetStateAction<NavigationAccentSelection | undefined>>;
};

export const NavigationAccentContext = createContext<AccentScope | undefined>(
  undefined,
);

/** The tab's selected screen stays selected when an outer presentation takes focus. */
export function useSelectedTabRouteKey() {
  const tabs = useRoute();
  return useNavigationState((state) => {
    const tab = state.routes.find((candidate) => candidate.key === tabs.key);
    let nested = tab?.state;
    let key = tab?.key;
    while (nested?.index !== undefined) {
      const route = nested.routes[nested.index];
      key = route?.key;
      nested = route?.state;
    }
    return key;
  });
}

/** An admitted screen lends its paint to the capsule only as the selected tab destination. */
export function NavigationAccent({ color }: Readonly<{ color?: string }>) {
  const scope = useContext(NavigationAccentContext);
  return color && scope ? <RouteAccent color={color} {...scope} /> : null;
}

function RouteAccent({
  color,
  selectedRouteKey,
  setAccent,
}: Readonly<AccentScope & { color: string }>) {
  const { key } = useRoute();
  useEffect(() => {
    if (key !== selectedRouteKey) {
      return;
    }
    const selection = {
      routeKey: key,
      fill: color,
      content: solidForeground(color),
    };
    setAccent(selection);
    return () => {
      setAccent((current) => (current === selection ? undefined : current));
    };
  }, [color, key, selectedRouteKey, setAccent]);
  return null;
}
