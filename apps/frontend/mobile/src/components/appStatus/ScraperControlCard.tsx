import React from "react";
import {ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/context/ThemeProvider";
import {ScraperStatus} from "@/src/types/ScraperStatus";
import ScraperStatusItem from "./ScraperStatusItem";

type Props = {
  scrapers: ScraperStatus[];
  loading: boolean;
  refreshing?: boolean;
  onToggleScraper: (scraper: ScraperStatus) => void;
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
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, {color: theme.text}]}>
            Scrapers FFVB
          </Text>
          <Text style={[styles.subtitle, {color: theme.textInactive}]}>
            Active ou désactive les scrapers de récupération des données.
          </Text>
        </View>

        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.textInactive}/>
          ) : onRefresh ? (
            <TouchableOpacity
              onPress={onRefresh}
              style={[
                styles.iconButton,
                {backgroundColor: theme.backgroundSecondary},
              ]}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={18}
                color={theme.textInactive}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Body : liste des scrapers */}
      <View style={styles.listContainer}>
        {refreshing && !loading && (
          <View style={styles.inlineLoaderRow}>
            <ActivityIndicator size="small" color={theme.textInactive}/>
            <Text
              style={[styles.inlineLoaderText, {color: theme.textInactive}]}
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
            contentContainerStyle={{gap: 10}}
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
          <Text
            style={[styles.emptyText, {color: theme.textInactive}]}
          >
            Aucun scraper configuré pour le moment.
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    marginTop: 4,
    maxHeight: 260, // au besoin tu ajustes selon ton écran
  },
  scroll: {
    flexGrow: 0,
  },
  inlineLoaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  inlineLoaderText: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "left",
    marginTop: 2,
  },
});

export default ScraperControlCard;
