import React from "react";
import { Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { iconSize } from "@/src/shared/theme";
import { useSessionState } from "@/src/modules/session/providers/SessionContext";

import TabBar from "@/src/shared/ui/navigation/tab-bar";

export default function TabLayout() {
  const { customUser, isGuest, isAuthenticated } = useSessionState();

  const avatarSource = customUser?.pictureUrl
    ? { uri: customUser.pictureUrl }
    : require("@/assets/users/default_user_avatar.png");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Protected guard={isAuthenticated}>
        <Tabs.Screen
          name="(feed)"
          options={{
            href: isGuest ? null : undefined,
            tabBarAccessibilityLabel: "Accueil",
            tabBarButtonTestID: "navigation-home-action",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={iconSize.navigation}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="(search)"
        options={{
          tabBarAccessibilityLabel: "Rechercher",
          tabBarButtonTestID: "navigation-search-action",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="magnify"
              color={color}
              size={iconSize.navigation}
            />
          ),
        }}
      />

      <Tabs.Protected guard={isAuthenticated}>
        <Tabs.Screen
          name="(notifications)"
          options={{
            href: isGuest ? null : undefined,
            tabBarAccessibilityLabel: "Suivis",
            tabBarButtonTestID: "navigation-followed-action",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "whistle" : "whistle-outline"}
                color={color}
                size={iconSize.navigation}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: "Profil",
          tabBarButtonTestID: "navigation-profile-action",
          tabBarIcon: ({ focused }) => (
            <Image
              style={[
                styles.avatar,
                {
                  height: iconSize.navigation,
                  width: iconSize.navigation,
                  opacity: focused ? 1 : 0.66,
                  transform: [{ scale: focused ? 1 : 0.96 }],
                },
              ]}
              source={avatarSource}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 100 },
});
