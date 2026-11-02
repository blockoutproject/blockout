import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { IdentityCard } from "../../../shared/components/identity-card";
import { Skeleton } from "../../../shared/components/skeleton";
import { ImageFallback } from "../../../shared/components/image-fallback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useProfilePhoto } from "../api/use-profile-editing";

/** Accepted current identity only; the route supplies membership presentation and the independent edit destination. */
export interface ProfileIdentityProps {
  account: AccountResponse;
  photo: ReturnType<typeof useProfilePhoto>;
  membershipStatus?: ReactNode;
}

/** Product Design identity card; missing photos use the neutral image fallback within the current account lifetime. */
export function ProfileIdentity({
  account,
  membershipStatus,
  photo,
}: ProfileIdentityProps) {
  const { colors } = useTheme();
  const [failedPhoto, setFailedPhoto] = useState<{
    uri: string;
    readAt: number;
  }>();
  const uri = photo.data;
  const failed =
    failedPhoto?.uri === uri && failedPhoto?.readAt === photo.dataUpdatedAt;
  const available = account.hasPhoto && !!uri && !failed;
  /** Both representations belong to the same accepted photo read, including same-byte rereads. */
  const rejectImage = () => {
    if (uri) setFailedPhoto({ uri, readAt: photo.dataUpdatedAt });
  };
  return (
    <IdentityCard
      artworkBackgroundColor={colors.mediaPlaceholder}
      atmosphere={
        available ? (
          <Image
            accessible={false}
            testID="profile-photo-atmosphere"
            source={{ uri }}
            style={styles.atmosphere}
            contentFit="cover"
            enforceEarlyResizing
            blurRadius={tokens.media.identityAtmosphere.blur}
            onError={rejectImage}
          />
        ) : undefined
      }
      artwork={
        available ? (
          <Image
            accessible
            accessibilityRole="image"
            accessibilityLabel="Photo de profil"
            source={{ uri }}
            style={styles.avatar}
            contentFit="cover"
            onError={rejectImage}
          />
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
