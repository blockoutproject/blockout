import type { FollowOptionsResponse } from "../../../../.generated/schemas/index.zod";
import { Button } from "@/shared/components/button";
import { SelectionList } from "@/shared/components/selection-list";

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
}: Readonly<PersonalSeasonChoicesProps>) {
  const proposed = options.seasons.find(
    (season) => season.id === options.defaultSeasonId,
  );
  return (
    <>
      <SelectionList
        options={[
          ...options.seasons.map(({ id, label }) => ({ value: id, label })),
          { value: undefined, label: "Toutes les saisons" },
        ]}
        selected={seasonId}
        onSelect={onSelect}
      />
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
