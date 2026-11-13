import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { LoadingGroup } from "@/shared/components/loading-group";
import { FieldSkeleton } from "@/shared/components/form-loading";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

/** Product Design 6019:46573: two decorative destination rows while the season catalogue is unknown. */
export function CollectionLoading() {
  return (
    <LoadingGroup label="Chargement des collectes" style={styles.rows}>
      <DestinationLoading />
      <DestinationLoading />
    </LoadingGroup>
  );
}

/** Current control reads reserve their status, action row and observation metadata without suggesting an outcome. */
export function CollectionControlLoading() {
  return (
    <LoadingGroup
      label="Chargement du contrôle de collecte"
      style={styles.rows}
    >
      <TextSkeleton role="title" width="55%" />
      <Surface>
        <TextSkeleton width="45%" />
        <View style={styles.actions}>
          <Skeleton
            width="46%"
            height={tokens.size.control.default}
            shape="rectangle"
          />
          <Skeleton
            width="46%"
            height={tokens.size.control.default}
            shape="rectangle"
          />
        </View>
        <TextSkeleton width="60%" />
        <TextSkeleton role="metadata" width="80%" />
        <TextSkeleton role="metadata" width="72%" />
      </Surface>
    </LoadingGroup>
  );
}

/** Two decorative evidence surfaces reserve the first read without implying a published count. */
export function CollectionResultsLoading() {
  return (
    <LoadingGroup
      label="Chargement des résultats de collecte"
      style={styles.rows}
    >
      {Array.from({ length: 2 }, (_, index) => (
        <Surface key={index}>
          <TextSkeleton width="72%" />
          <TextSkeleton width="55%" />
          <TextSkeleton role="metadata" width="82%" />
          <TextSkeleton role="metadata" width="68%" />
          <TextSkeleton role="metadata" width="58%" />
        </Surface>
      ))}
    </LoadingGroup>
  );
}

/** A source's retained editor has one URL field below its identity and current qualification tracks. */
export function SourcePreparationLoading() {
  return (
    <LoadingGroup label="Chargement de la source" style={styles.rows}>
      <TextSkeleton role="title" width="55%" />
      <Surface>
        <TextSkeleton width="70%" />
        <TextSkeleton role="metadata" width="45%" />
        <FieldSkeleton labelWidth="38%" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </Surface>
    </LoadingGroup>
  );
}

/** Provider preparation waits in its source-selection region, followed by the existing launch action slot. */
export function ProviderPreparationLoading() {
  return (
    <LoadingGroup label="Chargement des sources" style={styles.rows}>
      <TextSkeleton role="title" width="55%" />
      <DestinationLoading />
      <DestinationLoading />
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

/** Seasonal closure has one exact-label confirmation field; no value or command is fabricated while reading. */
export function CloseSeasonLoading() {
  return (
    <LoadingGroup
      label="Chargement de la clôture de saison"
      style={styles.rows}
    >
      <TextSkeleton role="title" width="55%" />
      <Surface>
        <TextSkeleton width="85%" />
        <TextSkeleton width="70%" />
        <FieldSkeleton labelWidth="46%" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </Surface>
      <Skeleton
        width="40%"
        height={tokens.size.control.default}
        shape="rectangle"
      />
    </LoadingGroup>
  );
}

/** The approved icon and two labels communicate navigation shape without inventing a destination. */
function DestinationLoading() {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Skeleton
        width={tokens.size.icon.lg}
        height={tokens.size.icon.lg}
        shape="rectangle"
      />
      <View style={styles.copy}>
        <TextSkeleton width={130} />
        <TextSkeleton role="metadata" />
      </View>
      <Skeleton width={tokens.size.icon.md} height={tokens.size.icon.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.spacing.lg },
  actions: { flexDirection: "row", gap: tokens.spacing.compact },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.spacing.lg - tokens.border.thin,
    gap: tokens.spacing.lg,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.md },
});
