import { useRouter } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { Text } from "react-native";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useCollectionSeasons } from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  PreparationLink,
  PreparationPage,
  seasonStatus,
} from "../components/preparation-layout";

/** Lists canonical discovered seasons and opens preparation independently of the future collection dashboard. */
export function CollectionSeasonsScreen() {
  const { authority, query } = useCollectionSeasons();
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <PreparationPage title="Saisons">
      <CollectionAccessFeedback authority={authority} />
      {authority.enabled &&
        (query.data ? (
          <>
            {query.data.items.length === 0 && (
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                Aucune saison découverte
              </Text>
            )}
            {query.data.items.map((season) => (
              <PreparationLink
                key={season.id}
                label={season.label}
                detail={seasonStatus(season)}
                statusTone={
                  season.state === "preparing"
                    ? "warning"
                    : season.state === "active"
                      ? "success"
                      : "error"
                }
                icon={CalendarDays}
                onPress={() =>
                  router.push({
                    pathname: "/collection/[seasonId]",
                    params: { seasonId: season.id },
                  })
                }
              />
            ))}
            {query.isError && (
              <RequestError
                message="Les saisons sont indisponibles."
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            )}
          </>
        ) : query.isError ? (
          <RequestError
            message="Les saisons sont indisponibles."
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : (
          <RequestLoading />
        ))}
    </PreparationPage>
  );
}
