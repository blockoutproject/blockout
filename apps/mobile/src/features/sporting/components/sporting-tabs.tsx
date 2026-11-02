import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  Container,
  Tab,
  TabScrollView,
  useCollapsingTabsContext,
  type CollapsingTabsRef,
} from "react-native-collapsible-tab";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import type {
  LegendListProps,
  LegendListRef,
} from "@legendapp/list/react-native";
import { LegendList } from "@legendapp/list/react-native";
import {
  PagedTabScene,
  type PagedTabsProps,
} from "../../../shared/components/paged-tabs";
import { Tabs } from "../../../shared/components/tabs";
import {
  PageScrollView,
  type PageScrollViewProps,
} from "../../../shared/components/page";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

const SportingCollapseContext = createContext(false);

/** Shared sporting identity collapses before the pinned choices; feature selection and data stay with callers. */
export interface SportingTabsProps extends Omit<
  PagedTabsProps,
  "renderTabBar"
> {
  identity: ReactNode;
}

/** Uses the library's native scroll adapters only for Team, Pool and Club, retaining first-visit admission. */
export function SportingTabs({
  tabs,
  selected,
  onSelect,
  header,
  identity,
}: SportingTabsProps) {
  const pager = useRef<CollapsingTabsRef>(null);
  const { colors } = useTheme();
  useEffect(() => {
    if (pager.current?.getFocusedTab() !== selected)
      pager.current?.jumpToTab(selected, false);
  }, [selected, tabs]);
  return (
    <View style={styles.fill}>
      {header}
      <SportingCollapseContext value>
        <Container
          ref={pager}
          initialTabName={selected}
          lazy={false}
          pagerProps={{
            testID: "native-tabs-pager",
            keyboardDismissMode: "on-drag",
          }}
          headerBackgroundColor={colors.canvas}
          renderHeader={() => identity}
          renderTabBar={() => (
            <View style={styles.rail}>
              <Tabs
                items={tabs}
                selected={selected}
                onSelect={(id) => pager.current?.jumpToTab(id, false)}
              />
            </View>
          )}
          onTabChange={({ tabName }) => onSelect(tabName)}
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} name={tab.id}>
              <PagedTabScene active={selected === tab.id}>
                {tab.content}
              </PagedTabScene>
            </Tab>
          ))}
        </Container>
      </SportingCollapseContext>
    </View>
  );
}

/** Bounded sporting content joins the shared identity only inside its sporting pager; other consumers stay ordinary. */
export function SportingScrollView({
  children,
  ...props
}: PageScrollViewProps) {
  const collapsing = useContext(SportingCollapseContext);
  if (!collapsing)
    return <PageScrollView {...props}>{children}</PageScrollView>;
  return (
    <CollapsingSportingScrollView {...props}>
      {children}
    </CollapsingSportingScrollView>
  );
}

/** Places the existing native refresh control below the library's measured identity and tab rail. */
function CollapsingSportingScrollView({
  children,
  refreshControl,
  ...props
}: PageScrollViewProps) {
  const { paddingTop } = useCollapsingTabsContext();
  return (
    <TabScrollView
      {...props}
      {...hiddenScrollIndicators}
      refreshControl={
        refreshControl
          ? cloneElement(refreshControl, {
              progressViewOffset:
                refreshControl.props.progressViewOffset ?? paddingTop,
            })
          : undefined
      }
    >
      {children}
      <BottomContentSpacer />
    </TabScrollView>
  );
}

/** Existing virtualized calendar/club lists use the library's public LegendList adapter in sporting pages only. */
export function SportingList<T>(
  props: LegendListProps<T> & { ref?: Ref<LegendListRef> },
) {
  const collapsing = useContext(SportingCollapseContext);
  return collapsing ? (
    <CollapsingSportingList {...props} />
  ) : (
    <LegendList {...props} />
  );
}

/** Keeps sticky calendar dates below the library's measured pinned rail, without changing ordinary list viewports. */
function CollapsingSportingList<T>(
  props: LegendListProps<T> & { ref?: Ref<LegendListRef> },
) {
  const { tabBarHeight } = useCollapsingTabsContext();
  return (
    <TabLegendList
      {...props}
      stickyHeaderConfig={
        props.stickyHeaderIndices?.length
          ? { ...props.stickyHeaderConfig, offset: tabBarHeight }
          : props.stickyHeaderConfig
      }
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  rail: { paddingHorizontal: tokens.spacing.screen },
});
