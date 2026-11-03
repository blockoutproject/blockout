import { StyleSheet } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { Surface } from "../../../shared/components/surface";
import { tokens } from "../../../shared/theme/tokens";

/** App-owned Pro read/handoff section; it reserves status copy without recreating SDK prices, products or controls. */
export function ProReadLoading({ label }: { label: string }) {
  return (
    <Surface>
      <LoadingGroup label={label} style={styles.copy}>
        <Skeleton width="60%" height={tokens.typography.title.lineHeight} />
        <Skeleton />
        <Skeleton width="70%" />
      </LoadingGroup>
    </Surface>
  );
}

const styles = StyleSheet.create({ copy: { gap: tokens.spacing.compact } });
