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
import { Page } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { EmptyState } from "@/shared/components/state-card";
import { useCollectionControls } from "../api/use-collection-controls";
import type { useCollectionSeason } from "../api/use-collection-season";
import { PageReadState } from "@/shared/components/page-read-state";

type ProviderContent = (
  control: CollectionControlResponse,
  season: CollectionSeasonResponse,
  controls: ReturnType<typeof useCollectionControls>,
) => ReactNode;

type ProviderView = "suivi" | "bilan";

/** Keeps admission and control selection the same for Suivi and a directly opened Bilan. */
export function CollectionProviderRead({
  provider,
  reading,
  view,
  header,
  loadingContent,
  children,
}: Readonly<{
  provider: CollectionProviderEnum;
  reading: ReturnType<typeof useCollectionSeason>;
  view: ProviderView;
  /** A standalone page retains its header when context has yet to admit its content. */
  header?: ReactNode;
  loadingContent: ReactNode;
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
      view={view}
      header={header}
      loadingContent={loadingContent}
    >
      {children}
    </ProviderControlRead>
  );
}

function ProviderControlRead({
  provider,
  season,
  view,
  header,
  loadingContent,
  children,
}: Readonly<{
  provider: CollectionProviderEnum;
  season: CollectionSeasonResponse;
  view: ProviderView;
  header?: ReactNode;
  loadingContent: ReactNode;
  children: ProviderContent;
}>) {
  const controls = useCollectionControls(season.id);
  const { query } = controls;
  const failed = hasReadError(query);
  const control = query.data?.items.find(
    (item) => item.family === provider && item.seasonId === season.id,
  );
  // Suivi keeps its separately read results while the retained control is unavailable.
  if (control && (!failed || view === "suivi")) {
    return children(control, season, controls);
  }
  if (!query.data || failed) {
    return (
      <ProviderReadState header={header} pending={query.isLoading && !failed}>
        <ReadFeedback query={query} loadingContent={loadingContent} />
      </ProviderReadState>
    );
  }
  return (
    <ProviderReadState header={header}>
      <EmptyState title="Aucun contrôle de collecte">
        {view === "suivi" && <ReloadButton query={query} />}
      </EmptyState>
    </ProviderReadState>
  );
}

function ProviderReadState({
  header,
  pending = false,
  children,
}: Readonly<{ header?: ReactNode; pending?: boolean; children: ReactNode }>) {
  const content = <PageReadState pending={pending}>{children}</PageReadState>;
  return header ? <Page header={header}>{content}</Page> : content;
}
