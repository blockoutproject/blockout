import { zodResolver } from "@hookform/resolvers/zod";
import { useController, useForm } from "react-hook-form";
import { z } from "zod";
import { SearchQueryText } from "../../../.generated/schemas/index.zod";

const schema = z.object({ search: SearchQueryText });

/** Keeps the draft with the screen and commits valid text only on submit or clear. */
export function useSubmittedSearch(
  search: string | undefined,
  onSearch: (search: string) => void,
) {
  const { control, handleSubmit, reset } = useForm({
    values: { search: search ?? "" },
    resolver: zodResolver(schema),
    mode: "onChange",
  });
  const { field, fieldState } = useController({ control, name: "search" });

  return {
    ref: field.ref,
    value: field.value,
    autoCorrect: false,
    returnKeyType: "search" as const,
    onBlur: field.onBlur,
    error: fieldState.invalid
      ? "La recherche est limitée à 200 caractères."
      : undefined,
    onChangeText: field.onChange,
    onSubmitEditing: () =>
      void handleSubmit(({ search }) => onSearch(search))(),
    onClear: () => {
      reset({ search: "" });
      onSearch("");
    },
  };
}
