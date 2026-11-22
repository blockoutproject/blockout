import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  StreamModerationFilterEnum,
  StreamPlatformEnum,
} from "../../../../.generated/schemas/index.zod";
import { FilterSheetActions } from "@/shared/components/filter-sheet-actions";
import { SelectField } from "@/shared/components/select-field";
import { SelectionList } from "@/shared/components/selection-list";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ReadFeedback } from "@/shared/components/read-feedback";
import { ModerationFiltersLoading } from "./moderation-loading";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { AccountSessionFeedback } from "@/features/accounts/current-account";
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

/** Selects private criteria with existing F13 controls; F05 recovers the session before private choices load. */
export function ModerationFilters({
  initial,
}: Readonly<ModerationFiltersProps>) {
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
    if (!reading.query.data) {
      return;
    }
    const available = reading.query.data.pages[0]?.seasons ?? [];
    const seasonId = getValues("seasonId");
    if (seasonId && !available.some((season) => season.id === seasonId)) {
      setValue("seasonId", undefined, { shouldDirty: true });
    }
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

  /** Builds only the selected contextual filter choices. */
  function choiceOptions() {
    if (choice === "seasonId") {
      return [
        { value: "", label: "Toutes les saisons" },
        ...seasons.map((season) => ({
          value: season.id,
          label: season.label,
        })),
      ];
    }
    if (choice === "platform") {
      return [
        { value: "", label: "Toutes les plateformes" },
        ...Object.entries(streamPlatformLabels).map(([value, label]) => ({
          value,
          label,
        })),
      ];
    }
    return stateOptions.map(([value, label]) => ({ value, label }));
  }

  const options = choiceOptions();

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

  /** Keeps default moderation state wording distinct from a specific lifecycle filter. */
  function stateLabel() {
    if (values.state === "to-review") {
      return "À traiter";
    }
    if (values.state === "all" || !values.state) {
      return "Tous les états de la sélection";
    }
    return contributionStateLabels[values.state];
  }

  /** Recovers private-read admission before rendering the current filter draft. */
  function renderFilterContent() {
    if (reading.session.status !== "authenticated") {
      return (
        <AccountSessionFeedback loadingContent={<ModerationFiltersLoading />} />
      );
    }
    if (!reading.canRetain && reading.account.isSuccess) {
      return (
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          La modération des liens vidéo n’est pas autorisée.
        </Text>
      );
    }
    if (
      !reading.canRetain ||
      !reading.query.data ||
      reading.query.isError ||
      reading.account.isError
    ) {
      const read =
        reading.account.isError || reading.account.isPending
          ? reading.account
          : reading.query;
      return (
        <ReadFeedback
          loadingContent={<ModerationFiltersLoading />}
          query={read}
          onRetry={() => read.refetch({ cancelRefetch: false })}
        />
      );
    }
    if (choice) {
      return (
        <SelectionList
          options={options}
          selected={values[choice] ?? ""}
          onSelect={(value) => {
            if (choice === "platform") {
              setValue(
                "platform",
                value ? StreamPlatformEnum.parse(value) : undefined,
              );
            } else if (choice === "state") {
              setValue("state", StreamModerationFilterEnum.parse(value));
            } else {
              setValue("seasonId", value || undefined);
            }
            setChoice(undefined);
          }}
        />
      );
    }
    return (
      <View style={styles.form}>
        <SelectField
          label="Saison"
          value={
            seasons.find((season) => season.id === values.seasonId)?.label ??
            "Toutes les saisons"
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
          value={stateLabel()}
          onPress={() => setChoice("state")}
        />
        <FilterSheetActions
          onApply={() => void handleSubmit(apply)()}
          onReset={() => reset({ query: initial.query, state: "to-review" })}
        />
      </View>
    );
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
      <SheetContent>{renderFilterContent()}</SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
});
