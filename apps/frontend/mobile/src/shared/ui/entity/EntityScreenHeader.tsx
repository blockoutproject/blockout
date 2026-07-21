import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/shared/theme/tokens";

export type EntityScreenHeaderProps = {
  title?: string;
  onOpenReport: () => void;
  onEdit?: () => void;
  testID: string;
  backActionTestID: string;
  editActionTestID: string;
  reportActionTestID: string;
};

const actionHitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

const EntityScreenHeader = ({
  title,
  onOpenReport,
  onEdit,
  testID,
  backActionTestID,
  editActionTestID,
  reportActionTestID,
}: EntityScreenHeaderProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ paddingTop: insets.top }} testID={testID}>
      <View style={styles.header}>
        <View style={styles.leftGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={router.back}
            style={({ pressed }) => [
              styles.backAction,
              pressed ? styles.pressed : undefined,
            ]}
            hitSlop={actionHitSlop}
            testID={backActionTestID}
          >
            <Ionicons
              name="chevron-back-outline"
              size={28}
              color={theme.text}
            />
          </Pressable>

          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.text }]}
            adjustsFontSizeToFit
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="highQuality"
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>

        <View style={styles.rightGroup}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Modifier"
              onPress={onEdit}
              style={({ pressed }) => (pressed ? styles.pressed : undefined)}
              hitSlop={actionHitSlop}
              testID={editActionTestID}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={28}
                color={theme.text}
              />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Signaler un problème"
            onPress={onOpenReport}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            hitSlop={actionHitSlop}
            testID={reportActionTestID}
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={28}
              color={theme.text}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default EntityScreenHeader;

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: 12,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flexGrow: 1,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backAction: { marginRight: 4 },
  pressed: { opacity: 0.7 },
  title: {
    fontSize: 15,
    fontWeight: "900",
    flexShrink: 1,
  },
});
