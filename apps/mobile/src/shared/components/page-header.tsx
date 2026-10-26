import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { IconButton } from "./icon-button";

/** Ordinary back navigation with an optional centered identity; direct entry returns home. */
export interface PageHeaderProps {
  title?: string;
}

/** UI Library Top Bar: equal control rails keep the title centered as native text grows. */
export function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.rail}>
        <IconButton
          label="Retour"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          <ChevronLeft
            accessible={false}
            color={colors.icon}
            size={tokens.size.actionIcon}
          />
        </IconButton>
      </View>
      {title ? (
        <Text
          accessibilityRole="header"
          accessibilityLabel={title}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}
      <View style={styles.rail} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control,
    paddingHorizontal: tokens.spacing.lg,
  },
  rail: { width: tokens.size.control, alignItems: "center" },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
});
