import { hiddenScrollIndicators } from "../native/scroll-indicators";
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
  useSafeAreaInsets,
  type EdgeRecord,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import {
  BottomContentInsetContext,
  BottomContentSpacer,
  useBottomContentInset,
} from "./bottom-content-inset";

/** The route composes its header and content; native bottom clearance belongs inside the scrolling content. */
export interface PageProps extends PropsWithChildren {
  edges?: SafeAreaViewProps["edges"];
  /** A native modal covers the tab capsule and keeps its own complete safe-area reservation. */
  accessibilityViewIsModal?: boolean;
}

/** Keeps scrolling viewports full height; pages publish bottom clearance, and modals replace the covered tab reservation. */
export function Page({ children, edges, accessibilityViewIsModal }: PageProps) {
  const { colors } = useTheme();
  const bottomContentInset = useBottomContentInset();
  const safeArea = useSafeAreaInsets();
  const activeEdges: EdgeRecord = Array.isArray(edges)
    ? Object.fromEntries(edges.map((edge) => [edge, "additive" as const]))
    : ((edges as EdgeRecord | undefined) ?? {
        top: "additive",
        right: "additive",
        bottom: "additive",
        left: "additive",
      });
  const ownsTop = !!activeEdges.top && activeEdges.top !== "off";
  const ownsBottom = !!activeEdges.bottom && activeEdges.bottom !== "off";
  // The measured capsule already includes the system inset; reserve one clearance, never their sum.
  const inset = Math.max(
    accessibilityViewIsModal ? 0 : bottomContentInset,
    ownsBottom ? safeArea.bottom : 0,
  );
  return (
    <SafeAreaView
      edges={{
        ...activeEdges,
        top: ownsTop ? "maximum" : "off",
        bottom: "off",
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
      <BottomContentInsetContext value={inset}>
        {children}
      </BottomContentInsetContext>
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

/** Keeps native scroll APIs and refresh; trailing content clears the page’s native or floating-navigation inset. */
export function PageScrollView({
  children,
  contentContainerStyle,
  ...props
}: PageScrollViewProps) {
  return (
    <Animated.ScrollView
      alwaysBounceVertical={!!props.refreshControl}
      {...props}
      {...hiddenScrollIndicators}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
      <BottomContentSpacer />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  sections: { gap: tokens.spacing.lg },
  scrollContent: { flexGrow: 1 },
});
