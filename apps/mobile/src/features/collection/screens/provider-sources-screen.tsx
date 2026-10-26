import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useSeasonPreparation } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationPage,
} from "../components/preparation-layout";
import { ProviderPreparationForm } from "../forms/provider-preparation-form";

/** Selects the season/provider whose current reads admit the retained preparation form. */
export interface ProviderSourcesScreenProps {
  seasonId: string;
  provider: CollectionProviderEnum;
}

/** Lists missing/discovered source coverage and launches only explicitly selected qualified bindings. */
export function ProviderSourcesScreen({
  seasonId,
  provider,
}: ProviderSourcesScreenProps) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season, sources } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? season.data : undefined;
  return (
    <PreparationPage
      title={provider === "lnv" ? "LNV" : "FFVB"}
      refreshing={
        season.isFetching || sources.isFetching || authority.account.isFetching
      }
      refreshEnabled={!editing.create.pending}
      onRefresh={
        authority.sessionStatus === "authenticated"
          ? () => {
              if (editing.create.isPending()) return;
              if (!authority.enabled)
                void authority.account.refetch({ cancelRefetch: false });
              else {
                void season.refetch({ cancelRefetch: false });
                void sources.refetch({ cancelRefetch: false });
              }
            }
          : undefined
      }
    >
      <CollectionAccessFeedback authority={authority} />
      {current && sources.data ? (
        <ProviderPreparationForm
          key={`${authority.session.generation}:${seasonId}:${provider}`}
          season={current}
          provider={provider}
          editing={editing}
        />
      ) : (
        authority.enabled &&
        (season.isError || sources.isError ? (
          <RequestError
            message="Les sources sont indisponibles."
            onRetry={() => {
              void season.refetch();
              void sources.refetch();
            }}
            retrying={season.isFetching || sources.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </PreparationPage>
  );
}
