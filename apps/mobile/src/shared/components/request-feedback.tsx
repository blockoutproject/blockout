import { StyleSheet } from "react-native";
import { tokens } from "../theme/tokens";
import { Skeleton } from "./skeleton";
import { Surface } from "./surface";
import { LoadingGroup } from "./loading-group";

/** Neutral structural read skeleton; known content uses its feature shape and the caller owns blocking placement. */
export function RequestLoading() {
  return (
    <LoadingGroup label="Chargement en cours" style={styles.loading}>
      <Surface style={styles.content}>
        <Skeleton width="62%" height={16} />
        <Skeleton height={11} />
        <Skeleton width="54%" height={11} />
      </Surface>
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  loading: {
    width: "100%",
    maxWidth: tokens.layout.width.compact,
  },
  content: { gap: tokens.spacing.compact },
});
