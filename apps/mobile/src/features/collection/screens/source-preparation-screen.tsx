import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useSourcePreparation } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationPage,
} from "../components/preparation-layout";
import { SourceCandidateForm } from "../forms/source-candidate-form";

/** Original source route inputs; its retained form owns draft-discard confirmation. */
export interface SourcePreparationScreenProps {
  seasonId: string;
  sourceId: string;
}

/** Retains a source draft read-only on grant/read failure; identity changes discard the obsolete editor. */
export function SourcePreparationScreen({
  seasonId,
  sourceId,
}: SourcePreparationScreenProps) {
  const editing = useSourcePreparation(seasonId, sourceId);
  const { authority, source, season } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? source.data : undefined;
  return (
    <PreparationPage title={current?.label ?? "Source"}>
      <CollectionAccessFeedback authority={authority} />
      {current && season.data && current.seasonId === seasonId ? (
        <SourceCandidateForm
          key={`${authority.session.generation}:${sourceId}`}
          source={current}
          season={season.data}
          editing={editing}
        />
      ) : (
        authority.enabled &&
        (source.isError ||
        season.isError ||
        (current && current.seasonId !== seasonId) ? (
          <RequestError
            message="La source est indisponible."
            onRetry={() => {
              void source.refetch();
              void season.refetch();
            }}
            retrying={source.isFetching || season.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </PreparationPage>
  );
}
