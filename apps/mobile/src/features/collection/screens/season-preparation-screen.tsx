import { useRouter } from "expo-router";
import { Globe, Trophy } from "lucide-react-native";
import { Text } from "react-native";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSeasonPreparation } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationLink,
  PreparationPage,
  seasonStatus,
} from "../components/preparation-layout";

/** Opens each official provider's source preparation, including unlaunched sources in an active season. */
export function SeasonPreparationScreen({ seasonId }: { seasonId: string }) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season } = editing;
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <PreparationPage title={season.data?.label ?? "Saison"}>
      <CollectionAccessFeedback authority={authority} />
      {authority.enabled &&
        (season.data ? (
          <>
            <Text style={[tokens.typography.strong, { color: colors.text }]}>
              Collectes de la saison · {seasonStatus(season.data)}
            </Text>
            <PreparationLink
              label="FFVB"
              detail="National, régional et départemental"
              icon={Globe}
              onPress={() =>
                router.push({
                  pathname: "/collection/[seasonId]/[provider]",
                  params: { seasonId, provider: "ffvb" },
                })
              }
            />
            <PreparationLink
              label="LNV"
              detail="Les trois championnats professionnels"
              icon={Trophy}
              onPress={() =>
                router.push({
                  pathname: "/collection/[seasonId]/[provider]",
                  params: { seasonId, provider: "lnv" },
                })
              }
            />
          </>
        ) : season.isError ? (
          <RequestError
            message="La saison est indisponible."
            onRetry={() => void season.refetch()}
            retrying={season.isFetching}
          />
        ) : (
          <RequestLoading />
        ))}
    </PreparationPage>
  );
}
