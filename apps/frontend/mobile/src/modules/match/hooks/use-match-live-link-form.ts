import { useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import { useFormik } from "formik";
import * as Yup from "yup";

import { useApis } from "@/src/shared/providers/api-provider";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import { getMatchLiveLinkErrorMessage } from "@/src/modules/match/view-models/match-live-link-errors";

type MatchLiveLinkFormValues = {
  url: string;
};

const validationSchema = Yup.object({
  url: Yup.string().trim().required("Lien requis"),
});

/**
 * Owns live-link validation, command execution, and form-sheet submission
 * binding while leaving form layout to the presentation component.
 */
export function useMatchLiveLinkForm({
  initialUrl,
  isBeforeLiveWindow,
  matchId,
  onSuccess,
}: {
  initialUrl?: string | null;
  isBeforeLiveWindow: boolean;
  matchId: number;
  onSuccess: () => void;
}) {
  const { mobile } = useApis();
  const { allowed: isModerator } = useHasScopes(["moderate:match_live_link"]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik<MatchLiveLinkFormValues>({
    initialValues: { url: initialUrl ?? "" },
    validationSchema,
    validateOnMount: true,
    onSubmit: async (values) => {
      if (isBeforeLiveWindow && !isModerator) {
        return;
      }

      const trimmed = values.url.trim();
      if (!trimmed) {
        return;
      }

      try {
        setLoading(true);
        setApiError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await mobile.matches.upsertMatchLiveLink(matchId, { url: trimmed });
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess();
      } catch (error) {
        setApiError(getMatchLiveLinkErrorMessage(error));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
  });

  const canSubmit = useMemo(
    () =>
      formik.isValid &&
      Boolean(formik.values.url.trim()) &&
      !loading &&
      (!isBeforeLiveWindow || isModerator),
    [
      formik.isValid,
      formik.values.url,
      isBeforeLiveWindow,
      isModerator,
      loading,
    ],
  );

  useFormSheetBinding({
    submit: formik.submitForm,
    loading,
    canSubmit,
  });

  return {
    apiError,
    canSubmit,
    formik,
    isModerator,
    loading,
    setApiError,
  };
}
