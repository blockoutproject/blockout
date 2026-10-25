import { useRouter } from "expo-router";
import { Globe, Trophy } from "lucide-react-native";
import { Text } from "react-native";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useCollectionSeason } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationLink,
  PreparationPage,
  seasonStatus,
} from "../components/preparation-layout";

/** Opens seasonal provider controls, their separate preparation destinations and definitive closure. */
export function SeasonPreparationScreen({ seasonId }: { seasonId: string }) {
  const { authority, season } = useCollectionSeason(seasonId);
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
                  pathname: "/collection/[seasonId]/controls/[provider]",
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
                  pathname: "/collection/[seasonId]/controls/[provider]",
                  params: { seasonId, provider: "lnv" },
                })
              }
            />
            {season.data.state !== "closed" && (
              <Button
                label="Clôturer la saison"
                variant="secondary"
                disabled={season.isError || season.isFetching}
                onPress={() =>
                  router.push({
                    pathname: "/collection/[seasonId]/closure",
                    params: { seasonId },
                  })
                }
              />
            )}
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
