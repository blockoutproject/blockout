import {
  clubContactDraftSchema,
  clubContactPatch,
  clubContactValues,
} from "../forms/club-contact-values";
import { emptyClubContacts } from "../test-support/club-contacts";

it.each([
  {
    case: "a missing scheme delimiter",
    value: "https:club.example.invalid",
  },
  {
    case: "embedded credentials",
    value: "https://user:password@club.example.invalid",
  },
])("rejects $case in a manual club website at its field", ({ value }) => {
  // Given
  const draft = clubContactValues();
  draft.website = { mode: "manual", value };

  // When
  const result = clubContactDraftSchema.safeParse(draft);

  // Then
  expect(result).toMatchObject({
    success: false,
    error: {
      issues: [
        {
          path: ["website"],
          message: "Indiquez une adresse web HTTP ou HTTPS valide.",
        },
      ],
    },
  });
});

it("trims a valid manual website without normalizing the rest of the address", () => {
  // Given
  const website = "HTTP://Club.Example.Invalid/path?view=a%2Fb";
  const draft = clubContactValues();
  draft.website = { mode: "manual", value: `  ${website}  ` };
  const current = emptyClubContacts("00000000-0000-4000-8000-000000000196");

  // When
  const patch = clubContactPatch(clubContactDraftSchema.parse(draft), current);

  // Then
  expect(patch).toEqual({ website: { mode: "manual", value: website } });
});
