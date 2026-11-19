import {
  PageViewport,
  NavigationScrollMarker,
  NavigationSafeAreaContext,
} from "./navigation-backdrop";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useNativeSplashLayout } from "@/shared/native/native-splash-handoff";
import {
  createContext,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  type PropsWithChildren,
  type Ref,
  type ReactNode,
} from "react";
import { PageScrollContext, usePageScrollBinding } from "./page-scroll-binding";
import {
  StyleSheet,
  View,
  type ScrollViewInstance,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedRef,
  useScrollOffset,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
  type EdgeRecord,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  BottomContentInsetContext,
  BottomContentSpacer,
  useBottomContentInset,
} from "./bottom-content-inset";

const PageCanvasBackingContext = createContext<string | undefined>(undefined);

/** Gives sticky content an opaque color close to the canvas behind the leading rail. */
export function usePageCanvasBacking() {
  const { colors } = useTheme();
  return useContext(PageCanvasBackingContext) ?? colors.canvas;
}

/** The route composes its header and content; native bottom clearance belongs inside the scrolling content. */
export interface PageProps extends PropsWithChildren {
  edges?: SafeAreaViewProps["edges"];
  /** Pinned shared chrome overlays the scrolling viewport. */
  header?: ReactNode;
  /** Initial height of the pinned chrome before its native layout is reported. */
  headerMinHeight?: number;
  /** Validated six-digit hex accent blended into the page canvas. */
  canvasTint?: string;
  /** The child composition supplies its own header and consumes the shared top safe area. */
  fullBleed?: boolean;
  /** A native modal covers the tab capsule and keeps its own complete safe-area reservation. */
  accessibilityViewIsModal?: boolean;
}

/** Keeps scrolling viewports full height; pages publish bottom clearance, and modals replace the covered tab reservation. */
export function Page({
  children,
  edges,
  accessibilityViewIsModal,
  header,
  headerMinHeight,
  canvasTint,
  fullBleed = false,
}: Readonly<PageProps>) {
  const { colors } = useTheme();
  const onLayout = useNativeSplashLayout();
  const highlight = canvasTint ?? colors.canvasHighlight;
  const startTint = canvasTint
    ? colors.canvasTintStart
    : colors.canvasHighlightStart;
  const endTint = canvasTint ? colors.canvasTintEnd : colors.canvasHighlightEnd;
  const mixCanvas = (tint: number) =>
    interpolateColor(tint, [0, 1], [colors.canvas, highlight], "RGB", {
      gamma: 1,
    });
  const canvasStart = mixCanvas(startTint);
  const canvasEnd = mixCanvas(endTint);
  // Sticky dates need a solid fill. Sample the gradient near the leading rail.
  const canvasBacking = mixCanvas(startTint + (endTint - startTint) / 3);
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
  const overlay = !!header || fullBleed;
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
        top: ownsTop && !overlay ? "maximum" : "off",
        bottom: "off",
      }}
      accessibilityViewIsModal={accessibilityViewIsModal}
      onLayout={onLayout}
      style={[
        styles.page,
        {
          backgroundColor: canvasStart,
          backgroundImage: `linear-gradient(to bottom right, ${canvasStart}, ${canvasEnd})`,
          paddingTop: ownsTop && !overlay ? tokens.spacing.sm : 0,
        },
      ]}
    >
      <NavigationSafeAreaContext
        value={
          ownsTop && overlay ? Math.max(safeArea.top, tokens.spacing.sm) : 0
        }
      >
        <PageScrollContext value={null}>
          <PageCanvasBackingContext value={canvasBacking}>
            <BottomContentInsetContext value={inset}>
              {header ? (
                <PageViewport header={header} headerMinHeight={headerMinHeight}>
                  {children}
                </PageViewport>
              ) : (
                children
              )}
            </BottomContentInsetContext>
          </PageCanvasBackingContext>
        </PageScrollContext>
      </NavigationSafeAreaContext>
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
  ref,
  ...props
}: Readonly<PageScrollViewProps>) {
  const { offset, clearance, refreshControl } = usePageScrollBinding(
    contentContainerStyle,
    props.refreshControl,
  );
  const scroll = useAnimatedRef<ScrollViewInstance>();
  useScrollOffset(offset ? scroll : null, offset ?? undefined);
  const initialOffset = props.contentOffset?.y ?? 0;
  // A feedback view can replace a scrolled list before emitting a native scroll event.
  useLayoutEffect(() => {
    offset?.set(initialOffset);
  }, [offset, initialOffset]);
  useImperativeHandle<ScrollViewInstance | null, ScrollViewInstance | null>(
    ref,
    () => scroll.current,
    [scroll],
  );
  return (
    <NavigationScrollMarker>
      <Animated.ScrollView
        alwaysBounceVertical={!!props.refreshControl}
        {...props}
        ref={scroll}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        refreshControl={refreshControl}
        {...hiddenScrollIndicators}
        contentContainerStyle={[
          styles.scrollContent,
          contentContainerStyle,
          clearance,
        ]}
      >
        {children}
        <BottomContentSpacer />
      </Animated.ScrollView>
    </NavigationScrollMarker>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  sections: { gap: tokens.spacing.lg },
  scrollContent: { flexGrow: 1 },
});
