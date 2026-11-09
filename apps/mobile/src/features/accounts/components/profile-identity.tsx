import type { ReactNode } from "react";
import { Text } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { IdentityArtwork } from "../../../shared/components/identity-artwork";
import { IdentityAtmosphere } from "../../../shared/components/identity-atmosphere";
import { IdentityCard } from "../../../shared/components/identity-card";
import { ImageFallback } from "../../../shared/components/image-fallback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useProfilePhoto } from "../api/use-profile-editing";

/** Accepted current identity only; the route supplies membership presentation and the independent edit destination. */
export interface ProfileIdentityProps {
  account: AccountResponse;
  photo: Pick<ReturnType<typeof useProfilePhoto>, "data" | "isFetching">;
  membershipStatus?: ReactNode;
}

/** Authorized photo layers fail independently while the known profile and membership remain readable. */
export function ProfileIdentity({
  account,
  membershipStatus,
  photo,
}: Readonly<ProfileIdentityProps>) {
  const { colors } = useTheme();
  const uri = account.hasPhoto ? (photo.data ?? undefined) : undefined;
  return (
    <IdentityCard
      artworkBackgroundColor={colors.mediaPlaceholder}
      atmosphere={
        uri ? (
          <IdentityAtmosphere
            key={uri}
            testID="profile-photo-atmosphere"
            uri={uri}
          />
        ) : undefined
      }
      artwork={
        <IdentityArtwork
          key={uri}
          uri={uri}
          loading={account.hasPhoto && photo.isFetching}
          label="Photo de profil"
          contentFit="cover"
          fallback={
            <ImageFallback
              label={
                account.hasPhoto
                  ? "Photo de profil indisponible"
                  : "Photo de profil absente"
              }
            />
          }
        />
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
