import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/src/context/ThemeProvider';
import type { LegalDocument } from '@/src/types/LegalDocument';
import ApiErrorToast from '@/src/components/common/feedback/ApiErrorToast';
import FormCard from '@/src/components/common/form/FormCard';
import Field from '@/src/components/common/form/Field';
import SheetTextInput from '@/src/components/common/form/SheetTextInput';
import { useUpdateMobileLegalDocument } from '@/src/api/generated/mobile-gateway/endpoints/mobile-legal-documents/mobile-legal-documents';
import { UpdateMobileLegalDocumentBody } from '@/src/api/generated/mobile-gateway/schemas/mobile-legal-documents/mobile-legal-documents.zod';
import { Controller, useForm, zodResolver } from '@/src/forms';
import {
  legalDocumentFormDefaults,
  legalDocumentFormSchema,
  toUpdateMobileLegalDocumentRequest,
  type LegalDocumentFormValues,
} from './legalDocumentFormContract';

export type LegalDocumentFormExternalState = {
  loading: boolean;
  canSubmit: boolean;
};

export type LegalDocumentFormProps = {
  document: LegalDocument;
  onSuccess: () => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: LegalDocumentFormExternalState) => void;
};

const LegalDocumentForm: React.FC<LegalDocumentFormProps> = ({
  document,
  onSuccess,
  onRegisterSubmit,
  onStateChange,
}) => {
  const theme = useAppTheme();
  const [apiError, setApiError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useUpdateMobileLegalDocument();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<LegalDocumentFormValues>({
    resolver: zodResolver(legalDocumentFormSchema),
    mode: 'onChange',
    defaultValues: legalDocumentFormDefaults(document),
  });

  useEffect(() => {
    reset(legalDocumentFormDefaults(document));
  }, [document, reset]);

  const onSubmit = useCallback(
    async (values: LegalDocumentFormValues) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setApiError(null);
        const request = toUpdateMobileLegalDocumentRequest(values);
        await mutateAsync({
          type: document.type,
          data: UpdateMobileLegalDocumentBody.parse(request),
        });
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess();
      } catch {
        setApiError('Erreur lors de la sauvegarde.');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [document.type, mutateAsync, onSuccess],
  );

  const submitForm = useMemo(
    () => handleSubmit(onSubmit),
    [handleSubmit, onSubmit],
  );

  useEffect(() => {
    onRegisterSubmit(() => {
      void submitForm();
    });
  }, [onRegisterSubmit, submitForm]);

  const loading = isPending;
  const canSubmit = isValid && !loading;

  useEffect(() => {
    onStateChange?.({ loading, canSubmit });
  }, [loading, canSubmit, onStateChange]);

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FormCard>
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Field label="Titre" fieldState={fieldState}>
                <SheetTextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Titre"
                  style={
                    fieldState.isTouched && fieldState.error
                      ? { borderColor: theme.error }
                      : undefined
                  }
                />
              </Field>
            )}
          />
        </FormCard>

        <FormCard>
          <Controller
            control={control}
            name="version"
            render={({ field, fieldState }) => (
              <Field label="Version" fieldState={fieldState}>
                <SheetTextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="2025-08-08"
                  style={
                    fieldState.isTouched && fieldState.error
                      ? { borderColor: theme.error }
                      : undefined
                  }
                />
              </Field>
            )}
          />
        </FormCard>

        <FormCard>
          <Controller
            control={control}
            name="content"
            render={({ field, fieldState }) => (
              <Field label="Contenu (Markdown)" fieldState={fieldState}>
                <SheetTextInput
                  multiline
                  scrollEnabled
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Contenu du document légal..."
                  style={[
                    styles.contentInput,
                    fieldState.isTouched && fieldState.error
                      ? { borderColor: theme.error }
                      : undefined,
                  ]}
                />
              </Field>
            )}
          />
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default LegalDocumentForm;

const styles = StyleSheet.create({
  content: { padding: 8, paddingBottom: 100, gap: 12 },
  contentInput: {
    maxHeight: 300,
    textAlignVertical: 'top',
    minHeight: 180,
  },
});
