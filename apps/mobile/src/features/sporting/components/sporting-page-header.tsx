import { StyleSheet, Text, View } from "react-native";
import type {
  SportingDivisionResponse,
  SportingIdentityResponse,
} from "../../../../.generated/schemas/index.zod";
import { PageHeader } from "../../../shared/components/page-header";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SportingLogo } from "./sporting-identity";
import type { ReactNode } from "react";
import { SportingPresentationAction } from "./sporting-actions";
import { useCollapseProgress } from "react-native-collapsible-tab";

/** Pinned navigation reveals canonical identity only as the shared sporting card collapses. */
export interface SportingPageHeaderProps {
  identity: SportingIdentityResponse;
  kind: "team" | "pool" | "club";
  division?: SportingDivisionResponse;
  /** Contextual support remains independent of the body content. */
  action?: ReactNode;
}

/** Native collapse reveals only the compact identity; permission-gated editing and support remain independent. */
export function SportingPageHeader({
  identity,
  kind,
  division,
  action,
}: Readonly<SportingPageHeaderProps>) {
  const { colors } = useTheme();
  const progress = useCollapseProgress();
  return (
    <PageHeader
      title={identity.name}
      revealProgress={progress}
      action={
        <>
          <SportingPresentationAction target={{ kind, id: identity.id }} />
          {action}
        </>
      }
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.identity}
      >
        <SportingLogo
          identity={
            kind === "pool"
              ? (division ?? { ...identity, logoUrl: undefined })
              : identity
          }
          kind={kind === "pool" ? "division" : kind}
          size={28}
        />
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {identity.name}
        </Text>
      </View>
    </PageHeader>
  );
}

const styles = StyleSheet.create({
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  name: { ...tokens.typography.navigation, flexShrink: 1 },
});
