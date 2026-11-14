import { MapPin, ExternalLink } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { ClubDetailResponse } from "../../../../.generated/schemas/index.zod";
import { Surface } from "@/shared/components/surface";
import { controlOpacity } from "@/shared/components/control-styles";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { mapDestination } from "./contact-link";
import { SportingLogo } from "./sporting-identity";

/** The permitted club point supplies a passive preview; opening Maps never guesses a venue. */
export function ClubLocation({
  detail,
}: Readonly<{ detail: ClubDetailResponse }>) {
  const { colors, scheme } = useTheme();
  const location = detail.location;
  const municipality =
    [detail.contacts.postalCode, detail.contacts.city]
      .filter(Boolean)
      .join(" ") ||
    location?.label ||
    "Commune non renseignée";
  const handoff = useNativeHandoff(
    location
      ? mapDestination(`${location.latitude},${location.longitude}`)
      : undefined,
  );

  return (
    <Surface style={styles.card}>
      <View style={styles.municipality}>
        <MapPin
          accessible={false}
          size={tokens.size.icon.md}
          color={colors.icon}
        />
        <View style={styles.identity}>
          <Text style={[tokens.typography.label, { color: colors.text }]}>
            {municipality}
          </Text>
          {detail.contacts.address && (
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {detail.contacts.address}
            </Text>
          )}
        </View>
      </View>
      {location && (
        <>
          <MapView
            style={styles.map}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            userInterfaceStyle={scheme}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation={false}
            showsPointsOfInterests={false}
            toolbarEnabled={false}
            accessibilityLabel={`Localisation du club : ${location.label}`}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              centerOffset={{ x: 0, y: 0 }}
            >
              <View
                style={[styles.marker, { backgroundColor: colors.surface }]}
              >
                <SportingLogo
                  identity={detail.club}
                  kind="club"
                  presentation="entity"
                  size={tokens.size.media.entity}
                />
              </View>
            </Marker>
          </MapView>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ouvrir la commune sur la carte"
            onPress={handoff.open}
            disabled={handoff.pending}
            accessibilityState={{
              disabled: handoff.pending,
              busy: handoff.pending,
            }}
            style={({ pressed }) => [
              styles.action,
              { opacity: controlOpacity(handoff.pending, pressed) },
            ]}
          >
            <Text style={[tokens.typography.metadata, { color: colors.text }]}>
              Ouvrir la carte
            </Text>
            <ExternalLink
              accessible={false}
              size={tokens.size.icon.sm}
              color={colors.icon}
            />
          </Pressable>
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, gap: 0 },
  municipality: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
  },
  identity: { flex: 1, gap: tokens.spacing.xs },
  map: { height: tokens.sporting.clubMapHeight },
  marker: {
    borderRadius: tokens.media.radius.tile,
    overflow: "hidden",
  },
  action: {
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
});
