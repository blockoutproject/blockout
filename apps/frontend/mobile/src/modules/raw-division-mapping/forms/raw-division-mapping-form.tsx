import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import {
  fontWeight,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { useDivisions } from "@/src/modules/division/hooks/use-divisions";
import { RawDivisionMappingResponse } from "@/src/shared/generated/models";
import {
  FormatEnum,
  FormatLabels,
} from "@/src/shared/view-models/format-labels";
import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";
import { SelectControl } from "@/src/shared/ui/form/select-control";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import FormCard from "@/src/shared/ui/form/form-card";
import { useApis } from "@/src/shared/providers/api-provider";

export type RawDivisionMappingFormState = {
  loading: boolean;
  canSubmit: boolean;
};

export type RawDivisionMappingFormProps = {
  mapping: RawDivisionMappingResponse;
  onSuccess: () => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: RawDivisionMappingFormState) => void;
};

const RawDivisionMappingForm: React.FC<RawDivisionMappingFormProps> = ({
  mapping,
  onSuccess,
  onRegisterSubmit,
  onStateChange,
}) => {
  const theme = useAppTheme();
  const { data: divisions = [], isLoading: loadingDivisions } = useDivisions();
  const { mobile } = useApis();
  const [divisionId, setDivisionId] = useState<number | "">(
    mapping.divisionId ?? "",
  );
  const [format, setFormat] = useState<FormatEnum | "">(mapping.format ?? "");
  const [gender, setGender] = useState<GenderEnum | "">(mapping.gender ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formatOptions: SelectOption<FormatEnum>[] = useMemo(
    () =>
      Object.values(FormatEnum).map((val) => ({
        value: val,
        label: FormatLabels[val],
      })),
    [],
  );
  const genderOptions: SelectOption<GenderEnum>[] = useMemo(
    () =>
      Object.values(GenderEnum).map((val) => ({
        value: val,
        label: GenderLabels[val],
      })),
    [],
  );
  const divisionOptions: SelectOption<number>[] = useMemo(
    () =>
      divisions
        .filter((d) => d.active)
        .map((d) => ({ value: d.id, label: d.name })),
    [divisions],
  );

  const handleSubmit = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    setApiError(null);
    try {
      await mobile.rawDivisionMappings.updateRawDivisionMapping(mapping.id, {
        divisionId: divisionId === "" ? null : divisionId,
        format: format === "" ? null : format,
        gender: gender === "" ? null : gender,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setApiError("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  }, [divisionId, format, gender, mapping.id, mobile, onSuccess]);

  useEffect(() => {
    onRegisterSubmit(handleSubmit);
  }, [handleSubmit, onRegisterSubmit]);

  useEffect(() => {
    onStateChange?.({ loading: isSubmitting, canSubmit: !isSubmitting });
  }, [isSubmitting, onStateChange]);

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.fieldContainer}
        showsVerticalScrollIndicator={false}
        testID="raw-division-mapping-form"
      >
        <FormCard title="Source">
          <View style={styles.sourceBlock}>
            <Text
              style={[styles.sourceName, { color: theme.text }]}
              numberOfLines={2}
            >
              {mapping.rawDivisionName}
            </Text>
            <Text
              style={{
                color: theme.textInactive,
                fontSize: typography.metadata.fontSize,
                fontWeight: fontWeight.semiBold,
              }}
            >
              {mapping.leagueCode} • {mapping.season}
            </Text>
          </View>
        </FormCard>

        <FormCard title="Format">
          <SelectControl
            title="Choisir un format"
            placeholder="Format"
            icon="account-group-outline"
            options={formatOptions}
            selectedValue={format || null}
            onValueChange={(value) => setFormat(value ?? "")}
          />
        </FormCard>

        <FormCard title="Genre">
          <SelectControl
            title="Choisir un genre"
            placeholder="Genre"
            icon="gender-male-female"
            options={genderOptions}
            selectedValue={gender || null}
            onValueChange={(value) => setGender(value ?? "")}
          />
        </FormCard>

        <FormCard title="Division">
          <SelectControl
            title="Choisir une division"
            placeholder="Division"
            icon="trophy-outline"
            options={divisionOptions}
            selectedValue={divisionId || null}
            onValueChange={(value) => setDivisionId(value ?? "")}
            loading={loadingDivisions}
          />
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default RawDivisionMappingForm;

const styles = StyleSheet.create({
  fieldContainer: {
    padding: spacing[2],
    gap: spacing[3],
    paddingBottom: 100,
  },
  sourceBlock: { gap: spacing[1] },
  sourceName: {
    fontSize: typography.control.fontSize,
    fontWeight: fontWeight.bold,
  },
});
