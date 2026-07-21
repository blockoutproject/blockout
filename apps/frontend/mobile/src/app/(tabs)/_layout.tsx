import React from "react";
import {Tabs} from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {Image} from "expo-image";
import {StyleSheet} from "react-native";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useSession} from "@/src/shared/providers/SessionProvider";
import {TABBAR_ICON_SIZE} from "@/src/shared/theme/globals";
import TabBar from "@/src/shared/ui/navigation/TabBar";
import {withAlpha} from "@/src/utils/utils";

export default function TabLayout() {
  const theme = useAppTheme();
  const {customUser, isGuest, isAuthenticated} = useSession();

  const avatarSource =
    customUser?.pictureUrl
      ? {uri: customUser.pictureUrl}
      : require("@/assets/users/default_user_avatar.png");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textInactive,
      }}
      tabBar={(props) => (
        <TabBar
          {...props}
          activeColor={theme.text}
          inactiveColor={theme.textInactive}
          backgroundColorAndroid={withAlpha(theme.background, 0.92)}
          blurTintIOS="dark"
        />
      )}
    >
      <Tabs.Protected guard={isAuthenticated}>
        <Tabs.Screen
          name="(feed)"
          options={{
            href: isGuest ? null : undefined,
            tabBarIcon: ({color, focused}) => (
              <MaterialCommunityIcons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={TABBAR_ICON_SIZE}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="(search)"
        options={{
          tabBarIcon: ({color}) => (
            <MaterialCommunityIcons name="magnify" color={color} size={TABBAR_ICON_SIZE}/>
          ),
        }}
      />

      <Tabs.Protected guard={isAuthenticated}>
        <Tabs.Screen
          name="(notifications)"
          options={{
            href: isGuest ? null : undefined,
            tabBarIcon: ({color, focused}) => (
              <MaterialCommunityIcons
                name={focused ? "whistle" : "whistle-outline"}
                color={color}
                size={TABBAR_ICON_SIZE}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({focused}) => (
            <Image
              style={[
                styles.avatar,
                {
                  height: TABBAR_ICON_SIZE,
                  width: TABBAR_ICON_SIZE,
                  opacity: focused ? 1 : 0.66,
                  transform: [{scale: focused ? 1 : 0.96}],
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
  avatar: {borderRadius: 100},
});
