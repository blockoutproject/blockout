import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import FastImage from "react-native-fast-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { TabBar, SceneRendererProps, NavigationState, Route } from "react-native-tab-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/src/context/ThemeProvider";

type HeaderProps = SceneRendererProps & {
    navigationState: NavigationState<Route>;
    onLayout: (height: number) => void;
};

const HomeHeader: React.FC<HeaderProps> = ({ onLayout, ...props }) => {
    const router = useRouter();
    const { user } = useAuth0();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    return (
        <View
            style={[styles.container, { paddingTop: insets.top }]}
            onLayout={(event) => {
                const height = event.nativeEvent.layout.height;
                onLayout(height);
            }}
        >
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={[theme.background, "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            </BlurView>

            <TabBar
                {...props}
                indicatorStyle={[styles.indicator, { backgroundColor: theme.text }]}
                tabStyle={styles.tabStyle}
                style={styles.tabBar}
                activeColor={theme.text}
                inactiveColor={theme.textInactive}
            />

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => router.navigate("/search")}>
                    <MaterialCommunityIcons name="magnify" size={25} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity>
                    <MaterialCommunityIcons name="whistle" size={25} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.navigate("/profile")}>
                    <FastImage style={styles.avatar} source={{ uri: user?.picture }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
    },
    tabBar: {
        backgroundColor: "transparent",
        flex: 1,
    },
    tabStyle: {
        width: "auto",
    },
    indicator: {
        width: 0.5,
        height: 3,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 10,
    },
    avatar: {
        height: 30,
        width: 30,
        borderRadius: 100,
    },
});

export default HomeHeader;