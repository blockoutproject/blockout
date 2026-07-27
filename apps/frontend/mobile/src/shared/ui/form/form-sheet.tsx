import type {
  BottomSheetFooterProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import BottomSheetCustomModal, {
  type BottomSheetModalPropsEx,
} from "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-modal";
import type { ActionProps, ActionVariant } from "@/src/shared/ui/action";
import BottomSheetFormFooter, {
  type BottomSheetFormFooterProps,
} from "@/src/shared/ui/form/bottom-sheet-form-footer";

export type FormSheetBinding = {
  submit: () => Promise<void> | void;
  loading: boolean;
  canSubmit: boolean;
  gradient?: ActionProps["gradient"];
};

type FormSheetContextValue = {
  registerSubmit: (submit: () => Promise<void> | void) => () => void;
  updateFooterState: (state: Omit<FormSheetBinding, "submit">) => void;
};

const FormSheetContext = createContext<FormSheetContextValue | null>(null);

const EMPTY_SUBMIT = () => undefined;

export function useFormSheetBinding({
  submit,
  loading,
  canSubmit,
  gradient,
}: FormSheetBinding) {
  const context = useContext(FormSheetContext);

  if (!context) {
    throw new Error("useFormSheetBinding must be used inside FormSheet");
  }

  useLayoutEffect(() => context.registerSubmit(submit), [context, submit]);

  useLayoutEffect(() => {
    context.updateFooterState({ loading, canSubmit, gradient });
  }, [canSubmit, context, gradient, loading]);
}

export type FormSheetProps = Omit<
  BottomSheetModalPropsEx,
  "footerComponent"
> & {
  ref?: React.Ref<BottomSheetModal>;
  footerLabel: string;
  footerVariant?: ActionVariant;
  footerIcon?: BottomSheetFormFooterProps["icon"];
  footerActionTestID?: string;
};

export function FormSheet({
  children,
  footerLabel,
  footerVariant,
  footerIcon,
  footerActionTestID,
  ...modalProps
}: FormSheetProps) {
  const submitRef = useRef<() => Promise<void> | void>(EMPTY_SUBMIT);
  const [footerState, setFooterState] = useState<
    Omit<FormSheetBinding, "submit">
  >({
    loading: false,
    canSubmit: false,
  });

  const registerSubmit = useCallback((submit: () => Promise<void> | void) => {
    submitRef.current = submit;

    return () => {
      if (submitRef.current === submit) {
        submitRef.current = EMPTY_SUBMIT;
      }
    };
  }, []);

  const updateFooterState = useCallback(
    (nextState: Omit<FormSheetBinding, "submit">) => {
      setFooterState((currentState) => {
        const currentGradient = currentState.gradient;
        const nextGradient = nextState.gradient;
        const sameGradient =
          currentGradient === nextGradient ||
          (currentGradient?.length === nextGradient?.length &&
            currentGradient?.every(
              (color, index) => color === nextGradient?.[index],
            ));

        if (
          currentState.loading === nextState.loading &&
          currentState.canSubmit === nextState.canSubmit &&
          sameGradient
        ) {
          return currentState;
        }

        return nextState;
      });
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ registerSubmit, updateFooterState }),
    [registerSubmit, updateFooterState],
  );

  const handleSubmit = useCallback(() => {
    return submitRef.current();
  }, []);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFormFooter
        {...props}
        label={footerLabel}
        loading={footerState.loading}
        disabled={!footerState.canSubmit}
        onPress={handleSubmit}
        variant={footerVariant}
        gradient={footerState.gradient}
        icon={footerIcon}
        actionTestID={footerActionTestID}
      />
    ),
    [
      footerActionTestID,
      footerIcon,
      footerLabel,
      footerState.canSubmit,
      footerState.gradient,
      footerState.loading,
      footerVariant,
      handleSubmit,
    ],
  );

  return (
    <FormSheetContext.Provider value={contextValue}>
      <BottomSheetCustomModal {...modalProps} footerComponent={renderFooter}>
        {children}
      </BottomSheetCustomModal>
    </FormSheetContext.Provider>
  );
}
