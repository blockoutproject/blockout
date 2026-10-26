import type { PropsWithChildren, Ref } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
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

/** Shared useful-area insets, also consumed directly by native virtualized lists. */
export const pageContentStyle = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.layout.content.start,
    paddingBottom: tokens.layout.content.end,
  },
}).content;

/** Bounded sections share page insets and spacing without owning scrolling, data or feedback. */
export function PageContent({ style, ...props }: ViewProps) {
  return <View {...props} style={[pageContentStyle, styles.sections, style]} />;
}

/** Native scrolling with a growing useful area; callers compose content or ScreenState explicitly. */
export interface PageScrollViewProps extends ScrollViewProps {
  ref?: Ref<ScrollViewInstance>;
}

/** Keeps native scroll APIs and refresh controls intact while allowing short states to fill the page. */
export function PageScrollView({
  contentContainerStyle,
  ...props
}: PageScrollViewProps) {
  return (
    <ScrollView
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
