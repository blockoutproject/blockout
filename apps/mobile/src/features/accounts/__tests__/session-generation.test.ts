import { createSessionGeneration } from "../session/session-generation";

it("keeps the generation when establishing or refreshing the same account", () => {
  // Given
  const session = createSessionGeneration();
  const initial = session.getSnapshot();

  // When
  session.setAccount(initial.generation, "account-a");
  session.setAccount(initial.generation, "account-a");

  // Then
  expect(session.getSnapshot()).toEqual({
    generation: initial.generation,
    accountId: "account-a",
  });
  expect(session.isCurrent(initial.generation)).toBe(true);
});

it("rejects old account results after switching to another account", () => {
  // Given
  const session = createSessionGeneration();
  const { generation } = session.getSnapshot();
  session.setAccount(generation, "account-a");

  // When
  session.setAccount(generation, "account-b");
  const accepted = session.setAccount(generation, "account-a");

  // Then
  expect(accepted).toBe(false);
  expect(session.isCurrent(generation)).toBe(false);
  expect(session.getSnapshot().accountId).toBe("account-b");
});

it("discards a delayed result across A to guest to A even when work cannot be cancelled", async () => {
  // Given
  const session = createSessionGeneration();
  const { generation } = session.getSnapshot();
  session.setAccount(generation, "account-a");
  const work = Promise.withResolvers<string>();
  const publish = jest.fn();
  const completion = work.promise.then((result) => {
    if (session.isCurrent(generation)) publish(result);
  });

  // When
  session.invalidate();
  const guest = session.getSnapshot();
  session.setAccount(guest.generation, "account-a");
  work.resolve("Old private result");
  await completion;

  // Then
  expect(guest.accountId).toBeNull();
  expect(guest.generation).not.toBe(generation);
  expect(session.getSnapshot().accountId).toBe("account-a");
  expect(publish).not.toHaveBeenCalled();
});

it("notifies active consumers of lifecycle changes and supports unsubscription", () => {
  // Given
  const session = createSessionGeneration();
  const listener = jest.fn();
  const unsubscribe = session.subscribe(listener);

  // When
  session.invalidate();
  unsubscribe();
  session.invalidate();

  // Then
  expect(listener).toHaveBeenCalledTimes(1);
});
