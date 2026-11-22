import type { ReactNode } from "react";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { EmptyState } from "@/shared/components/state-card";
import { useCollectionControls } from "../api/use-collection-controls";
import type { useCollectionSeason } from "../api/use-source-preparation";
import { CollectionControlLoading } from "./collection-loading";

/** Keeps admission and control selection the same for Suivi and a directly opened Bilan. */
export function CollectionProviderRead({
  provider,
  reading,
  header,
  children,
}: Readonly<{
  provider: CollectionProviderEnum;
  reading: ReturnType<typeof useCollectionSeason>;
  /** A standalone page retains its header when context has yet to admit its content. */
  header?: ReactNode;
  children: (controlId: string, season: CollectionSeasonResponse) => ReactNode;
}>) {
  const { authority, season } = reading;
  const loading = <CollectionControlLoading />;
  if (!authority.enabled) {
    const pending =
      authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading &&
        !hasReadError(authority.account));
    return (
      <ProviderReadState header={header} pending={pending}>
        <AccessFeedback {...authority} loadingContent={loading} />
      </ProviderReadState>
    );
  }
  if (!season.data || hasReadError(season)) {
    return (
      <ProviderReadState
        header={header}
        pending={season.isLoading && !hasReadError(season)}
      >
        <ReadFeedback query={season} loadingContent={loading} />
      </ProviderReadState>
    );
  }
  return (
    <ProviderControlRead
      provider={provider}
      season={season.data}
      header={header}
    >
      {children}
    </ProviderControlRead>
  );
}

function ProviderControlRead({
  provider,
  season,
  header,
  children,
}: Readonly<{
  provider: CollectionProviderEnum;
  season: CollectionSeasonResponse;
  header?: ReactNode;
  children: (controlId: string, season: CollectionSeasonResponse) => ReactNode;
}>) {
  const { query } = useCollectionControls(season.id);
  if (!query.data || hasReadError(query)) {
    return (
      <ProviderReadState
        header={header}
        pending={query.isLoading && !hasReadError(query)}
      >
        <ReadFeedback
          query={query}
          loadingContent={<CollectionControlLoading />}
        />
      </ProviderReadState>
    );
  }
  const control = query.data.items.find(
    (item) => item.family === provider && item.seasonId === season.id,
  );
  return control ? (
    children(control.id, season)
  ) : (
    <ProviderReadState header={header} />
  );
}

function ProviderReadState({
  header,
  pending = false,
  children,
}: Readonly<{ header?: ReactNode; pending?: boolean; children?: ReactNode }>) {
  const Layout = pending ? PageContent : ScreenState;
  const content = (
    <PageScrollView>
      <Layout>
        {children ?? <EmptyState title="Aucun contrôle de collecte" />}
      </Layout>
    </PageScrollView>
  );
  return header ? <Page header={header}>{content}</Page> : content;
}
