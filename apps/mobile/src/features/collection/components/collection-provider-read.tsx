import type { ReactNode } from "react";
import type {
  CollectionControlResponse,
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { EmptyState } from "@/shared/components/state-card";
import { useCollectionControls } from "../api/use-collection-controls";
import type { useCollectionSeason } from "../api/use-collection-season";

type ProviderContent = (
  control: CollectionControlResponse,
  season: CollectionSeasonResponse,
  controls: ReturnType<typeof useCollectionControls>,
) => ReactNode;

/** Keeps admission and control selection the same for Suivi and a directly opened Bilan. */
export function CollectionProviderRead({
  provider,
  reading,
  header,
  loadingContent,
  retainControlOnError = false,
  children,
}: Readonly<{
  provider: CollectionProviderEnum;
  reading: ReturnType<typeof useCollectionSeason>;
  /** A standalone page retains its header when context has yet to admit its content. */
  header?: ReactNode;
  loadingContent: ReactNode;
  /** Suivi keeps its separately read results while the retained control is temporarily unavailable. */
  retainControlOnError?: boolean;
  children: ProviderContent;
}>) {
  const { authority, season } = reading;
  if (!authority.enabled) {
    return (
      <ProviderReadState header={header} pending={isAccessLoading(authority)}>
        <AccessFeedback {...authority} loadingContent={loadingContent} />
      </ProviderReadState>
    );
  }
  if (!season.data || hasReadError(season)) {
    return (
      <ProviderReadState
        header={header}
        pending={season.isLoading && !hasReadError(season)}
      >
        <ReadFeedback query={season} loadingContent={loadingContent} />
      </ProviderReadState>
    );
  }
  return (
    <ProviderControlRead
      provider={provider}
      season={season.data}
      header={header}
      loadingContent={loadingContent}
      retainControlOnError={retainControlOnError}
    >
      {children}
    </ProviderControlRead>
  );
}

function ProviderControlRead({
  provider,
  season,
  header,
  loadingContent,
  retainControlOnError,
  children,
}: Readonly<{
  provider: CollectionProviderEnum;
  season: CollectionSeasonResponse;
  header?: ReactNode;
  loadingContent: ReactNode;
  retainControlOnError: boolean;
  children: ProviderContent;
}>) {
  const controls = useCollectionControls(season.id);
  const { query } = controls;
  const failed = hasReadError(query);
  const control = query.data?.items.find(
    (item) => item.family === provider && item.seasonId === season.id,
  );
  if (control && (!failed || retainControlOnError)) {
    return children(control, season, controls);
  }
  if (!query.data || failed) {
    return (
      <ProviderReadState header={header} pending={query.isLoading && !failed}>
        <ReadFeedback query={query} loadingContent={loadingContent} />
      </ProviderReadState>
    );
  }
  return <ProviderReadState header={header} />;
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
