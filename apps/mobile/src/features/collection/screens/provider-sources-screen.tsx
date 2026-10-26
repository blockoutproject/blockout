import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import {
  AccessDenied,
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
  const feedback = useActionFeedback();
  const denied = isAccessDenied(season.error) || isAccessDenied(sources.error);
  return (
    <PreparationPage
      state={
        !(current && sources.data) ? (
          !authority.enabled ? (
            <CollectionAccessFeedback authority={authority} />
          ) : denied ? (
            <AccessDenied />
          ) : season.isError || sources.isError ? (
            <RequestError
              message="Les sources sont indisponibles."
              onRetry={() => {
                void season.refetch().then((result) => {
                  if (
                    result.isError &&
                    result.data &&
                    !isAccessDenied(result.error)
                  )
                    feedback.error();
                });
                void sources.refetch().then((result) => {
                  if (
                    result.isError &&
                    result.data &&
                    !isAccessDenied(result.error)
                  )
                    feedback.error();
                });
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
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  });
              else {
                void season.refetch({ cancelRefetch: false }).then((result) => {
                  if (
                    result.isError &&
                    result.data &&
                    !isAccessDenied(result.error)
                  )
                    feedback.error();
                });
                void sources
                  .refetch({ cancelRefetch: false })
                  .then((result) => {
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  });
              }
            }
          : undefined
      }
    >
      <CollectionAccessFeedback authority={authority} />
      {denied && <AccessDenied />}
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
