import type { MobileClubDetail } from '@/src/api/generated/mobile-gateway/models';
import type { Club } from '@/src/types/Club';

/** Projects the privacy-filtered canonical club response into the profile view. */
export function toClubView(response: MobileClubDetail): Club {
  return {
    id: response.id,
    rawName: response.rawName,
    name: response.name,
    city: response.city,
    email: response.email,
    phoneNumber: null,
    website: response.website,
    address: response.address,
    logoUrl: response.logoUrl,
    longitude: response.longitude,
    latitude: response.latitude,
  };
}
