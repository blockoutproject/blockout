import { StyleSheet, View } from "react-native";
import { FieldSkeleton } from "../../../shared/components/form-loading";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { SingleImageFieldSkeleton } from "../../../shared/components/single-image-field";
import { Surface } from "../../../shared/components/surface";
import { tokens } from "../../../shared/theme/tokens";
import type { PresentationTarget } from "../api/presentation";

/** Classification waits in its summary, mode, division and paired choice slots without installing a draft. */
export function ClassificationLoading() {
  return (
    <LoadingGroup label="Chargement de la classification" style={styles.form}>
      <TextSkeleton width="85%" />
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
      <FieldSkeleton labelWidth="30%" />
      <View style={styles.row}>
        <View style={styles.column}>
          <FieldSkeleton />
        </View>
        <View style={styles.column}>
          <FieldSkeleton />
        </View>
      </View>
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

/** The addressed editor keeps its known media/name anatomy; pools have no remote media field. */
export function PresentationLoading({
  kind,
}: Readonly<{
  kind: PresentationTarget["kind"];
}>) {
  const division = kind === "division" || kind === "division-creation";
  return (
    <LoadingGroup label="Chargement de la présentation" style={styles.form}>
      <Surface>
        <View style={styles.row}>
          <Skeleton
            width={division ? 38 : 64}
            height={division ? 38 : 64}
            shape="rectangle"
          />
          <View style={styles.column}>
            <TextSkeleton width="70%" />
          </View>
        </View>
      </Surface>
      <Surface>
        <View style={styles.form}>
          {kind !== "pool" && <SingleImageFieldSkeleton />}
          <FieldSkeleton labelWidth="45%" />
          {(kind === "team" || kind === "pool") && (
            <FieldSkeleton labelWidth="38%" />
          )}
        </View>
      </Surface>
      {division && (
        <>
          <Surface>
            <TextSkeleton width="48%" />
            <FieldSkeleton labelWidth="35%" />
            <TextSkeleton role="metadata" width="72%" />
          </Surface>
          <Surface>
            <TextSkeleton width="35%" />
            <Skeleton height={126} shape="rectangle" />
            <FieldSkeleton labelWidth="25%" />
            <FieldSkeleton labelWidth="25%" />
            <FieldSkeleton labelWidth="25%" />
            <Skeleton height={tokens.size.control.default} shape="rectangle" />
          </Surface>
        </>
      )}
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  row: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.md },
  column: { flex: 1, minWidth: 0 },
});
