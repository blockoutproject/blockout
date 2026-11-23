import { Globe, Trophy, type LucideIcon } from "lucide-react-native";
import type {
  CollectionFamilyEnum,
  CollectionProviderEnum,
} from "../../../../.generated/schemas/index.zod";
import type { ClubCollectionFamily } from "./collection-club-family";

/** Each competition provider needs an operator destination, control family and catalogue interpretation. */
export const collectionOperatorSources: Record<
  CollectionProviderEnum,
  {
    label: string;
    detail: string;
    icon: LucideIcon;
    controlFamily: Exclude<CollectionFamilyEnum, ClubCollectionFamily>;
    sourceGrouping: "scope" | "championships";
    catalogue: "packs" | "phases";
  }
> = {
  ffvb: {
    label: "FFVB",
    detail: "National, régional et départemental",
    icon: Globe,
    controlFamily: "ffvb",
    sourceGrouping: "scope",
    catalogue: "packs",
  },
  lnv: {
    label: "LNV",
    detail: "Les trois championnats professionnels",
    icon: Trophy,
    controlFamily: "lnv",
    sourceGrouping: "championships",
    catalogue: "phases",
  },
};

export function supportsSourceScopeFilter(provider: CollectionProviderEnum) {
  return collectionOperatorSources[provider].sourceGrouping === "scope";
}

export function collectionProviderSubtitle(
  provider: CollectionProviderEnum,
  seasonLabel?: string,
) {
  const { label } = collectionOperatorSources[provider];
  return seasonLabel ? `${label}  ${seasonLabel}` : label;
}
