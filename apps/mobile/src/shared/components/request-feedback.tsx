import { StyleSheet } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { TextSkeleton } from "./text-skeleton";
import { Surface } from "./surface";
import { LoadingGroup } from "./loading-group";

/** Neutral structural read skeleton; known content uses its feature shape and the caller owns blocking placement. */
export function RequestLoading() {
  return (
    <LoadingGroup label="Chargement en cours" style={styles.loading}>
      <Surface style={styles.content}>
        <TextSkeleton role="title" width="62%" />
        <TextSkeleton />
        <TextSkeleton width="54%" />
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
