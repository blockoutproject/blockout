import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  fontWeight,
  iconSize,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { ScraperStatusResponse } from "@/src/shared/generated/models";
import { IconAction } from "@/src/shared/ui/icon-action";
import ScraperStatusItem from "./scraper-status-item";
import AdministrationControlCard from "./administration-control-card";

type Props = {
  scrapers: ScraperStatusResponse[];
  loading: boolean;
  refreshing?: boolean;
  onToggleScraper: (scraper: ScraperStatusResponse) => void;
  onRefresh?: () => void;
};

const ScraperControlCard: React.FC<Props> = ({
  scrapers,
  loading,
  refreshing,
  onToggleScraper,
  onRefresh,
}) => {
  const theme = useAppTheme();

  const hasScrapers = scrapers && scrapers.length > 0;
  return (
    <AdministrationControlCard testID="administration-scraper-card">
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.text }]}>
            Scrapers FFVB
          </Text>
          <Text style={[styles.subtitle, { color: theme.textInactive }]}>
            Active ou désactive les scrapers de récupération des données.
          </Text>
        </View>

        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.textInactive} />
          ) : onRefresh ? (
            <IconAction
              onPress={onRefresh}
              accessibilityLabel="Actualiser les scrapers"
              treatment="surface"
              testID="administration-refresh-scrapers-action"
            >
              <MaterialCommunityIcons
                name="refresh"
                size={iconSize.md}
                color={theme.textInactive}
              />
            </IconAction>
          ) : null}
        </View>
      </View>

      <View style={styles.listContainer}>
        {!!refreshing && !loading && (
          <View style={styles.inlineLoaderRow}>
            <ActivityIndicator size="small" color={theme.textInactive} />
            <Text
              style={[styles.inlineLoaderText, { color: theme.textInactive }]}
            >
              Mise à jour des statuts…
            </Text>
          </View>
        )}

        {hasScrapers ? (
          <ScrollView
            style={styles.scroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.compact }}
            testID="administration-scraper-list"
          >
            {scrapers.map((scraper) => (
              <ScraperStatusItem
                key={scraper.name}
                scraper={scraper}
                onToggle={() => onToggleScraper(scraper)}
              />
            ))}
          </ScrollView>
        ) : !loading ? (
          <Text style={[styles.emptyText, { color: theme.textInactive }]}>
            Aucun scraper configuré pour le moment.
          </Text>
        ) : null}
      </View>
    </AdministrationControlCard>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  headerLeft: {
    flex: 1,
    gap: spacing.tight,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: typography.control.fontSize,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.medium,
  },
  listContainer: {
    marginTop: spacing[1],
    maxHeight: 260,
  },
  scroll: {
    flexGrow: 0,
  },
  inlineLoaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
    marginBottom: spacing[2],
  },
  inlineLoaderText: {
    fontSize: typography.caption.fontSize,
    fontWeight: fontWeight.medium,
  },
  emptyText: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.medium,
    textAlign: "left",
    marginTop: spacing.optical,
  },
});

export default ScraperControlCard;
