import React, {JSX, useCallback, useMemo, useState} from "react";
import {Animated, Platform, StyleSheet, View} from "react-native";
import {NavigationState, Route, SceneRendererProps, TabBar, TabView,} from "react-native-tab-view";
import {BlurView} from "expo-blur";
import * as Haptics from "expo-haptics";
import {LinearGradient} from "expo-linear-gradient";
import {layout, useAppTheme} from "@/src/shared/theme";

export type TabDefinition = {
  key: string;
  title: string;
  render: () => JSX.Element | null;
  /** Optionnel: placeholder affiché avant le premier rendu */
  renderPlaceholder?: () => JSX.Element | null;
};

export type GenericTabViewProps = {
  tabs: TabDefinition[];
  scrollYs: Record<string, Animated.Value>;
  /** Optionnel: permet au parent de savoir quel onglet est actif */
  onTabChange?: (key: string) => void;
};

const GenericTabView: React.FC<GenericTabViewProps> = ({tabs, scrollYs, onTabChange}) => {
  const theme = useAppTheme();
  const [index, setIndex] = useState(0);

  const routes = useMemo(
    () => tabs.map(({key, title}) => ({key, title})),
    [tabs]
  );

  const handleIndexChange = useCallback(
    (nextIndex: number) => {
      setIndex(nextIndex);
      onTabChange?.(routes[nextIndex]?.key);
    },
    [onTabChange, routes]
  );

  const renderScene = ({route}: SceneRendererProps & { route: Route }) => {
    const tabDef = tabs.find((t) => t.key === route.key);
    return tabDef ? tabDef.render() : null;
  };

  const renderLazyPlaceholder = ({route}: { route: Route }) => {
    const tabDef = tabs.find((t) => t.key === route.key);
    return tabDef?.renderPlaceholder ? tabDef.renderPlaceholder() : <View style={{flex: 1}}/>;
  };

  const renderTabBar = (
    props: SceneRendererProps & { navigationState: NavigationState<Route> }
  ) => {
    const {position} = props;

    const interpolatedOpacity = routes.reduce<Animated.AnimatedAddition<number>>(
      (acc, route, i) => {
        const pageWeight = position.interpolate({
          inputRange: routes.map((_, idx) => idx),
          outputRange: routes.map((_, idx) => (idx === i ? 1 : 0)),
          extrapolate: "clamp",
        });

        const vertical = scrollYs[route.key].interpolate({
          inputRange: [0, 40],
          outputRange: [0, 1],
          extrapolate: "clamp",
        });

        const contribution = Animated.multiply(pageWeight, vertical);
        return acc ? Animated.add(acc, contribution) : contribution;
      },
      new Animated.Value(0)
    );

    return (
      <View style={styles.container}>
        {Platform.OS === "ios" ? (
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[StyleSheet.absoluteFill, {opacity: interpolatedOpacity}]}>
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}/>
            </Animated.View>

            <LinearGradient
              colors={[theme.background, "transparent"]}
              start={{x: 0, y: 0.35}}
              end={{x: 0, y: 1}}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.tabBarContainer,
            {backgroundColor: Platform.OS === "android" ? theme.background : "transparent"},
          ]}
        >
          <TabBar
            {...props}
            onTabPress={Haptics.selectionAsync}
            scrollEnabled
            indicatorStyle={[styles.indicator, {backgroundColor: theme.text}]}
            tabStyle={styles.tabStyle}
            style={styles.tabBar}
            activeColor={theme.text}
            inactiveColor={theme.textInactive}
          />
        </View>
      </View>
    );
  };

  return (
    <TabView
      lazy
      lazyPreloadDistance={0}
      renderLazyPlaceholder={renderLazyPlaceholder}
      navigationState={{index, routes}}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={handleIndexChange}
      commonOptions={{labelStyle: styles.tabItem}}
    />
  );
};

export default GenericTabView;

const styles = StyleSheet.create({
  container: {position: "absolute", top: 0, left: 0, right: 0, zIndex: 10},
  tabBarContainer: {flexDirection: "row", alignItems: "center", justifyContent: "space-between"},
  tabBar: {flex: 1, height: layout.tabs, backgroundColor: "transparent"},
  tabStyle: {width: "auto", paddingHorizontal: 16},
  indicator: {height: layout.tabIndicator, width: 0.4},
  tabItem: {fontSize: 14, fontWeight: "700"},
});
