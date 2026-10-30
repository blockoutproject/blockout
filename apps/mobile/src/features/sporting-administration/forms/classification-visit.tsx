import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ClassificationTarget } from "../api/classification";
import type { ClassificationValues } from "../schemas/classification-schema";

/** A sibling choice sheet borrows only the currently mounted form's control. */
interface ClassificationVisit {
  target: ClassificationTarget;
  form: UseFormReturn<ClassificationValues>;
}
const VisitContext = createContext<
  | {
      visit: ClassificationVisit | undefined;
      setVisit: Dispatch<SetStateAction<ClassificationVisit | undefined>>;
    }
  | undefined
>(undefined);
/** Supplies live route context; it retains no form after the owning route unmounts. */
export function ClassificationVisitProvider({ children }: PropsWithChildren) {
  const [visit, setVisit] = useState<ClassificationVisit>();
  return <VisitContext value={{ visit, setVisit }}>{children}</VisitContext>;
}
/** Returns the optional live form context used by the parent and its sibling choice sheet. */
export function useClassificationVisit() {
  return useContext(VisitContext);
}
