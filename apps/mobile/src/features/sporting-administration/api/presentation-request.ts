import type {
  CreateDivisionBody,
  SetClubPresentationBody,
  SetTeamPresentationBody,
  SetPoolPresentationBody,
} from "../../../../.generated/schemas/index.zod";
import type { PresentationValues } from "../schemas/presentation-schema";

/** Uses the common multipart fields for creation and presentation; empty stops restore the automatic gradient. */
export function toDivisionBody(values: PresentationValues): CreateDivisionBody {
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
  values: PresentationValues,
): SetClubPresentationBody {
  return {
    metadata: {
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
  values: PresentationValues,
): SetTeamPresentationBody {
  const body = toClubPresentationBody(values);
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
  values: PresentationValues,
): SetPoolPresentationBody {
  return {
    manualName: values.name === "" ? null : values.name.trim(),
    manualShortName: values.shortName === "" ? null : values.shortName.trim(),
  };
}
