import React from "react";
import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import TabBar from "@/src/components/navigation/TabBar";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Image } from "expo-image";
import { useSession } from "@/src/context/SessionProvider";
import { withAlpha } from "@/src/utils/utils";

export default function TabLayout() {
    const theme = useAppTheme()
    const { customUser } = useSession();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}
            tabBar={(props) => (
                <TabBar
                    {...props}
                    activeColor={theme.text}
                    inactiveColor={theme.textInactive}
                    backgroundColorAndroid={ withAlpha(theme.background, 0.92) }
                    blurTintIOS="dark"
                />
            )}
        >
            <Tabs.Screen
                name="(feed)"
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons
                            name="home"
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="(search)"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons
                            name="magnify"
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="(notifications)"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons
                            name="whistle"
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Image style={[styles.avatar, { height: size, width: size }]} source={{ uri: customUser?.pictureUrl }} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    avatar: { borderRadius: 100 },
});