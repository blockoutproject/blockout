import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { createAccessObservations } from "../state/access-observations";

it("starts every process without another process’s restriction history", () => {
  // Given
  const previous = createAccessObservations();
  previous.complete(applicationAccessResponse());

  // When
  const next = createAccessObservations();

  // Then
  expect(previous.getSnapshot().maintenance).toBeDefined();
  expect(next.getSnapshot().maintenance).toBeUndefined();
});

it.each(["maintenance", "versions"] as const)(
  "rejects a complete result older than observed %s",
  (group) => {
    // Given
    const observations = createAccessObservations();
    const newer = applicationAccessResponse();
    newer[group].revision = 4;
    if (group === "maintenance") observations.maintenance(newer.maintenance);
    else observations.versions(newer.versions);

    // When
    const accepted = observations.complete(applicationAccessResponse());

    // Then
    expect(accepted).toBe(false);
    expect(observations.getSnapshot()[group]?.revision).toBe(4);
  },
);

it("retains restrictions through failures and partial inactive maintenance", () => {
  // Given
  const observations = createAccessObservations();
  const active = {
    revision: 2,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  observations.maintenance(active);

  // When
  observations.refuse();
  observations.maintenance({
    ...active,
    revision: 3,
    active: false,
    message: null,
  });

  // Then
  expect(observations.getSnapshot().maintenance?.active).toBe(false);
  expect(observations.getSnapshot().refused).toBe(true);
});

it("a lowered partial minimum cannot admit until a sufficiently current complete check", () => {
  // Given
  const observations = createAccessObservations();
  const response = applicationAccessResponse();
  response.versions.revision = 4;
  observations.complete(response);

  // When
  observations.versions({ ...response.versions, revision: 5 });
  observations.refuse();

  // Then
  expect(observations.getSnapshot().refused).toBe(true);
  expect(observations.complete(response)).toBe(false);
  response.versions.revision = 5;
  expect(observations.complete(response)).toBe(true);
});

it("ignores a late refusal older than a newer complete read", () => {
  // Given
  const observations = createAccessObservations();
  const current = applicationAccessResponse();
  current.maintenance.revision = 8;
  observations.complete(current);

  // When
  observations.maintenance({
    revision: 7,
    active: true,
    message: "Old",
    imageUrl: null,
  });

  // Then
  expect(observations.getSnapshot().refused).toBe(false);
  expect(observations.getSnapshot().maintenance?.active).toBe(false);
});

it("a generic refusal retains known restrictions until a complete check succeeds", () => {
  // Given
  const observations = createAccessObservations();
  observations.complete(applicationAccessResponse());

  // When
  observations.refuse();

  // Then
  expect(observations.getSnapshot().refused).toBe(true);
  expect(observations.getSnapshot().maintenance?.revision).toBe(0);
});
