import { SportingEntityCardLoading } from "@/features/sporting/entity-card";

/** Three decorative result cards reuse F03 geometry for an initial read without inventing identities or actions. */
export function SearchLoading() {
  return <SportingEntityCardLoading label="Chargement des résultats" />;
}
