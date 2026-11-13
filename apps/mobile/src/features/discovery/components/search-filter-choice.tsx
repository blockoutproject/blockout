import { useLocalSearchParams, useRouter } from "expo-router";
import { useWatch } from "react-hook-form";
import {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../../.generated/schemas/index.zod";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ListLoading } from "@/shared/components/list-loading";
import { ErrorState } from "@/shared/components/state-card";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { EntryGroup } from "@/shared/components/entry-group";
import { SelectionRow } from "@/shared/components/selection-row";
import {
  formatLabel,
  sportingGenderLabels,
} from "@/features/sporting/classification-presentation";
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
  ) {
    return (
      <Sheet title="Filtres" onClose={() => router.back()}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  }
  const title = {
    seasonId: "Saison",
    divisionId: "Division",
    format: "Format",
    gender: "Genre",
  }[field];
  const options = filters ? query.data : undefined;
  let choices: { value: string | undefined; label: string }[] = [];
  if (options) {
    const available = {
      seasonId: options.seasons.map((season) => ({
        value: season.id,
        label: season.label,
      })),
      divisionId: options.divisions.map((division) => ({
        value: division.id,
        label: division.name,
      })),
      format: options.formats.map((format) => ({
        value: format,
        label: formatLabel(format)!,
      })),
      gender: options.genders.map((gender) => ({
        value: gender,
        label: sportingGenderLabels[gender],
      })),
    };
    choices = [
      {
        value: undefined,
        label: field === "seasonId" ? "Toutes les saisons" : "Tout afficher",
      },
      ...available[field],
    ];
  }
  const loadingContent = (
    <EntryGroup>
      <ListLoading label="Chargement des choix" />
    </EntryGroup>
  );
  return (
    <Sheet title={title} onClose={() => router.back()}>
      {hasReadError(query) || !options ? (
        <SheetContent>
          {!filters && !hasReadError(query) && query.isFetching ? (
            loadingContent
          ) : (
            <ReadFeedback query={query} loadingContent={loadingContent} />
          )}
        </SheetContent>
      ) : (
        <SheetContent>
          <EntryGroup>
            {choices.map((choice) => (
              <SelectionRow
                key={choice.value ?? "all"}
                label={choice.label}
                selected={values[field] === choice.value}
                onPress={() => {
                  if (field === "format") {
                    visit.draft.setValue(
                      field,
                      choice.value === undefined
                        ? undefined
                        : SportFormatEnum.parse(choice.value),
                      { shouldDirty: true },
                    );
                  } else if (field === "gender") {
                    visit.draft.setValue(
                      field,
                      choice.value === undefined
                        ? undefined
                        : SportGenderEnum.parse(choice.value),
                      { shouldDirty: true },
                    );
                  } else {
                    visit.draft.setValue(field, choice.value, {
                      shouldDirty: true,
                    });
                  }
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
