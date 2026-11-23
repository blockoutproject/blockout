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
import { collectionOperatorSources } from "../model/collection-operator-source";

type ProviderContent = (
  control: CollectionControlResponse,
  season: CollectionSeasonResponse,
  controls: ReturnType<typeof useCollectionControls>,
) => ReactNode;

type ControlView = "suivi" | "bilan";

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
  view: ControlView;
  /** A standalone page retains its header when context has yet to admit its content. */
  header?: ReactNode;
  loadingContent: ReactNode;
  children: ProviderContent;
}>) {
  const { authority, season } = reading;
  if (!authority.enabled) {
    return (
      <ControlReadState header={header} pending={isAccessLoading(authority)}>
        <AccessFeedback {...authority} loadingContent={loadingContent} />
      </ControlReadState>
    );
  }
  const current = season.data;
  if (!current || hasReadError(season)) {
    return (
      <ControlReadState
        header={header}
        pending={season.isLoading && !hasReadError(season)}
      >
        <ReadFeedback query={season} loadingContent={loadingContent} />
      </ControlReadState>
    );
  }
  return (
    <CollectionControlRead
      family={collectionOperatorSources[provider].controlFamily}
      seasonId={current.id}
      view={view}
      header={header}
      loadingContent={loadingContent}
    >
      {(control, controls) => children(control, current, controls)}
    </CollectionControlRead>
  );
}

/** Selects the exact family within the admitted competition season or seasonless scope. */
export function CollectionControlRead({
  family,
  seasonId,
  view,
  header,
  loadingContent,
  children,
}: Readonly<{
  family: CollectionControlResponse["family"];
  seasonId?: string;
  view: ControlView;
  header?: ReactNode;
  loadingContent: ReactNode;
  children: (
    control: CollectionControlResponse,
    controls: ReturnType<typeof useCollectionControls>,
  ) => ReactNode;
}>) {
  const controls = useCollectionControls(seasonId);
  const { authority, query } = controls;
  if (!authority.enabled) {
    return (
      <ControlReadState header={header} pending={isAccessLoading(authority)}>
        <AccessFeedback {...authority} loadingContent={loadingContent} />
      </ControlReadState>
    );
  }
  const failed = hasReadError(query);
  const control = query.data?.items.find(
    (item) => item.family === family && item.seasonId === seasonId,
  );
  // Keep Suivi mounted through a scoped control failure so its independent summary can recover.
  if (control && (!failed || view === "suivi")) {
    return children(control, controls);
  }
  if (!query.data || failed) {
    return (
      <ControlReadState header={header} pending={query.isLoading && !failed}>
        <ReadFeedback query={query} loadingContent={loadingContent} />
      </ControlReadState>
    );
  }
  return (
    <ControlReadState header={header}>
      <EmptyState title="Aucun contrôle de collecte">
        {view === "suivi" && <ReloadButton query={query} />}
      </EmptyState>
    </ControlReadState>
  );
}

function ControlReadState({
  header,
  pending = false,
  children,
}: Readonly<{ header?: ReactNode; pending?: boolean; children: ReactNode }>) {
  const content = <PageReadState pending={pending}>{children}</PageReadState>;
  return header ? <Page header={header}>{content}</Page> : content;
}
