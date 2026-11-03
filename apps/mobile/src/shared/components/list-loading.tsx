import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "./loading-group";
import { Skeleton } from "./skeleton";
import { EntryGroupSeparator } from "./entry-group";
import { tokens } from "../theme/tokens";

/** Three decorative native rows reserve the first read of an entry list. */
export function ListLoading({ label }: { label: string }) {
  return (
    <LoadingGroup label={label}>
      {Array.from({ length: 3 }, (_, index) => (
        <Fragment key={index}>
          {index > 0 && <EntryGroupSeparator />}
          <EntryRowSkeleton />
        </Fragment>
      ))}
    </LoadingGroup>
  );
}

/** Decorative basic-row anatomy, reusable inside an already announced EntryGroup or page skeleton. */
export function EntryRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={tokens.size.icon.lg} height={tokens.size.icon.lg} />
      <View style={styles.copy}>
        <Skeleton width="65%" />
      </View>
      <Skeleton width={tokens.size.icon.sm} height={tokens.size.icon.sm} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control.default,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  copy: { flex: 1, minWidth: 0 },
});
