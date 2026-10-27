import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SearchResourceTypeEnum } from "../../../../.generated/schemas/index.zod";
import { useSearchOptions } from "../api/use-search-options";
import {
  reconcileSearchFilters,
  searchFiltersSchema,
  type SearchFilters,
} from "../model/search-filters";

/** Remembers accepted criteria, with undefined reserved for a new visit's uninitialized selection. */
function useSportingSelection(resource: SearchResourceTypeEnum) {
  const query = useSearchOptions(resource);
  const [selection, setSelection] = useState<SearchFilters>();
  const [catalogue, setCatalogue] = useState<typeof query.data>();
  // Persist successful disappearance before a later reappearance can revive an obsolete choice.
  // Adjusting this component's state during render prevents issuing a read with obsolete criteria.
  if (
    query.isSuccess &&
    query.isFetchedAfterMount &&
    query.data !== catalogue
  ) {
    setCatalogue(query.data);
    setSelection(reconcileSearchFilters(selection, query.data));
  }
  return { query, filters: selection, apply: setSelection };
}

/** One visit spans the native search, draft and selection routes; no callback registry or persisted history. */
function useVisit() {
  const team = useSportingSelection("team");
  const pool = useSportingSelection("pool");
  const [editing, setEditing] = useState<SearchResourceTypeEnum>("team");
  const draft = useForm<SearchFilters>({
    defaultValues: {},
    resolver: zodResolver(searchFiltersSchema),
  });
  return { team, pool, editing, setEditing, draft };
}
const SearchVisitContext = createContext<
  ReturnType<typeof useVisit> | undefined
>(undefined);

/** Keeps applied tab criteria and the editable RHF snapshot alive while native sheets cover the list. */
export function SearchVisitProvider({ children }: PropsWithChildren) {
  const visit = useVisit();
  return <SearchVisitContext value={visit}>{children}</SearchVisitContext>;
}

/** Requires the search route's visit lifetime; unrelated routes never share its filter draft. */
export function useSearchVisit() {
  const visit = useContext(SearchVisitContext);
  if (!visit) throw new Error("Search visit provider is required");
  return visit;
}
