import { useContext, useState, type ReactNode, type Ref } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/theme/tokens";
import { AccessClubBand } from "./access-club-band";
import { BrandHeader } from "./brand-header";
import { NavigationSafeAreaContext } from "./navigation-backdrop";
import { Page } from "./page";
import { Surface } from "./surface";

interface AccessFrameProps {
  children: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
}

export function AccessFrame(props: Readonly<AccessFrameProps>) {
  return (
    <Page edges={["top", "left", "right"]} fullBleed>
      <AccessStage {...props} />
    </Page>
  );
}

/** The larger measured chrome and safe-area reservation applies at both ends, so the stage holds the viewport midpoint. */
function AccessStage({
  children,
  headerAction,
  footer,
}: Readonly<AccessFrameProps>) {
  const top = useContext(NavigationSafeAreaContext);
  const { bottom } = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(tokens.layout.header);
  const [footerHeight, setFooterHeight] = useState(tokens.size.control.default);
  const clearance = Math.max(
    top + Math.max(headerHeight, tokens.layout.accessHeaderClearance),
    bottom + (footer ? footerHeight : 0),
  );

  return (
    <View style={[styles.frame, { paddingVertical: clearance }]}>
      <View
        onLayout={({ nativeEvent }) =>
          setHeaderHeight(nativeEvent.layout.height)
        }
        style={[styles.chrome, { top }]}
      >
        <BrandHeader>{headerAction}</BrandHeader>
      </View>
      <View style={styles.stage}>
        <AccessClubBand />
        {children}
      </View>
      {footer && (
        <View
          onLayout={({ nativeEvent }) =>
            setFooterHeight(nativeEvent.layout.height)
          }
          style={[styles.chrome, { bottom }]}
        >
          {footer}
        </View>
      )}
    </View>
  );
}

interface AccessStageScrollViewProps extends Pick<
  ScrollViewProps,
  "refreshControl"
> {
  children: ReactNode;
  ref?: Ref<ScrollViewInstance>;
}

export function AccessStageCard({ style, ...props }: ViewProps) {
  return <Surface {...props} style={[styles.card, style]} />;
}

/** Centers bounded content when it fits and lets larger text scroll within the same fixed stage. */
export function AccessStageScrollView({
  children,
  ref,
  refreshControl,
}: Readonly<AccessStageScrollViewProps>) {
  return (
    <ScrollView
      ref={ref}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  chrome: { position: "absolute", left: 0, right: 0, zIndex: 1 },
  stage: { flex: 1, minHeight: 0, overflow: "hidden" },
  card: { width: "100%", maxWidth: 312 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing["2xl"],
    paddingVertical: tokens.spacing.md,
  },
});
