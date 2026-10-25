import type {
  CreateDivisionBody,
  SetClubPresentationBody,
  SetTeamPresentationBody,
  SetDivisionPresentationBody,
} from "../../../../.generated/schemas/index.zod";

/** Orval multipart adaptation: one JSON metadata part and binary artwork only for replacement. */
export function presentationFormData(
  body:
    | CreateDivisionBody
    | SetClubPresentationBody
    | SetTeamPresentationBody
    | SetDivisionPresentationBody,
): FormData {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(body.metadata)], { type: "application/json" }),
  );
  if (body.image !== undefined) form.append("image", body.image);
  return form;
}
