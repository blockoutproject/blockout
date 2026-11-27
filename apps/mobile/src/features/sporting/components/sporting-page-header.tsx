import type {
  SportingDivisionResponse,
  SportingIdentityResponse,
} from "../../../../.generated/schemas/index.zod";
import { PageHeader } from "@/shared/components/page-header";
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

/** Native collapse reveals the logo and available division while editing and support stay reachable. */
export function SportingPageHeader({
  identity,
  kind,
  division,
  action,
}: Readonly<SportingPageHeaderProps>) {
  const offset = usePagedTabHeaderOffset();
  return (
    <PageHeader
      title={identity.name}
      subtitle={division?.name}
      revealOffset={offset}
      titleArtwork={
        <SportingLogo
          pendingPlaceholder="skeleton"
          identity={
            kind === "pool"
              ? (division ?? { ...identity, logoUrl: undefined })
              : identity
          }
          kind={kind === "pool" ? "division" : kind}
          size={28}
        />
      }
      action={
        <>
          <SportingPresentationAction target={{ kind, id: identity.id }} />
          {action}
        </>
      }
    />
  );
}
