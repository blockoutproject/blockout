# Canonical Expo tests

Keep tests under `__tests__` beside the owning feature role. The example feature owns `guestLabel`, a named `ReservationValues` editing contract, and a real `ReservationForm` with `initialValues` and an asynchronous `onSubmit`. Customer is its accessible TextInput label, Save is a button and Save failed is the accepted error feedback. The form owns submission errors and retains edited fields. Adapt to the real public API, never add test-only props.

## Unit behavior and a rich factory

```tsx
import { guestLabel } from "../guest-label";

it("uses the singular label for one guest", () => {
  // Given
  const guests = 1;

  // When
  const label = guestLabel(guests);

  // Then
  expect(label).toBe("1 guest");
});
```

For a factory shared by actual form scenarios, use a separate feature-owned test-support file:

```ts
import type { Faker } from "@faker-js/faker";
import type { ReservationValues } from "../forms/reservation-values";

/** Constructs secondary editing values without hiding the scenario's customer and capacity. */
export function validReservation(
  faker: Faker,
  customerName: string,
  guests: number,
): ReservationValues {
  return {
    customerName,
    guests,
    contactEmail: faker.internet.email(),
    note: faker.lorem.sentence(),
  };
}
```

For several tests sharing this valid editing shape, move the factory to feature-owned test support and export it; the single-consumer rule does not ban exports of legitimate boundaries. Reuse an exact generated type when the shape has transport semantics rather than inventing a form copy. Instantiate Faker per test and seed it; no shared mutable generator or whole-object reflection factory.

## Native component/form integration

The form, inputs and submission state are real; the submit boundary is a controlled double. Jest's native mocks come from the existing jest-expo setup. Import `jest` explicitly only if the repository's Jest mode requires it.

```tsx
import { Faker, en } from "@faker-js/faker";
import { render, screen, userEvent } from "@testing-library/react-native";
import { ReservationForm } from "../reservation-form";
import { validReservation } from "../../test-support/reservation-data";

it("retains the edited customer when saving fails", async () => {
  // Given
  const faker = new Faker({ locale: [en] });
  faker.seed(42);
  const initialValues = validReservation(faker, "Ada", 2);
  const onSubmit = jest
    .fn()
    .mockRejectedValue(new Error("Service unavailable"));
  const user = userEvent.setup();
  render(<ReservationForm initialValues={initialValues} onSubmit={onSubmit} />);

  // When
  await user.clear(screen.getByLabelText("Customer"));
  await user.type(screen.getByLabelText("Customer"), "Grace");
  await user.press(screen.getByRole("button", { name: "Save" }));

  // Then
  expect(await screen.findByText("Save failed")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Grace")).toBeOnTheScreen();
  expect(onSubmit).toHaveBeenCalledWith({
    ...initialValues,
    customerName: "Grace",
  });
});
```

Use the real providers required by the component; do not mock the form hook to simulate the behavior being asserted. A shared renderer may supply stable required providers, but must expose relevant state and never hide writes or the tested action. Restore timers/spies in the configured teardown if used. This proves JavaScript form behavior, not keyboard presentation, native authentication, visual fidelity or an actual device launch. Obtain separate native evidence when that is the changed boundary.

Tool mechanics: [Faker instances](https://fakerjs.dev/api/faker) and [React Native Testing Library interactions](https://callstack.github.io/react-native-testing-library/docs/api/events/user-event). Use the versions supported by the owning project.
