import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { SelectField } from "../../../shared/components/select-field";
import { Button } from "../../../shared/components/button";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { tokens } from "../../../shared/theme/tokens";
import {
  formatLabel,
  genderLabel,
} from "../../sporting/classification-presentation";
import { useSearchVisit } from "../forms/search-visit";
import { reconcileSearchFilters } from "../model/search-filters";

/** Approved draft sheet: close discards changes, reset edits the draft, apply commits this tab only. */
export function SearchFilters() {
  const router = useRouter();
  const visit = useSearchVisit();
  const { query, apply, filters } = visit[visit.editing];
  const { reset, getValues } = visit.draft;
  const initialized = useRef(false);
  const values = useWatch({ control: visit.draft.control });
  const options = query.data;
  // Initialize once, then reconcile only disappeared choices; every other editable value survives rereads.
  useEffect(() => {
    if (!options || !filters) return;
    if (!initialized.current) {
      initialized.current = true;
      reset(filters);
      return;
    }
    const current = getValues();
    const next = reconcileSearchFilters(current, options);
    if (
      next.seasonId !== current.seasonId ||
      next.divisionId !== current.divisionId
    )
      reset(next, { keepDirty: true });
  }, [options, filters, getValues, reset]);
  return (
    <Sheet
      title={`Filtrer les ${visit.editing === "team" ? "équipes" : "poules"}`}
      onClose={() => router.back()}
    >
      {!options || !filters ? (
        <ScreenState>
          <ReadFeedback
            query={{ ...query, isPending: query.isPending || query.isFetching }}
          />
        </ScreenState>
      ) : (
        <SheetContent>
          <View style={styles.form}>
            <SelectField
              label="Saison"
              value={
                options.seasons.find((season) => season.id === values.seasonId)
                  ?.label ?? "Toutes les saisons"
              }
              onPress={() => router.push("/search/choice?field=seasonId")}
            />
            <SelectField
              label="Division"
              value={
                options.divisions.find(
                  (division) => division.id === values.divisionId,
                )?.name ?? "Tout afficher"
              }
              onPress={() => router.push("/search/choice?field=divisionId")}
            />
            <SelectField
              label="Format"
              value={formatLabel(values.format) ?? "Tout afficher"}
              onPress={() => router.push("/search/choice?field=format")}
            />
            <SelectField
              label="Genre"
              value={genderLabel(values.gender) ?? "Tout afficher"}
              onPress={() => router.push("/search/choice?field=gender")}
            />
            <View style={styles.actions}>
              <Button
                label="Appliquer les filtres"
                fullWidth
                onPress={() =>
                  void visit.draft.handleSubmit((draft) => {
                    apply(reconcileSearchFilters(draft, options));
                    router.back();
                  })()
                }
              />
              <Button
                label="Réinitialiser les filtres"
                fullWidth
                variant="secondary"
                onPress={() =>
                  visit.draft.reset(reconcileSearchFilters(undefined, options))
                }
              />
            </View>
          </View>
        </SheetContent>
      )}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  actions: { gap: tokens.spacing.sm },
});
