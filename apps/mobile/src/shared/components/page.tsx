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
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** The route composes its header and content; native insets remain owned by this page. */
export interface PageProps extends PropsWithChildren {
  edges?: SafeAreaViewProps["edges"];
  accessibilityViewIsModal?: boolean;
}

/** Applies the application canvas and one native safe-area boundary. */
export function Page({ children, edges, accessibilityViewIsModal }: PageProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      accessibilityViewIsModal={accessibilityViewIsModal}
      style={[styles.page, { backgroundColor: colors.canvas }]}
    >
      {children}
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

/** Keeps native scroll APIs, worklet handlers and refresh intact while short states fill the useful area. */
export function PageScrollView({
  contentContainerStyle,
  ...props
}: PageScrollViewProps) {
  return (
    <Animated.ScrollView
      alwaysBounceVertical
      {...props}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  sections: { gap: tokens.spacing.lg },
  scrollContent: { flexGrow: 1 },
});
