import {
  createContext,
  useCallback,
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
function useSportingSelection(
  resource: SearchResourceTypeEnum,
  enabled: boolean,
) {
  const query = useSearchOptions(resource, enabled);
  const [selection, setSelection] = useState<SearchFilters>();
  const [catalogue, setCatalogue] = useState<typeof query.data>();
  // Persist successful disappearance before a later reappearance can revive an obsolete choice.
  // Adjusting this component's state during render prevents issuing a read with obsolete criteria.
  // A new visit waits for the re-enabled read rather than initializing from the paused catalogue.
  if (
    enabled &&
    query.isSuccess &&
    query.isFetchedAfterMount &&
    query.fetchStatus === "idle" &&
    query.data !== catalogue
  ) {
    setCatalogue(query.data);
    setSelection(reconcileSearchFilters(selection, query.data));
  }
  const reset = useCallback(() => {
    setSelection(undefined);
    setCatalogue(undefined);
  }, []);
  return { query, filters: selection, apply: setSelection, reset };
}

/** One visit spans the native search, draft and selection routes; no callback registry or persisted history. */
function useVisit(enter: boolean) {
  const [active, setActive] = useState(enter);
  if (enter && !active) {
    setActive(true);
  }
  const team = useSportingSelection("team", active);
  const pool = useSportingSelection("pool", active);
  const [editing, setEditing] = useState<SearchResourceTypeEnum>("team");
  const draft = useForm<SearchFilters>({
    defaultValues: {},
    resolver: zodResolver(searchFiltersSchema),
  });
  const resetTeam = team.reset;
  const resetPool = pool.reset;
  const resetDraft = draft.reset;
  const resetVisit = useCallback(() => {
    setActive(false);
    resetTeam();
    resetPool();
    setEditing("team");
    resetDraft({});
  }, [resetTeam, resetPool, resetDraft]);
  return { team, pool, editing, setEditing, draft, resetVisit };
}

const SearchVisitContext = createContext<
  ReturnType<typeof useVisit> | undefined
>(undefined);

/** Starts reads on Search entry and retains the visit while its mounted page is covered by another route. */
export function SearchVisitProvider({
  children,
  enter = true,
}: Readonly<PropsWithChildren<{ enter?: boolean }>>) {
  const visit = useVisit(enter);
  return <SearchVisitContext value={visit}>{children}</SearchVisitContext>;
}

/** Reads the single retained search visit shared by its list, criteria and native choice routes. */
export function useSearchVisit() {
  const visit = useContext(SearchVisitContext);
  if (!visit) {
    throw new Error("Search visit provider is required");
  }
  return visit;
}
