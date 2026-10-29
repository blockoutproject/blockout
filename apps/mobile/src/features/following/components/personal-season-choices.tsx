import type { FollowOptionsResponse } from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { EntryGroup } from "../../../shared/components/entry-group";
import { SelectionRow } from "../../../shared/components/selection-row";

/** Bounded choices use their caller's existing selection; choosing or resetting never creates a second draft. */
export interface PersonalSeasonChoicesProps {
  options: FollowOptionsResponse;
  seasonId?: string;
  onSelect: (seasonId: string | undefined) => void;
  onReset: () => void;
}

/** Shared row/group grammar for the actual offered years, All seasons and the explicit proposed-season reset. */
export function PersonalSeasonChoices({
  options,
  seasonId,
  onSelect,
  onReset,
}: PersonalSeasonChoicesProps) {
  const proposed = options.seasons.find(
    (season) => season.id === options.defaultSeasonId,
  );
  return (
    <>
      <EntryGroup>
        {options.seasons.map((season) => (
          <SelectionRow
            key={season.id}
            label={season.label}
            selected={season.id === seasonId}
            onPress={() => onSelect(season.id)}
          />
        ))}
        <SelectionRow
          label="Toutes les saisons"
          selected={seasonId === undefined}
          onPress={() => onSelect(undefined)}
        />
      </EntryGroup>
      {proposed && proposed.id !== seasonId && (
        <Button
          variant="secondary"
          fullWidth
          label={`Revenir à la saison proposée (${proposed.label})`}
          onPress={onReset}
        />
      )}
    </>
  );
}
