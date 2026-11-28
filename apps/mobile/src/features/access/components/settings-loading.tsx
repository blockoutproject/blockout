import { StyleSheet, View, useWindowDimensions } from "react-native";
import { FieldSkeleton } from "@/shared/components/form-loading";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { Surface } from "@/shared/components/surface";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { applicationVersionsLayout } from "../forms/application-versions-form";

/** Reserves the status, the saved screen editor and its image preview without implying maintenance is active. */
export function MaintenanceLoading() {
  return (
    <LoadingGroup
      label="Chargement des réglages de maintenance"
      style={styles.stack}
    >
      <Surface style={styles.stack}>
        <View style={styles.controlHeading}>
          <HeadingIconSkeleton />
          <TextSkeleton width="55%" />
        </View>
        <TextSkeleton width="68%" />
        <TextSkeleton width="86%" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </Surface>
      <Surface style={styles.stack}>
        <View style={styles.controlHeading}>
          <HeadingIconSkeleton />
          <TextSkeleton width={110} />
        </View>
        <FieldSkeleton labelWidth={150} height={96} />
        <View style={styles.field}>
          <FieldSkeleton labelWidth={94} />
          <TextSkeleton role="metadata" width="84%" />
        </View>
        <Skeleton height={96} radius={tokens.media.radius.profile} />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </Surface>
    </LoadingGroup>
  );
}

/** Preserves the closed platform disclosures and the shared editor's two action slots. */
export function ApplicationVersionsLoading() {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1;
  const expanded = largeText && applicationVersionsLayout.expandedCard;
  return (
    <LoadingGroup
      label="Chargement des réglages de versions"
      style={styles.stack}
    >
      <View style={applicationVersionsLayout.platforms}>
        <PlatformLoading largeText={largeText} nameWidth={24} />
        <PlatformLoading largeText={largeText} nameWidth={44} />
      </View>
      <Surface style={styles.stack}>
        <TextSkeleton role="heading" width={152} />
        <View style={styles.field}>
          <FieldSkeleton labelWidth={100} height={96} />
          <TextSkeleton role="metadata" width="74%" />
        </View>
        <View style={applicationVersionsLayout.actions}>
          {[0, 1].map((index) => (
            <View
              key={index}
              style={[applicationVersionsLayout.action, expanded]}
            >
              <Skeleton
                height={tokens.size.control.default}
                shape="rectangle"
              />
            </View>
          ))}
        </View>
      </Surface>
    </LoadingGroup>
  );
}

function PlatformLoading({
  largeText,
  nameWidth,
}: Readonly<{ largeText: boolean; nameWidth: number }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        applicationVersionsLayout.platformCard,
        largeText && applicationVersionsLayout.expandedCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={applicationVersionsLayout.disclosure}>
        <TextSkeleton width={nameWidth} />
        <View style={styles.version}>
          <TextSkeleton width="82%" role="metadata" />
        </View>
        <Skeleton width={tokens.size.icon.md} height={tokens.size.icon.md} />
      </View>
    </View>
  );
}

function HeadingIconSkeleton() {
  return (
    <Skeleton
      width={tokens.size.icon.lg}
      height={tokens.size.icon.lg}
      shape="rectangle"
    />
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.layout.form.gap },
  field: { gap: tokens.layout.form.labelGap },
  controlHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
  },
  version: { flex: 1, minWidth: 0, alignItems: "flex-end" },
});
