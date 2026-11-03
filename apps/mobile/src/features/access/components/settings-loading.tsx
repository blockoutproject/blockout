import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** F12 control and content placeholders, Product Design 6019:46584 and 6019:46595. */
export function MaintenanceLoading() {
  return (
    <LoadingGroup
      label="Chargement des réglages de maintenance"
      style={styles.stack}
    >
      <SettingsCard>
        <View style={styles.controlHeading}>
          <Skeleton
            width={tokens.size.icon.lg}
            height={tokens.size.icon.lg}
            shape="rectangle"
          />
          <View style={styles.controlTitle}>
            <Skeleton />
          </View>
          <Skeleton width={48} height={24} shape="rectangle" />
        </View>
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </SettingsCard>
      <SettingsCard>
        <Skeleton width={160} height={20} />
        <Skeleton width={90} height={14} />
        <Skeleton height={96} shape="rectangle" />
        <Skeleton width={110} height={14} />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </SettingsCard>
    </LoadingGroup>
  );
}

/** F12 platform summaries followed by the shared editor, Product Design 6053:46877 and 6019:46606. */
export function ApplicationVersionsLoading() {
  return (
    <LoadingGroup
      label="Chargement des réglages de versions"
      style={styles.stack}
    >
      <View style={styles.platforms}>
        <View style={styles.platform}>
          <PlatformLoading />
        </View>
        <View style={styles.platform}>
          <PlatformLoading />
        </View>
      </View>
      <SettingsCard>
        <Skeleton width={160} height={20} />
        <Skeleton width={90} height={14} />
        <Skeleton height={96} shape="rectangle" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </SettingsCard>
    </LoadingGroup>
  );
}

/** A platform is unknown until its own settings read succeeds; these shapes contain no default version. */
function PlatformLoading() {
  return (
    <SettingsCard>
      <Skeleton width={56} height={14} />
      <Skeleton width={86} height={26} />
      <Skeleton width={108} height={12} shape="rectangle" />
      <Skeleton width={58} height={20} />
    </SettingsCard>
  );
}

/** Matches the approved flat card's inside stroke and sixteen-point content inset. */
function SettingsCard({ children }: PropsWithChildren) {
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.layout.form.gap },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.spacing.lg - tokens.border.thin,
    gap: tokens.spacing.md,
  },
  controlHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  controlTitle: { flex: 1, minWidth: 0 },
  platforms: { flexDirection: "row", gap: tokens.spacing.lg },
  platform: { flex: 1, minWidth: 0 },
});
