import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useCloseCollectionSeason } from "../api/use-collection-controls";
import {
  CollectionAccessFeedback,
  PreparationPage,
} from "../components/preparation-layout";
import { CloseSeasonForm } from "../forms/close-season-form";

/** An ordinary route retains the exact typed season label through refusals and temporary admission removal. */
export function CloseSeasonScreen({ seasonId }: { seasonId: string }) {
  const editing = useCloseCollectionSeason(seasonId);
  const { authority, season } = editing;
  const feedback = useActionFeedback();
  const denied = isAccessDenied(season.error);
  return (
    <PreparationPage
      state={
        !season.data ? (
          !authority.enabled ? (
            <CollectionAccessFeedback authority={authority} />
          ) : denied ? (
            <AccessDenied />
          ) : season.isError ? (
            <RequestError
              message="La saison est indisponible."
              onRetry={() =>
                void season.refetch().then((result) => {
                  if (
                    result.isError &&
                    result.data &&
                    !isAccessDenied(result.error)
                  )
                    feedback.error();
                })
              }
              retrying={season.isFetching}
            />
          ) : (
            <RequestLoading />
          )
        ) : undefined
      }
      title={"Clôturer la saison"}
      refreshing={season.isRefetching || authority.account.isRefetching}
      refreshEnabled={!editing.close.pending}
      onRefresh={
        authority.sessionStatus === "authenticated"
          ? () => {
              if (editing.close.isPending()) return;
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
              }
            }
          : undefined
      }
    >
      <CollectionAccessFeedback authority={authority} />
      {denied && <AccessDenied />}
      {season.data && (
        <CloseSeasonForm
          key={`${authority.session.generation}/${seasonId}`}
          season={season.data}
          editing={editing}
        />
      )}
    </PreparationPage>
  );
}
