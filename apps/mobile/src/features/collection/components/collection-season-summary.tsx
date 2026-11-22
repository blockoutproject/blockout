import { CalendarDays } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";

/** Canonical season identity for definitive closure. */
export function SeasonIdentity({
  season,
}: Readonly<{
  season: CollectionSeasonResponse;
}>) {
  const { colors } = useTheme();
  return (
    <View style={styles.link}>
      <CalendarDays
        accessible={false}
        size={tokens.size.icon.lg}
        color={colors.icon}
      />
      <View>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Saison
        </Text>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {season.label}
        </Text>
      </View>
    </View>
  );
}

/** Reserves the season identity before the closure context is available. */
export function SeasonIdentitySkeleton() {
  return (
    <View style={styles.link}>
      <Skeleton width={tokens.size.icon.lg} height={tokens.size.icon.lg} />
      <View>
        <TextSkeleton role="metadata" width={38} />
        <TextSkeleton width={68} />
      </View>
    </View>
  );
}

/** Canonical season lifecycle copy, distinct from source readiness and running collection. */
export function seasonStatus(season: CollectionSeasonResponse) {
  return { preparing: "À préparer", active: "Active", closed: "Clôturée" }[
    season.state
  ];
}

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
});
