import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { BlurredArtwork } from "../../../shared/components/blurred-artwork";
import { IdentityCard } from "../../../shared/components/identity-card";
import { Skeleton } from "../../../shared/components/skeleton";
import { ImageFallback } from "../../../shared/components/image-fallback";
import { useNativeImageLifecycle } from "../../../shared/images/use-native-image-lifecycle";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useProfilePhoto } from "../api/use-profile-editing";

/** Accepted current identity only; the route supplies membership presentation and the independent edit destination. */
export interface ProfileIdentityProps {
  account: AccountResponse;
  photo: Pick<
    ReturnType<typeof useProfilePhoto>,
    "data" | "dataUpdatedAt" | "isFetching"
  >;
  membershipStatus?: ReactNode;
}

/** Keeps admitted photos under their skeleton until native display; either layer's failure withdraws that read's media. */
export function ProfileIdentity({
  account,
  membershipStatus,
  photo,
}: ProfileIdentityProps) {
  const { colors } = useTheme();
  const uri = account.hasPhoto ? (photo.data ?? undefined) : undefined;
  const image = useNativeImageLifecycle(uri, photo.dataUpdatedAt);
  const available = !!uri && image.status !== "failed";
  const pending = available && image.status === "pending";
  return (
    <IdentityCard
      artworkBackgroundColor={colors.mediaPlaceholder}
      atmosphere={
        available ? (
          <BlurredArtwork
            key={image.attemptKey}
            testID="profile-photo-atmosphere"
            uri={uri}
            style={styles.atmosphere}
            resizeMode="cover"
            blurRadius={tokens.media.identityAtmosphere.blur}
            onError={image.onError}
          />
        ) : undefined
      }
      artwork={
        available ? (
          <View style={styles.avatar}>
            <Image
              key={image.attemptKey}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Photo de profil"
              accessibilityState={{ busy: pending }}
              source={{ uri }}
              style={styles.avatar}
              contentFit="cover"
              onDisplay={image.onDisplay}
              onError={image.onError}
            />
            {pending && (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Skeleton
                  width={tokens.size.media.profile}
                  height={tokens.size.media.profile}
                  shape="rectangle"
                />
              </View>
            )}
          </View>
        ) : account.hasPhoto && photo.isFetching ? (
          <Skeleton
            width={tokens.size.media.profile}
            height={tokens.size.media.profile}
            shape="rectangle"
          />
        ) : (
          <ImageFallback
            label={
              account.hasPhoto
                ? "Photo de profil indisponible"
                : "Photo de profil absente"
            }
          />
        )
      }
    >
      {membershipStatus}
      <Text style={[tokens.typography.title, { color: colors.text }]}>
        {account.username}
      </Text>
      <Text style={[tokens.typography.label, { color: colors.secondaryText }]}>
        {account.email}
      </Text>
    </IdentityCard>
  );
}

const styles = StyleSheet.create({
  atmosphere: {
    ...StyleSheet.absoluteFill,
    opacity: tokens.media.identityAtmosphere.opacity,
  },
  avatar: {
    width: tokens.size.media.profile,
    height: tokens.size.media.profile,
    borderRadius: tokens.radius.panelInset,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
