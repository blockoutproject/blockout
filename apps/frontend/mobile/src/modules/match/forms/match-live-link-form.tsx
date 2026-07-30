import React, { useMemo } from "react";

import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import { useMatchLiveLinkForm } from "@/src/modules/match/hooks/use-match-live-link-form";
import MatchLiveLinkFormContent from "@/src/modules/match/forms/match-live-link-form-content";
import { createMatchLiveLinkFormPresentation } from "@/src/modules/match/view-models/match-live-link-form-presentation";

export type MatchLiveLinkFormProps = {
  matchId: number;
  isMatchFinished: boolean;
  initialUrl?: string | null;
  onSuccess: () => void;
  isBeforeLiveWindow?: boolean;
};

const MatchLiveLinkForm: React.FC<MatchLiveLinkFormProps> = ({
  matchId,
  isMatchFinished,
  initialUrl,
  onSuccess,
  isBeforeLiveWindow = false,
}) => {
  const { apiError, formik, isModerator, loading, setApiError } =
    useMatchLiveLinkForm({
      initialUrl,
      isBeforeLiveWindow,
      matchId,
      onSuccess,
    });
  const presentation = useMemo(
    () =>
      createMatchLiveLinkFormPresentation({
        hasExisting: Boolean(initialUrl),
        isBeforeLiveWindow,
        isMatchFinished,
        isModerator,
      }),
    [initialUrl, isBeforeLiveWindow, isMatchFinished, isModerator],
  );

  return (
    <>
      <MatchLiveLinkFormContent
        error={formik.errors.url}
        loading={loading}
        onBlur={formik.handleBlur("url")}
        onChangeText={formik.handleChange("url")}
        presentation={presentation}
        touched={formik.touched.url}
        url={formik.values.url}
      />
      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default MatchLiveLinkForm;
