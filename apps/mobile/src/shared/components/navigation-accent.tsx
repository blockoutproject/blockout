import { useRoute } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { solidForeground } from "@/shared/theme/solid-foreground";

export interface NavigationAccentSelection {
  routeKey: string;
  fill: string;
  content: string;
}

type AccentScope = {
  selectedRouteKey?: string;
  setAccent: Dispatch<SetStateAction<NavigationAccentSelection | undefined>>;
};

export const NavigationAccentContext = createContext<AccentScope | undefined>(
  undefined,
);

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
