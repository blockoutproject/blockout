import { SplashScreen } from "expo-router";
import { NavigationContext } from "expo-router/react-navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { LayoutChangeEvent } from "react-native";

const ReleaseSplashContext = createContext<(() => void) | undefined>(undefined);

/** Shares one launch-only handoff across the navigator and its pre-authentication fallback. */
export function NativeSplashHandoff({ children }: Readonly<PropsWithChildren>) {
  const [pending, setPending] = useState(true);
  const release = useCallback(() => setPending(false), []);
  useEffect(() => {
    if (pending) {
      return;
    }
    // A calculated native layout can precede its first visible frame.
    const frame = requestAnimationFrame(SplashScreen.hide);
    return () => cancelAnimationFrame(frame);
  }, [pending]);
  return (
    <ReleaseSplashContext value={pending ? release : undefined}>
      {children}
    </ReleaseSplashContext>
  );
}

/** The cold-entry selector reveals its first real destination before page transitions begin. */
export function useNativeSplashPending(): boolean {
  return Boolean(use(ReleaseSplashContext));
}

/** An anchor behind a cold deep link may lay out first; its focus must also be current. */
export function useNativeSplashLayout() {
  const release = use(ReleaseSplashContext);
  const navigation = use(NavigationContext);
  const laidOut = useRef(false);
  useEffect(() => {
    if (!release || !navigation) {
      return;
    }
    const onFocus = () => {
      if (laidOut.current) {
        release();
      }
    };
    const unsubscribe = navigation.addListener("focus", onFocus);
    if (navigation.isFocused()) {
      onFocus();
    }
    return unsubscribe;
  }, [navigation, release]);

  if (!release) {
    return undefined;
  }
  return ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    laidOut.current = width > 0 && height > 0;
    if (laidOut.current && (navigation?.isFocused() ?? true)) {
      release();
    }
  };
}
