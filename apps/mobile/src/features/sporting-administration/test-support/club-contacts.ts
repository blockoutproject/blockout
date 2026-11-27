import type { ClubContactsResponse } from "../../../../.generated/schemas/index.zod";

export function emptyClubContacts(clubId: string): ClubContactsResponse {
  const contact = {
    mode: "source",
    sourceValue: null,
    effectiveValue: null,
    manualValue: null,
  } as const;
  return {
    clubId,
    address: contact,
    city: contact,
    postalCode: contact,
    email: contact,
    phone: contact,
    website: contact,
  };
}
