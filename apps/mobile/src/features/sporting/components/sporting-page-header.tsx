import { StyleSheet, Text, View } from "react-native";
import type {
  SportingDivisionResponse,
  SportingIdentityResponse,
} from "../../../../.generated/schemas/index.zod";
import { PageHeader } from "@/shared/components/page-header";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { SportingLogo } from "./sporting-identity";
import type { ReactNode } from "react";
import { SportingPresentationAction } from "./sporting-actions";
import { usePagedTabHeaderOffset } from "@/shared/components/paged-tab-context";

/** Pinned navigation presents the sporting identity as the pager scrolls. */
export interface SportingPageHeaderProps {
  identity: SportingIdentityResponse;
  kind: "team" | "pool" | "club";
  division?: SportingDivisionResponse;
  /** Contextual support remains independent of the body content. */
  action?: ReactNode;
}

/** Native collapse reveals the compact identity, with up to two lines for pool names; editing and support remain independent. */
export function SportingPageHeader({
  identity,
  kind,
  division,
  action,
}: Readonly<SportingPageHeaderProps>) {
  const { colors } = useTheme();
  const offset = usePagedTabHeaderOffset();
  return (
    <PageHeader
      title={identity.name}
      revealOffset={offset}
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
        <Text
          numberOfLines={kind === "pool" ? 2 : 1}
          ellipsizeMode="tail"
          style={[styles.name, { color: colors.text }]}
        >
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
