import { Text } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { IdentityArtwork } from "@/shared/components/identity-artwork";
import { ArtworkHalo } from "@/shared/components/artwork-halo";
import { IdentityCard } from "@/shared/components/identity-card";
import { ImageFallback } from "@/shared/components/image-fallback";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import type { useProfilePhoto } from "../api/use-profile-editing";

/** The overview supplies its authorized identity and optional private photo. */
export interface ProfileIdentityProps {
  account: AccountResponse;
  photo: Pick<ReturnType<typeof useProfilePhoto>, "data" | "isFetching">;
}

/** Authorized photo layers fail independently while the name and email remain readable. */
export function ProfileIdentity({
  account,
  photo,
}: Readonly<ProfileIdentityProps>) {
  const { colors, membership, proAccent } = useTheme();
  const uri = account.hasPhoto ? (photo.data ?? undefined) : undefined;
  return (
    <IdentityCard
      borderColor={proAccent ? membership.border : undefined}
      atmosphere={
        uri ? (
          <ArtworkHalo
            placement="centered-leading"
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
          fallback={
            <ImageFallback
              label={
                account.hasPhoto
                  ? "Photo de profil indisponible"
                  : "Photo de profil absente"
              }
              color={colors.logoInk}
            />
          }
        />
      }
    >
      <Text style={[tokens.typography.title, { color: colors.text }]}>
        {account.username}
      </Text>
      <Text style={[tokens.typography.label, { color: colors.secondaryText }]}>
        {account.email}
      </Text>
    </IdentityCard>
  );
}
