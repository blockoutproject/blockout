import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { MappingPoolResponse } from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import {
  formatLabel,
  sportingGenderLabels,
} from "@/features/sporting/classification-presentation";
import { Button } from "@/shared/components/button";
import { ListLoading } from "@/shared/components/list-loading";
import { Page } from "@/shared/components/page";
import { PageReadState } from "@/shared/components/page-read-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useSportingAuthority } from "../api/classification";
import { createMappingQueries } from "../api/mapping-queries";
import { MappingHeader } from "../components/mapping-header";
import { MappingList } from "../components/mapping-list";
import { MappingRow } from "../components/mapping-row";

const loadingLabel = "Chargement de la classification et des poules";

export function MappingPackScreen({ packId }: Readonly<{ packId: string }>) {
  const router = useRouter();
  const { colors } = useTheme();
  const authority = useSportingAuthority("classification");
  const query = useInfiniteQuery(createMappingQueries(authority).pack(packId));
  const pack = query.data?.pages[0]?.pack;
  const classification = pack?.defaultClassification;
  const subtitle = pack
    ? `${pack.sourceLabel}  ${pack.seasonLabel}`
    : undefined;
  if (!authority.enabled) {
    return (
      <Page header={<MappingHeader />}>
        <PageReadState pending={isAccessLoading(authority)}>
          <AccessFeedback
            {...authority}
            loadingContent={<ListLoading label={loadingLabel} />}
          />
        </PageReadState>
      </Page>
    );
  }

  return (
    <Page header={<MappingHeader title={pack?.label} subtitle={subtitle} />}>
      <MappingList<MappingPoolResponse>
        query={query}
        loadingLabel={loadingLabel}
        emptyLabel="Aucune poule dans ce pack"
        header={
          pack && (
            <View style={styles.sections}>
              <Surface style={styles.pack}>
                <View style={styles.packTitle}>
                  <Text
                    accessibilityRole="header"
                    style={[
                      tokens.typography.navigation,
                      styles.title,
                      { color: colors.text },
                    ]}
                  >
                    Classification du pack
                  </Text>
                  <StatusBadge
                    label={classification ? "Classé" : "À classer"}
                    tone={classification ? "success" : "strong-warning"}
                  />
                </View>
                {classification && (
                  <View style={styles.classification}>
                    <Text
                      style={[tokens.typography.strong, { color: colors.text }]}
                    >
                      {classification.divisionName}
                    </Text>
                    <Text
                      style={[
                        tokens.typography.metadata,
                        { color: colors.secondaryText },
                      ]}
                    >
                      {formatLabel(classification.format)} ·{" "}
                      {sportingGenderLabels[classification.gender]}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    tokens.typography.metadata,
                    { color: colors.secondaryText },
                  ]}
                >
                  Les poules en mode « Du pack » reprennent ce réglage.
                </Text>
                <Button
                  label={
                    classification
                      ? "Modifier la classification"
                      : "Classer le pack"
                  }
                  variant={classification ? "secondary" : "primary"}
                  fullWidth
                  onPress={() =>
                    router.push({
                      pathname: "/administration/classification/[kind]/[id]",
                      params: {
                        kind: "pack",
                        id: pack.id,
                        subtitle: `${pack.label}  ${subtitle}`,
                      },
                    })
                  }
                />
              </Surface>
              <Text
                accessibilityRole="header"
                style={[tokens.typography.navigation, { color: colors.text }]}
              >
                Poules ({pack.poolCount})
              </Text>
            </View>
          )
        }
        renderItem={({ item: pool }) => {
          const effective = pool.effectiveClassification;
          return (
            <MappingRow
              label={pool.label}
              detail={
                effective
                  ? `${effective.divisionName} · ${formatLabel(effective.format)} · ${sportingGenderLabels[effective.gender]}`
                  : undefined
              }
              badge={
                effective
                  ? pool.mode === "custom"
                    ? "Personnalisée"
                    : "Du pack"
                  : "À classer"
              }
              tone={effective ? "neutral" : "strong-warning"}
              onPress={() => {
                if (pack) {
                  router.push({
                    pathname: "/administration/classification/[kind]/[id]",
                    params: {
                      kind: "pool",
                      id: pool.id,
                      title: pool.label,
                      subtitle: `${pack.label}  ${subtitle}`,
                    },
                  });
                }
              }}
            />
          );
        }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  sections: { gap: tokens.spacing.xl, paddingBottom: tokens.spacing.sm },
  pack: { gap: tokens.spacing.sm },
  packTitle: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    alignItems: "center",
  },
  title: { flex: 1 },
  classification: { gap: tokens.spacing.xs },
});
