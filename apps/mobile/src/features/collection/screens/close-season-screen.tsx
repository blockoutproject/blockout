import {
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
  return (
    <PreparationPage title="Clôturer la saison">
      <CollectionAccessFeedback authority={authority} />
      {season.data ? (
        <CloseSeasonForm
          key={`${authority.session.generation}/${seasonId}`}
          season={season.data}
          editing={editing}
        />
      ) : (
        authority.enabled &&
        (season.isError ? (
          <RequestError
            message="La saison est indisponible."
            onRetry={() => void season.refetch()}
            retrying={season.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </PreparationPage>
  );
}
