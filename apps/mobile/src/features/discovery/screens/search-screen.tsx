import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListClubsParams } from "../../../../.generated/schemas/index.zod";
import { TextField } from "../../../shared/components/text-field";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { ResourceTabs } from "../../sporting/components/resource-page";
import type { DiscoveryResource } from "../api/discovery-context";
import { useDiscoveryQuery } from "../api/use-discovery-query";
import { SearchResults } from "../components/search-results";

const searchSchema = ListClubsParams.pick({ q: true });

/**
 * Public text-search entry with internal tabs and a single shared editable value. Empty-text
 * examples, filters, full continuation and sporting activation remain with their owning tasks.
 * Generated Unicode validation rejects over-limit text without truncating the user's draft.
 */
export function SearchScreen() {
  const { colors } = useTheme();
  const [resource, setResource] = useState<DiscoveryResource>("team");
  const { control } = useForm<ListClubsParams>({
    defaultValues: { q: "" },
    resolver: zodResolver(searchSchema),
    mode: "onChange",
  });
  const text = useWatch({ control, name: "q" }) ?? "";
  const valid = searchSchema.safeParse({ q: text }).success;
  const textual = /[^\p{White_Space}]/u.test(text);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.controls}>
        <View>
          <ResourceTabs
            items={[
              { id: "team", label: "Équipes" },
              { id: "pool", label: "Poules" },
              { id: "club", label: "Clubs" },
            ]}
            selected={resource}
            onSelect={(id) => {
              if (id === "team" || id === "pool" || id === "club")
                setResource(id);
            }}
          />
        </View>
        <Controller
          control={control}
          name="q"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Rechercher"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={
                resource === "club"
                  ? "Rechercher un club…"
                  : resource === "team"
                    ? "Rechercher une équipe…"
                    : "Rechercher une poule…"
              }
              returnKeyType="search"
              autoCorrect={false}
              error={
                fieldState.invalid
                  ? "La recherche est limitée à 200 caractères."
                  : undefined
              }
            />
          )}
        />
      </View>
      {valid &&
        (!textual ? (
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            Saisissez une recherche.
          </Text>
        ) : (
          <TextSearchResults key={resource} resource={resource} text={text} />
        ))}
    </SafeAreaView>
  );
}

/** Each internal tab mounts its own Query observer; tab return honors native no-refetch/no-retry-on-mount. */
function TextSearchResults({
  resource,
  text,
}: {
  resource: DiscoveryResource;
  text: string;
}) {
  const { colors } = useTheme();
  const query = useDiscoveryQuery(resource, { q: text });
  return query.isPending ? (
    <View style={styles.feedback}>
      <RequestLoading />
    </View>
  ) : (
    <>
      {query.isError && (
        <View style={styles.feedback}>
          <RequestError
            message={
              query.data
                ? "La recherche n’a pas pu être actualisée. Les résultats précédents restent affichés."
                : "La recherche est indisponible."
            }
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        </View>
      )}
      {query.data &&
        (query.data.pages.some((page) =>
          "clubs" in page
            ? page.clubs.length > 0
            : "teams" in page
              ? page.teams.length > 0
              : page.pools.length > 0,
        ) ? (
          <SearchResults pages={query.data.pages} />
        ) : (
          !query.isError && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: colors.secondaryText }]}
            >
              Aucun résultat pour cette recherche.
            </Text>
          )
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  controls: { padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  feedback: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
  },
  message: { ...tokens.typography.body, padding: tokens.spacing.lg },
});
