import { StyleSheet, View } from "react-native";
import { FieldSkeleton } from "../../../shared/components/form-loading";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { Surface } from "../../../shared/components/surface";
import { tokens } from "../../../shared/theme/tokens";

/** The original-match editor waits with one address field and its submit slot, without admitting commands. */
export function ContributionFormLoading() {
  return (
    <LoadingGroup label="Chargement du lien de diffusion" style={styles.stack}>
      <Surface>
        <TextSkeleton role="title" width="58%" />
        <FieldSkeleton labelWidth="38%" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </Surface>
    </LoadingGroup>
  );
}

/** The exact-version report reserves its private multiline reason and two ordinary action slots. */
export function ContributionReportLoading() {
  return (
    <LoadingGroup label="Chargement du signalement" style={styles.stack}>
      <Surface>
        <TextSkeleton role="title" width="58%" />
        <TextSkeleton width="85%" />
        <FieldSkeleton labelWidth="45%" height={120} />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </Surface>
    </LoadingGroup>
  );
}

/** Two decorative history rows reserve the first read without inventing a proposal count. */
export function ContributionProposalsLoading() {
  return (
    <LoadingGroup label="Chargement des propositions" style={styles.stack}>
      {Array.from({ length: 2 }, (_, index) => (
        <View key={index} style={styles.proposal}>
          <TextSkeleton role="metadata" width="30%" />
          <TextSkeleton width="85%" />
        </View>
      ))}
    </LoadingGroup>
  );
}

/** Unknown ownership occupies only the existing contribution-action slot inside the match section. */
export function ContributionEntryLoading() {
  return (
    <LoadingGroup label="Chargement de l’action du lien">
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.layout.form.gap },
  proposal: {
    minHeight: tokens.size.control.default,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.tight,
  },
});
