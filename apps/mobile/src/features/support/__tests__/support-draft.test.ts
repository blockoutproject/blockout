import { SupportRequestSubjectEnum } from "../../../../.generated/schemas/index.zod";
import { supportSchema } from "../schemas/support-schema";
import { supportValues } from "../forms/support-values";
import { toSupportRequest } from "../api/support-request";
import { supportContext, supportHref } from "../model/support-context";
import { supportMetadata } from "./fixtures";

it.each(["problem", "suggestion"])("accepts %s without a subject", (kind) => {
  // Given
  const draft = { ...supportMetadata, images: [], kind, subject: "" };

  // When
  const request = toSupportRequest(supportSchema.parse(draft), {});

  // Then
  expect(request.kind).toBe(kind);
  expect(request).not.toHaveProperty("subject");
});

it.each(SupportRequestSubjectEnum.options)(
  "retains optional canonical subject %s",
  (subject) => {
    // Given
    const draft = { ...supportMetadata, images: [], subject };

    // When
    const request = toSupportRequest(supportSchema.parse(draft), {});

    // Then
    expect(request.subject).toBe(subject);
  },
);

it.each(["title", "description", "replyEmail"])("refuses blank %s", (field) => {
  // Given
  const draft = {
    ...supportMetadata,
    images: [],
    subject: "",
    [field]: " \n\u00a0 ",
  };

  // When
  const result = supportSchema.safeParse(draft);

  // Then
  expect(result.success).toBe(false);
});

it.each([
  ["title", 200],
  ["description", 10000],
] as const)(
  "enforces %s UTF-16 bounds without truncating",
  (field, maximum) => {
    // Given
    const exact = "🏐".repeat(maximum / 2);
    const draft = {
      ...supportMetadata,
      images: [],
      subject: "",
      [field]: exact,
    };

    // When
    const accepted = supportSchema.parse(draft);
    const refused = supportSchema.safeParse({ ...draft, [field]: exact + "a" });

    // Then
    expect(accepted[field]).toBe(exact);
    expect(refused.success).toBe(false);
  },
);

it("trims only the outer title/contact whitespace and preserves explanation", () => {
  // Given
  const draft = {
    ...supportMetadata,
    images: [],
    subject: "",
    title: " Titre ",
    description: " Ligne 1\nLigne 2 ",
    replyEmail: " contact@example.invalid ",
  };

  // When
  const request = toSupportRequest(supportSchema.parse(draft), {});

  // Then
  expect(request).toMatchObject({
    title: "Titre",
    description: draft.description,
    replyEmail: "contact@example.invalid",
  });
});

it.each(["incorrect", "x".repeat(243) + "@example.invalid"])(
  "refuses invalid or oversized reply contact",
  (replyEmail) => {
    // Given
    const draft = { ...supportMetadata, images: [], subject: "", replyEmail };

    // When
    const result = supportSchema.safeParse(draft);

    // Then
    expect(result.success).toBe(false);
  },
);

it("accepts exactly 254 email code units and refuses 255", () => {
  // Given
  const replyEmail =
    "a".repeat(64) +
    "@" +
    "b".repeat(63) +
    "." +
    "c".repeat(63) +
    "." +
    "d".repeat(56) +
    ".test";
  const draft = { ...supportMetadata, images: [], subject: "", replyEmail };

  // When
  const exact = supportSchema.safeParse(draft);
  const oversized = supportSchema.safeParse({
    ...draft,
    replyEmail: replyEmail.replace(".test", "d.test"),
  });

  // Then
  expect(replyEmail).toHaveLength(254);
  expect(exact.success).toBe(true);
  expect(oversized.success).toBe(false);
});

it("retains the attempted UUID after failed loading and omits unrelated payloads", () => {
  // Given
  const origin = {
    screen: "match",
    targetType: "match",
    targetId: "00000000-0000-4000-8000-000000000239",
    name: "Unknown",
    token: "secret",
    query: "private",
    accountId: "untrusted",
  };

  // When
  const context = supportContext(origin);
  const href = supportHref(origin);

  // Then
  expect(context).toEqual({
    screen: "Match",
    action: "Consultation de la cible",
    target: { type: "match", id: origin.targetId },
  });
  expect(href.params).toEqual({
    originScreen: "match",
    targetType: "match",
    targetId: origin.targetId,
  });
  expect(supportValues(context).subject).toBe("sporting-data");
});

it("omits unknown routes and malformed targets", () => {
  // Given
  const origin = {
    screen: "/private?token=secret",
    targetType: "ticket",
    targetId: "invalid",
    failureReason: "provider payload",
  };

  // When
  const context = supportContext(origin);

  // Then
  expect(context).toEqual({});
});

it.each(["authentication", "account-establishment"])(
  "retains only safe sign-in stage %s",
  (failureStage) => {
    // Given
    const origin = {
      screen: "sign-in",
      failureStage,
      failureReason: "unavailable",
    };

    // When
    const context = supportContext(origin);

    // Then
    expect(context.signInFailure).toEqual({
      method: "hosted",
      stage: failureStage,
      reason: "unavailable",
    });
    expect(supportValues(context).subject).toBe("account");
  },
);

it("admits only Search provenance and a valid attempted target without free query or diagnostics", () => {
  // Given
  const origin = {
    screen: "search",
    targetType: "club",
    targetId: "00000000-0000-4000-8000-000000000242",
    q: "private query",
    filters: { gender: "female" },
    error: "raw diagnostic",
  };

  // When
  const context = supportContext(origin);
  const href = supportHref(origin);

  // Then
  expect(context).toEqual({
    screen: "Recherche",
    action: "Consultation de la cible",
    target: { type: "club", id: origin.targetId },
  });
  expect(href.params).toEqual({
    originScreen: "search",
    targetType: "club",
    targetId: origin.targetId,
  });
});
