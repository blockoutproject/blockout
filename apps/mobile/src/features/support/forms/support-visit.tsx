import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
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

/** Reliable optional facts and known contact; the parent replaces the visit on F05 generation changes. */
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
