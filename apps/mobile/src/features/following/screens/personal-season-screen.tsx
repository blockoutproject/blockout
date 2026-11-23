import { useEffect, useEffectEvent } from "react";
import { useRouter } from "expo-router";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ErrorState } from "@/shared/components/state-card";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { PersonalSeasonChoices } from "../components/personal-season-choices";
import { usePersonalSeasonScope } from "../components/personal-season-provider";

/** Home's native route rereads shared options once on opening; a failed required read masks retained choices. */
export function PersonalSeasonScreen() {
  const scope = usePersonalSeasonScope();
  const season = scope?.usable && !scope.blocked ? scope.season : undefined;
  const router = useRouter();
  const refreshOnOpen = useEffectEvent(() => {
    void season?.options.refetch({ cancelRefetch: false });
  });
  useEffect(() => {
    refreshOnOpen();
  }, []);
  return (
    <Sheet title="Saison des suivis" onClose={() => router.back()}>
      <SheetContent>
        {season && hasReadError(season.options) ? (
          <ReadFeedback query={season.options} loadingContent={null} />
        ) : season?.options.data ? (
          <PersonalSeasonChoices
            options={season.options.data}
            seasonId={season.seasonId}
            onSelect={(id) => {
              season.selectSeason(id);
              router.back();
            }}
            onReset={() => {
              season.resetSeason();
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
