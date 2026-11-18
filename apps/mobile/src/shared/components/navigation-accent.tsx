import { useFocusEffect } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import { solidForeground } from "@/shared/theme/solid-foreground";
import type { TabSelection } from "./tabs";

type SetAccent = Dispatch<SetStateAction<TabSelection | undefined>>;

export const NavigationAccentContext = createContext<SetAccent | undefined>(
  undefined,
);

/** An admitted screen lends its paint to the existing capsule only while it has Router focus. */
export function NavigationAccent({ color }: Readonly<{ color?: string }>) {
  const setAccent = useContext(NavigationAccentContext);
  return color && setAccent ? (
    <FocusedAccent color={color} setAccent={setAccent} />
  ) : null;
}

function FocusedAccent({
  color,
  setAccent,
}: Readonly<{ color: string; setAccent: SetAccent }>) {
  useFocusEffect(
    useCallback(() => {
      const selection = { fill: color, content: solidForeground(color) };
      setAccent(selection);
      return () => {
        // A retained route can blur after its successor has supplied its paint.
        setAccent((current) => (current === selection ? undefined : current));
      };
    }, [color, setAccent]),
  );
  return null;
}
