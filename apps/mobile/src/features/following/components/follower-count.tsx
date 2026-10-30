import type { FollowingTarget } from "../api/following-keys";
import { StyleSheet, Text, View } from "react-native";
import { UsersRound, RotateCcw } from "lucide-react-native";
import { IconButton } from "../../../shared/components/icon-button";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useFollowerCountQuery } from "../api/use-follower-count-query";

/** Exact public target; private account and personal season are not count selectors. */
export interface FollowerCountProps {
  target: FollowingTarget;
}

/** Public direct relation count, independently of the adjacent private follow control. */
export function FollowerCount({ target }: FollowerCountProps) {
  const query = useFollowerCountQuery(target);
  const { colors } = useTheme();
  const count = query.data?.count;
  const label =
    count === undefined
      ? query.isError
        ? "Nombre d’abonnés indisponible"
        : "Chargement du nombre d’abonnés"
      : `${count.toLocaleString("fr-FR")} abonné${count > 1 ? "s" : ""}${query.isError ? ", actualisation indisponible" : ""}`;
  return (
    <View style={styles.count}>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={label}
        accessibilityState={{ busy: query.isFetching }}
        style={styles.value}
      >
        <UsersRound
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
        {query.isPending ? (
          <LoadingIndicator color={colors.icon} />
        ) : (
          <Text style={[tokens.typography.body, { color: colors.icon }]}>
            {count === undefined ? "—" : count.toLocaleString("fr-FR")}
          </Text>
        )}
      </View>
      {query.isError && (
        <IconButton
          label="Réessayer le nombre d’abonnés"
          loading={query.isFetching}
          onPress={() => void query.refetch()}
        >
          <RotateCcw
            accessible={false}
            size={tokens.size.icon.sm}
            color={colors.icon}
          />
        </IconButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  count: { flexDirection: "row", alignItems: "center" },
  value: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.xs },
});
