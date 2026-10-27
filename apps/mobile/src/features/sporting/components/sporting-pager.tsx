import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from "react-native";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";

/** Native resource-tab paging; owner panels mount lazily and stay mounted until the page closes. */
export interface SportingPagerProps {
  selected: string;
  panels: readonly { id: string; content: ReactNode }[];
  onSelect: (id: string) => void;
}

/** Keeps all adjacent resource tabs in one native pager without owning their data or scroll state. */
export function SportingPager({
  selected,
  panels,
  onSelect,
}: SportingPagerProps) {
  const [visited, setVisited] = useState([selected]);
  const pager = useRef<ScrollViewInstance>(null);
  const dimensions = useWindowDimensions();
  const [width, setWidth] = useState(dimensions.width);
  const reducedMotion = useReducedMotion();
  const index = Math.max(
    0,
    panels.findIndex((panel) => panel.id === selected),
  );
  useEffect(() => {
    pager.current?.scrollTo({ x: index * width, animated: !reducedMotion });
  }, [index, width, reducedMotion]);
  if (!visited.includes(selected)) setVisited([...visited, selected]);
  return (
    <View
      style={styles.visible}
      onLayout={(event) => {
        if (event.nativeEvent.layout.width > 0)
          setWidth(event.nativeEvent.layout.width);
      }}
    >
      <ScrollView
        ref={pager}
        style={styles.visible}
        testID="sporting-tabs-pager"
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const next =
            panels[
              Math.round(
                event.nativeEvent.contentOffset.x /
                  event.nativeEvent.layoutMeasurement.width,
              )
            ];
          if (next) onSelect(next.id);
        }}
      >
        {panels.map((panel) => (
          <View
            key={panel.id}
            style={[styles.panel, { width }]}
            accessibilityElementsHidden={selected !== panel.id}
            importantForAccessibility={
              selected === panel.id ? "auto" : "no-hide-descendants"
            }
          >
            {visited.includes(panel.id) && panel.content}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  visible: { flex: 1 },
  panel: { height: "100%", flexShrink: 0 },
});
