import {
  PageViewport,
  NavigationScrollMarker,
  useNavigationInset,
  NavigationSafeAreaContext,
  NavigationScrollOffsetContext,
} from "./navigation-backdrop";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import {
  cloneElement,
  createContext,
  useContext,
  useImperativeHandle,
  type PropsWithChildren,
  type Ref,
  type ReactNode,
} from "react";
import { TabScrollView } from "react-native-collapsible-tab";
import { PagedTabContext } from "./paged-tab-context";
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
  canvasTint,
  fullBleed = false,
}: Readonly<PageProps>) {
  const { colors } = useTheme();
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
        <NavigationScrollOffsetContext value={null}>
          <PageCanvasBackingContext value={canvasBacking}>
            <BottomContentInsetContext value={inset}>
              {header ? (
                <PageViewport header={header} ownsStackScrollEdge>
                  {children}
                </PageViewport>
              ) : (
                children
              )}
            </BottomContentInsetContext>
          </PageCanvasBackingContext>
        </NavigationScrollOffsetContext>
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
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
  const offset = useContext(NavigationScrollOffsetContext);
  const scroll = useAnimatedRef<ScrollViewInstance>();
  // Observe native events without replacing the caller's onScroll or RNCT's adapter handler.
  useScrollOffset(!tab && offset ? scroll : null, offset ?? undefined);
  useImperativeHandle<ScrollViewInstance | null, ScrollViewInstance | null>(
    tab ? undefined : ref,
    () => scroll.current,
    [scroll],
  );
  const content = StyleSheet.flatten(contentContainerStyle);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  const refreshControl = props.refreshControl
    ? cloneElement(props.refreshControl, {
        progressViewOffset:
          props.refreshControl.props.progressViewOffset ??
          tab?.contentInset ??
          inset,
      })
    : undefined;
  if (tab) {
    return (
      <TabScrollView
        {...props}
        ref={ref}
        {...hiddenScrollIndicators}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        refreshControl={refreshControl}
      >
        {children}
        <BottomContentSpacer />
      </TabScrollView>
    );
  }
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
          {
            paddingTop: inset + (typeof padding === "number" ? padding : 0),
          },
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
