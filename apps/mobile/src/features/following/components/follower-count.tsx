import type { FollowingTarget } from "../api/following-keys";
import { StyleSheet, Text, View } from "react-native";
import { UsersRound } from "lucide-react-native";
import { hasReadError } from "@/shared/components/read-feedback";
import { LoadingIndicator } from "@/shared/components/loading-indicator";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useFollowerCountQuery } from "../api/use-follower-count-query";

/** Exact public target; private account and personal season are not count selectors. */
export interface FollowerCountProps {
  target: FollowingTarget;
}

/** Public count stays independent; a final failed read hides its retained number until an ordinary read succeeds. */
export function FollowerCount({ target }: Readonly<FollowerCountProps>) {
  const query = useFollowerCountQuery(target);
  const { colors } = useTheme();
  const count = query.data?.count;
  const failed = hasReadError(query);
  const initialLoading = !failed && query.isPending && query.isFetching;
  const unavailable = failed || count === undefined;
  let label = initialLoading
    ? "Chargement du nombre d’abonnés"
    : "Nombre d’abonnés indisponible";
  if (!unavailable) {
    const plural = count > 1 ? "s" : "";
    label = `${count.toLocaleString("fr-FR")} abonné${plural}`;
  }
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityState={{ busy: initialLoading }}
      style={styles.value}
    >
      <UsersRound
        accessible={false}
        size={tokens.size.icon.sm}
        color={colors.icon}
      />
      {initialLoading ? (
        <LoadingIndicator color={colors.icon} />
      ) : (
        <Text style={[tokens.typography.body, { color: colors.icon }]}>
          {unavailable ? "Indisponible" : count.toLocaleString("fr-FR")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  value: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.xs },
});
