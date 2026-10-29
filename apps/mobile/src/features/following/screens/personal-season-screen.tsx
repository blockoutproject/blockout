import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { ErrorState } from "../../../shared/components/state-card";
import { PersonalSeasonChoices } from "../components/personal-season-choices";
import { usePersonalSeasonScope } from "../components/personal-season-provider";

/** Home's native route rereads options once on opening and preserves the live owner through a transient failure. */
export function PersonalSeasonScreen() {
  const scope = usePersonalSeasonScope();
  const router = useRouter();
  const feedback = useActionFeedback();
  const opening = useRef(scope);
  useEffect(() => {
    const current = opening.current;
    if (!current) return;
    void current.season.options
      .refetch({ cancelRefetch: false, throwOnError: true })
      .catch((error: unknown) => {
        if (
          current.owner.isCurrent(current.owner.generation) &&
          !(error instanceof ApiError && error.kind === "cancelled")
        )
          feedback.error();
      });
    // This route's mount is the opening event. Query/feedback rerenders must not start another read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Sheet title="Saison des suivis" onClose={() => router.back()}>
      <SheetContent>
        {scope?.usable && !scope.blocked && scope.season.options.data ? (
          <PersonalSeasonChoices
            options={scope.season.options.data}
            seasonId={scope.season.seasonId}
            onSelect={(id) => {
              scope.season.selectSeason(id);
              router.back();
            }}
            onReset={() => {
              scope.season.resetSeason();
              router.back();
            }}
          />
        ) : (
          <ErrorState />
        )}
      </SheetContent>
    </Sheet>
  );
}
