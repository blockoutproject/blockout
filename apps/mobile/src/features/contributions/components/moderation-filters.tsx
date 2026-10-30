import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  StreamModerationFilterEnum,
  StreamPlatformEnum,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { SelectField } from "../../../shared/components/select-field";
import { SelectionRow } from "../../../shared/components/selection-row";
import { EntryGroup } from "../../../shared/components/entry-group";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ModerationFiltersLoading } from "./moderation-loading";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  useModerationQueue,
  type ModerationFilters as Filters,
} from "../api/moderation";
import {
  contributionStateLabels,
  streamPlatformLabels,
} from "../model/moderation-presentation";

/** Current committed route criteria initialize only this contextual sheet's local RHF draft. */
export interface ModerationFiltersProps {
  initial: Filters;
}
/** Selects canonical private seasons, platform and exact state with existing F13 controls. */
export function ModerationFilters({ initial }: ModerationFiltersProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const reading = useModerationQueue({ state: "all" });
  const seasons = reading.query.data?.pages[0]?.seasons ?? [];
  const { control, setValue, reset, handleSubmit, getValues } =
    useForm<Filters>({
      defaultValues: initial,
    });
  const values = useWatch({ control });
  // Like search, reconcile only a disappeared canonical season; other draft criteria survive rereads.
  useEffect(() => {
    if (!reading.query.data) return;
    const available = reading.query.data.pages[0]?.seasons ?? [];
    const seasonId = getValues("seasonId");
    if (seasonId && !available.some((season) => season.id === seasonId))
      setValue("seasonId", undefined, { shouldDirty: true });
  }, [reading.query.data, getValues, setValue]);
  const [choice, setChoice] = useState<"seasonId" | "platform" | "state">();
  const stateOptions: [StreamModerationFilterEnum, string][] = [
    ["to-review", "À traiter"],
    ["all", "Tous"],
    ["active", "Publié"],
    ["pending", "En attente de validation"],
    ["hidden", "Masqué après signalements"],
    ["rejected", "Refusé"],
    ["cancelled", "Annulé"],
    ["withdrawn", "Retiré"],
    ["replaced", "Lien remplacé"],
    ["superseded", "Proposition remplacée"],
  ];
  const options =
    choice === "seasonId"
      ? [
          { value: "", label: "Toutes les saisons" },
          ...seasons.map((season) => ({
            value: season.id,
            label: season.label,
          })),
        ]
      : choice === "platform"
        ? [
            { value: "", label: "Toutes les plateformes" },
            ...Object.entries(streamPlatformLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]
        : stateOptions.map(([value, label]) => ({ value, label }));
  /** Applies only the user's explicit sheet draft, preserving literal search text. */
  function apply(filters: Filters) {
    router.dismissTo({
      pathname: "/administration/stream-links",
      params: {
        query: filters.query ?? "",
        seasonId: filters.seasonId ?? "",
        platform: filters.platform ?? "",
        state: filters.state ?? "to-review",
      },
    });
  }
  return (
    <Sheet
      title={
        choice
          ? {
              seasonId: "Saison",
              platform: "Plateforme",
              state: "État du lien",
            }[choice]
          : "Filtres"
      }
      onClose={() => (choice ? setChoice(undefined) : router.back())}
    >
      <SheetContent>
        {!reading.canRetain && reading.profile.isSuccess ? (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            La modération des liens vidéo n’est pas autorisée.
          </Text>
        ) : !reading.allowed || !reading.query.data ? (
          reading.profile.isPending ||
          (reading.allowed && reading.query.isPending) ? (
            <ModerationFiltersLoading />
          ) : (
            <ReadFeedback
              query={!reading.allowed ? reading.profile : reading.query}
            />
          )
        ) : choice ? (
          <EntryGroup>
            {options.map((option) => (
              <SelectionRow
                key={option.value}
                label={option.label}
                selected={(values[choice] ?? "") === option.value}
                onPress={() => {
                  if (choice === "platform")
                    setValue(
                      "platform",
                      option.value
                        ? StreamPlatformEnum.parse(option.value)
                        : undefined,
                    );
                  else if (choice === "state")
                    setValue(
                      "state",
                      StreamModerationFilterEnum.parse(option.value),
                    );
                  else setValue("seasonId", option.value || undefined);
                  setChoice(undefined);
                }}
              />
            ))}
          </EntryGroup>
        ) : (
          <View style={styles.form}>
            <SelectField
              label="Saison"
              value={
                seasons.find((season) => season.id === values.seasonId)
                  ?.label ?? "Toutes les saisons"
              }
              onPress={() => setChoice("seasonId")}
            />
            <SelectField
              label="Plateforme"
              value={
                values.platform
                  ? streamPlatformLabels[values.platform]
                  : "Toutes les plateformes"
              }
              onPress={() => setChoice("platform")}
            />
            <SelectField
              label="État du lien"
              value={
                values.state === "to-review"
                  ? "À traiter"
                  : values.state === "all" || !values.state
                    ? "Tous les états de la sélection"
                    : contributionStateLabels[values.state]
              }
              onPress={() => setChoice("state")}
            />
            <View style={styles.actions}>
              <Button
                label="Appliquer les filtres"
                fullWidth
                onPress={() => void handleSubmit(apply)()}
              />
              <Button
                label="Réinitialiser les filtres"
                fullWidth
                variant="secondary"
                onPress={() =>
                  reset({ query: initial.query, state: "to-review" })
                }
              />
            </View>
          </View>
        )}
      </SheetContent>
    </Sheet>
  );
}
// SearchFilters and SearchFilterChoice own the existing F13 composition reproduced here.
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  actions: { gap: tokens.spacing.sm },
});
