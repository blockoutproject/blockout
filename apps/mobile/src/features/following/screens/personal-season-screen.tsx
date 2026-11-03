import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { ErrorState } from "../../../shared/components/state-card";
import { PersonalSeasonChoices } from "../components/personal-season-choices";
import { usePersonalSeasonScope } from "../components/personal-season-provider";

/** Home's native route rereads options once silently; Query preserves choices or exposes its owner's refusal. */
export function PersonalSeasonScreen() {
  const scope = usePersonalSeasonScope();
  const router = useRouter();
  const opening = useRef(scope);
  useEffect(() => {
    const current = opening.current;
    if (!current?.usable || current.blocked) return;
    void current.season.options.refetch({ cancelRefetch: false });
    // This route's mount is the opening event. Query rerenders must not start another read.
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
