import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from "react";
import { useForm, useFormState, type UseFormReturn } from "react-hook-form";
import { usePreventRemove } from "expo-router";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SupportContextRequest } from "../../../../.generated/schemas/index.zod";
import { supportSchema, type SupportValues } from "../schemas/support-schema";
import { supportValues } from "./support-values";

/** One RHF draft shared by the form and its native choice routes within this visit. */
interface SupportVisit {
  form: UseFormReturn<SupportValues>;
  context: SupportContextRequest;
}
const SupportVisitContext = createContext<SupportVisit | undefined>(undefined);

/** Reliable optional facts and known contact; the parent replaces the visit on native principal changes. */
export interface SupportVisitProviderProps extends PropsWithChildren {
  context: SupportContextRequest;
  replyEmail: string;
}

/** Owns the current in-memory draft; late contact arrival never replaces an edited or deliberately cleared address. */
export function SupportVisitProvider({
  context,
  replyEmail,
  children,
}: SupportVisitProviderProps) {
  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: supportValues(context, replyEmail),
  });
  const { getFieldState, getValues, setValue } = form;
  const { isDirty, isSubmitting } = useFormState({ control: form.control });
  const confirm = useActionConfirmation();
  usePreventRemove(isDirty, async ({ repeat }) => {
    const accepted = await confirm({
      title: isSubmitting
        ? "Quitter pendant l’envoi ?"
        : "Abandonner les modifications ?",
      message: isSubmitting
        ? "Votre demande a peut-être été reçue. Quitter ne garantit pas l’annulation de l’envoi."
        : "Le texte et les images de cette demande seront perdus.",
      confirmLabel: isSubmitting ? "Quitter" : "Abandonner",
      cancelLabel: "Continuer la saisie",
      destructive: true,
    });
    if (accepted) {
      form.reset();
      repeat();
    }
  });
  useEffect(() => {
    const state = getFieldState("replyEmail");
    if (
      replyEmail &&
      !state.isDirty &&
      !state.isTouched &&
      !getValues("replyEmail")
    )
      setValue("replyEmail", replyEmail);
  }, [replyEmail, getFieldState, getValues, setValue]);
  return (
    <SupportVisitContext value={{ form, context }}>
      {children}
    </SupportVisitContext>
  );
}

/** Requires this route-owned visit; no private draft is shared with another feature or restart. */
export function useSupportVisit() {
  const visit = useContext(SupportVisitContext);
  if (!visit) throw new Error("Support visit provider is required");
  return visit;
}
