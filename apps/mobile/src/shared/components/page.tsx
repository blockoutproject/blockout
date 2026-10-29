import type { PropsWithChildren, Ref } from "react";
import {
  StyleSheet,
  View,
  type ScrollViewInstance,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  type EdgeRecord,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import {
  BottomNavigationInsetContext,
  BottomNavigationSpacer,
  useBottomNavigationInset,
} from "./bottom-navigation-inset";

/** The route composes its header and content; floating navigation owns the ordinary bottom inset. */
export interface PageProps extends PropsWithChildren {
  edges?: SafeAreaViewProps["edges"];
  /** A native modal covers the tab capsule and keeps its own complete safe-area reservation. */
  accessibilityViewIsModal?: boolean;
}

/** Applies one safe-area boundary with a minimum top clearance; modals clear the covered tab reservation. */
export function Page({ children, edges, accessibilityViewIsModal }: PageProps) {
  const { colors } = useTheme();
  const bottomNavigationInset = useBottomNavigationInset();
  const inset = accessibilityViewIsModal ? 0 : bottomNavigationInset;
  const activeEdges: EdgeRecord = Array.isArray(edges)
    ? Object.fromEntries(edges.map((edge) => [edge, "additive" as const]))
    : ((edges as EdgeRecord | undefined) ?? {
        top: "additive",
        right: "additive",
        bottom: "additive",
        left: "additive",
      });
  const ownsTop = !!activeEdges.top && activeEdges.top !== "off";
  return (
    <SafeAreaView
      edges={{
        ...activeEdges,
        top: ownsTop ? "maximum" : "off",
        bottom: inset > 0 ? "off" : activeEdges.bottom,
      }}
      accessibilityViewIsModal={accessibilityViewIsModal}
      style={[
        styles.page,
        {
          backgroundColor: colors.canvas,
          paddingTop: ownsTop ? tokens.spacing.sm : 0,
        },
      ]}
    >
      <BottomNavigationInsetContext value={inset}>
        {children}
      </BottomNavigationInsetContext>
    </SafeAreaView>
  );
}

/** One inset definition serves bounded sections and native scrolling content. */
const pageInsets = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.layout.content.start,
    paddingBottom: tokens.layout.content.end,
  },
}).content;

/** Native virtualized lists own growing content with the shared page insets. */
export const pageContentStyle = StyleSheet.create({
  content: { ...pageInsets, flexGrow: 1 },
}).content;

/** Bounded sections share page insets and spacing without owning scrolling, data or feedback. */
export function PageContent({ style, ...props }: ViewProps) {
  return <View {...props} style={[pageInsets, styles.sections, style]} />;
}

/** Native scrolling with a growing useful area; callers compose content or ScreenState explicitly. */
export interface PageScrollViewProps extends ScrollViewProps {
  ref?: Ref<ScrollViewInstance>;
}

/** Keeps native scroll APIs and refresh; trailing native content clears a measured floating tab bar. */
export function PageScrollView({
  children,
  contentContainerStyle,
  ...props
}: PageScrollViewProps) {
  return (
    <Animated.ScrollView
      alwaysBounceVertical={!!props.refreshControl}
      {...props}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
      <BottomNavigationSpacer />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  sections: { gap: tokens.spacing.lg },
  scrollContent: { flexGrow: 1 },
});
