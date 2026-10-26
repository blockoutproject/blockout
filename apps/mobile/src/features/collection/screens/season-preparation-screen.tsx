import { isAccessDenied } from "../../../shared/api/access-denied";
import { useRouter } from "expo-router";
import { Globe, Trophy } from "lucide-react-native";
import { Text } from "react-native";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import {
  AccessDenied,
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

/** Opens seasonal controls, source preparation and definitive closure after current admission. */
export function SeasonPreparationScreen({ seasonId }: { seasonId: string }) {
  const { authority, season } = useCollectionSeason(seasonId);
  const router = useRouter();
  const { colors } = useTheme();
  const feedback = useActionFeedback();
  /** Refreshes only this season or its grant, retaining authorized content after a technical failure. */
  async function refresh() {
    const result = authority.enabled
      ? await season.refetch({ cancelRefetch: false })
      : await authority.account.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  return (
    <PreparationPage
      title={season.data?.label ?? "Saison"}
      state={
        !authority.enabled ? (
          <CollectionAccessFeedback authority={authority} />
        ) : isAccessDenied(season.error) ? (
          <AccessDenied />
        ) : !season.data ? (
          season.isError ? (
            <RequestError
              message="La saison est indisponible."
              onRetry={() => void season.refetch()}
              retrying={season.isFetching}
            />
          ) : (
            <RequestLoading />
          )
        ) : undefined
      }
      refreshing={season.isRefetching || authority.account.isRefetching}
      onRefresh={
        authority.sessionStatus === "authenticated"
          ? () => void refresh()
          : undefined
      }
    >
      {authority.enabled && season.data && (
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
      )}
    </PreparationPage>
  );
}
