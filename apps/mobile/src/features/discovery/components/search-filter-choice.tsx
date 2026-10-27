import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useWatch } from "react-hook-form";
import { Pressable, StyleSheet, Text } from "react-native";
import {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../../.generated/schemas/index.zod";
import { Sheet } from "../../../shared/components/sheet";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ErrorState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
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
  const { colors } = useTheme();
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
        <ErrorState />
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
                  label: formatLabel(format),
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
        <ReadFeedback
          query={{ ...query, isPending: query.isPending || query.isFetching }}
        />
      )}
      {choices.map((choice) => (
        <Pressable
          key={choice.value ?? "all"}
          accessibilityRole="radio"
          accessibilityLabel={choice.label}
          accessibilityState={{ checked: values[field] === choice.value }}
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
              visit.draft.setValue(field, choice.value, { shouldDirty: true });
            router.back();
          }}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: colors.border,
              opacity: pressed ? tokens.opacity.pressed : 1,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>
            {choice.label}
          </Text>
          {values[field] === choice.value && (
            <Check
              accessible={false}
              size={tokens.size.icon.md}
              color={colors.icon}
            />
          )}
        </Pressable>
      ))}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  option: {
    minHeight: tokens.size.control.default,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: tokens.border.thin,
  },
  label: { ...tokens.typography.strong, flex: 1 },
});
