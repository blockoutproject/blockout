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

/** Fixed navigation retains the canonical identity independently of each scrolling scene. */
export interface SportingPageHeaderProps {
  identity: SportingIdentityResponse;
  kind: "team" | "pool" | "club";
  division?: SportingDivisionResponse;
  /** Contextual support remains independent of the body content. */
  action?: ReactNode;
}

/** Composes the fixed identity with a permission-gated edit icon and the independent support action. */
export function SportingPageHeader({
  identity,
  kind,
  division,
  action,
}: SportingPageHeaderProps) {
  const { colors } = useTheme();
  return (
    <PageHeader
      title={identity.name}
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
