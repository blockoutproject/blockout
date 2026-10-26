import { ErrorState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { RequestLoading } from "../../../shared/components/request-feedback";
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
  const retained = Boolean(current && sources.data);
  const feedback = useActionFeedback();
  return (
    <PreparationPage
      state={
        !(current && sources.data) ? (
          !authority.enabled ? (
            <CollectionAccessFeedback authority={authority} />
          ) : season.isError || sources.isError ? (
            <ErrorState
              onRetry={() => {
                void season.refetch();
                void sources.refetch();
              }}
              retrying={season.isFetching || sources.isFetching}
            />
          ) : (
            <RequestLoading />
          )
        ) : undefined
      }
      title={provider === "lnv" ? "LNV" : "FFVB"}
      refreshing={
        season.isRefetching ||
        sources.isRefetching ||
        authority.account.isRefetching
      }
      refreshEnabled={!editing.create.pending}
      onRefresh={
        authority.sessionStatus === "authenticated"
          ? () => {
              if (editing.create.isPending()) return;
              if (!authority.enabled)
                void authority.account
                  .refetch({ cancelRefetch: false })
                  .then((result) => {
                    if (result.isError && retained) feedback.error();
                  });
              else {
                void season.refetch({ cancelRefetch: false }).then((result) => {
                  if (result.isError && retained) feedback.error();
                });
                void sources
                  .refetch({ cancelRefetch: false })
                  .then((result) => {
                    if (result.isError && retained) feedback.error();
                  });
              }
            }
          : undefined
      }
    >
      {current && sources.data && (
        <ProviderPreparationForm
          key={`${authority.session.generation}:${seasonId}:${provider}`}
          season={current}
          provider={provider}
          editing={editing}
        />
      )}
    </PreparationPage>
  );
}
