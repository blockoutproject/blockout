import { useLocalSearchParams, useRouter } from "expo-router";
import { useWatch } from "react-hook-form";
import {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../../.generated/schemas/index.zod";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ErrorState } from "../../../shared/components/state-card";
import { EntryGroup } from "../../../shared/components/entry-group";
import { SelectionRow } from "../../../shared/components/selection-row";
import {
  formatLabel,
  sportingGenderLabels,
} from "../../sporting/classification-presentation";
import { useSearchVisit } from "../forms/search-visit";

/** Native optional single selection; choosing a value changes the RHF draft without applying it. */
export function SearchFilterChoice() {
  const { field } = useLocalSearchParams<{ field?: string }>();
  const router = useRouter();
  const visit = useSearchVisit();
  const { query, filters } = visit[visit.editing];
  const values = useWatch({ control: visit.draft.control });
  if (
    field !== "seasonId" &&
    field !== "divisionId" &&
    field !== "format" &&
    field !== "gender"
  )
    return (
      <Sheet title="Filtres" onClose={() => router.back()}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  const title = {
    seasonId: "Saison",
    divisionId: "Division",
    format: "Format",
    gender: "Genre",
  }[field];
  const options = filters ? query.data : undefined;
  const choices = options
    ? [
        {
          value: undefined,
          label: field === "seasonId" ? "Toutes les saisons" : "Tout afficher",
        },
        ...(field === "seasonId"
          ? options.seasons.map((season) => ({
              value: season.id,
              label: season.label,
            }))
          : field === "divisionId"
            ? options.divisions.map((division) => ({
                value: division.id,
                label: division.name,
              }))
            : field === "format"
              ? options.formats.map((format) => ({
                  value: format,
                  label: formatLabel(format)!,
                }))
              : options.genders.map((gender) => ({
                  value: gender,
                  label: sportingGenderLabels[gender],
                }))),
      ]
    : [];
  return (
    <Sheet title={title} onClose={() => router.back()}>
      {!options && (
        <SheetContent>
          <ReadFeedback
            query={{ ...query, isPending: query.isPending || query.isFetching }}
          />
        </SheetContent>
      )}
      {options && (
        <SheetContent>
          <EntryGroup>
            {choices.map((choice) => (
              <SelectionRow
                key={choice.value ?? "all"}
                label={choice.label}
                selected={values[field] === choice.value}
                onPress={() => {
                  if (field === "format")
                    visit.draft.setValue(
                      field,
                      choice.value === undefined
                        ? undefined
                        : SportFormatEnum.parse(choice.value),
                      { shouldDirty: true },
                    );
                  else if (field === "gender")
                    visit.draft.setValue(
                      field,
                      choice.value === undefined
                        ? undefined
                        : SportGenderEnum.parse(choice.value),
                      { shouldDirty: true },
                    );
                  else
                    visit.draft.setValue(field, choice.value, {
                      shouldDirty: true,
                    });
                  router.back();
                }}
              />
            ))}
          </EntryGroup>
        </SheetContent>
      )}
    </Sheet>
  );
}
