import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { View, type LayoutChangeEvent, type ViewProps } from "react-native";
import { useBottomContentInset } from "./bottom-content-inset";
import {
  ContentRevealBlock,
  useContentReveal,
  type ContentRevealOptions,
} from "./content-reveal";
import { PageContent } from "./page";

/** Samples the mounted sections against the first usable scroll viewport. */
export function useSectionContentReveal(
  ready: boolean,
  options?: ContentRevealOptions,
) {
  const reveal = useContentReveal(options);
  const { start } = reveal;
  const bottomInset = useBottomContentInset();
  const viewportHeight = useRef(0);
  const contentTop = useRef<number | null>(null);
  const positions = useRef(new Map<string, number>());
  const measured = useRef(false);
  const frame = useRef<number | null>(null);

  const present = useCallback(() => {
    if (!ready || measured.current || frame.current !== null) {
      return;
    }
    // Sample after the sibling layout events reported for the current native frame.
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (contentTop.current === null || !viewportHeight.current) {
        return;
      }
      const contentBottom =
        viewportHeight.current - bottomInset - contentTop.current;
      const visible = [...positions.current]
        .filter(([, top]) => top < contentBottom)
        .sort(([, first], [, second]) => first - second)
        .map(([key]) => key);
      if (positions.current.size && start(visible)) {
        measured.current = true;
        positions.current.clear();
      }
    });
  }, [bottomInset, ready, start]);

  useEffect(() => {
    present();
    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [present]);

  return {
    reveal,
    onViewportLayout(event: LayoutChangeEvent) {
      viewportHeight.current = event.nativeEvent.layout.height;
      present();
    },
    onContentLayout(event: LayoutChangeEvent) {
      contentTop.current = event.nativeEvent.layout.y;
      present();
    },
    onSectionLayout(sectionKey: string, event: LayoutChangeEvent) {
      if (!measured.current) {
        positions.current.set(sectionKey, event.nativeEvent.layout.y);
        present();
      }
    },
  };
}

type SectionReveal = ReturnType<typeof useSectionContentReveal>;
const SectionRevealContext = createContext<SectionReveal | undefined>(
  undefined,
);

/** Keeps page geometry while its direct sections report their native positions. */
export function SectionContentReveal({
  reveal,
  ...props
}: Readonly<Omit<ViewProps, "onLayout"> & { reveal: SectionReveal }>) {
  return (
    <SectionRevealContext value={reveal}>
      <PageContent {...props} onLayout={reveal.onContentLayout} />
    </SectionRevealContext>
  );
}

/** Measures and reveals the existing section surface as one block. */
export function RevealSection({
  sectionKey,
  ...props
}: Readonly<Omit<ViewProps, "onLayout"> & { sectionKey: string }>) {
  const sections = useContext(SectionRevealContext);
  return sections ? (
    <ContentRevealBlock
      {...props}
      reveal={sections.reveal}
      blockKey={sectionKey}
      onLayout={(event) => sections.onSectionLayout(sectionKey, event)}
    />
  ) : (
    <View {...props} />
  );
}
