import type {
  CreateDivisionBody,
  SetClubPresentationBody,
  SetTeamPresentationBody,
  SetPoolPresentationBody,
  SetDivisionPresentationBody,
} from "../../../../.generated/schemas/index.zod";
import type { PresentationValues } from "../forms/presentation-values";

/** Encodes division creation; three empty stops restore the automatic gradient and do not invent colors. */
export function toCreateDivisionBody(
  values: PresentationValues,
): CreateDivisionBody {
  return {
    metadata: {
      name: values.name.trim(),
      color: values.color,
      gradient: values.gradient.every((value) => value === "")
        ? null
        : values.gradient,
      logoAction: values.logo.action,
    },
    ...(values.logo.action === "replace"
      ? { image: values.logo.prepared }
      : {}),
  };
}

/** Encodes the complete club presentation draft; an empty name restores the automatic value. */
export function toClubPresentationBody(
  revision: string,
  values: PresentationValues,
): SetClubPresentationBody {
  return {
    metadata: {
      revision,
      manualName: values.name === "" ? null : values.name.trim(),
      logoAction: values.logo.action,
    },
    ...(values.logo.action === "replace"
      ? { image: values.logo.prepared }
      : {}),
  };
}

/** Adds the independent short-name intent to the shared club/team presentation transport fields. */
export function toTeamPresentationBody(
  revision: string,
  values: PresentationValues,
): SetTeamPresentationBody {
  const body = toClubPresentationBody(revision, values);
  return {
    ...body,
    metadata: {
      ...body.metadata,
      manualShortName: values.shortName === "" ? null : values.shortName.trim(),
    },
  };
}

/** Encodes pool names only; pool presentation has no image or logo action. */
export function toPoolPresentationBody(
  revision: string,
  values: PresentationValues,
): SetPoolPresentationBody {
  return {
    revision,
    manualName: values.name === "" ? null : values.name.trim(),
    manualShortName: values.shortName === "" ? null : values.shortName.trim(),
  };
}

/** Adds the original revision to division presentation fields without changing its separate activity state. */
export function toDivisionPresentationBody(
  revision: string,
  values: PresentationValues,
): SetDivisionPresentationBody {
  const body = toCreateDivisionBody(values);
  return { ...body, metadata: { ...body.metadata, revision } };
}
