# Canonical Java tests

Adapt these excerpts to the actual application and its existing suffix/build discovery. The example service already uses a `ReservationStore` that owns persistence translation; this is not a requirement to add a port. DTOs, entities, views and commands are real values, never Mockito mocks.

## An owned rejection

`ReservationService.create` accepts a command containing customer ID, customer name, contact email and guest count. Its use case rejects a missing customer before touching persistence. This rejection and absence of effects are meaningful behavior; returning a value supplied by a mock would prove only delegation.

```java
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@DisplayName("Reservation creation")
class ReservationServiceTest {
    @Test
    @DisplayName("Rejects a missing customer before storing a reservation")
    void rejectsMissingCustomer() {
        // Given
        CreateReservation command = new CreateReservation(null, "Ada", "ada@example.invalid", 2);
        ReservationStore store = mock(ReservationStore.class);
        ReservationService service = new ReservationService(store);

        // When / Then
        assertThatThrownBy(() -> service.create(command))
                .isInstanceOf(MissingCustomerException.class);
        verifyNoInteractions(store);
    }
}
```

A real authorization rule likewise warrants checking that an unauthorized caller causes no write or provider action. Do not add an interface solely to mock that action. If a service only forwards a call and returns its result, omit a separate unit test; use the existing API or persistence test that proves the actual boundary. Do not add unchanged read-path tests merely because a write was added, unless that change threatens a concrete shared behavior.

## Input variants of the same rule

The use case accepts 1–8 guests and rejects other counts before calling the store. Add this method to the test above using native parameterization; keep scenario-defining values visible.

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@ParameterizedTest(name = "Rejects {0} guests before storing a reservation")
@ValueSource(ints = {0, 9})
@DisplayName("Rejects guest counts outside the accepted range")
void rejectsGuestCount(int guests) {
    // Given
    UUID customerId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    CreateReservation command = new CreateReservation(
            customerId, "Ada", "ada@example.invalid", guests);
    ReservationStore store = mock(ReservationStore.class);
    ReservationService service = new ReservationService(store);

    // When / Then
    assertThatThrownBy(() -> service.create(command))
            .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(store);
}
```

If the upper boundary is the changed behavior, also prove that 8 is accepted through an observable write or result at its existing owner. Do not manufacture a success test that only compares a mock's supplied return value. Small inputs like these stay inline. Use a local typed factory only when a richer valid shape obscures the scenario or is actually reused; expose the decisive overrides. Datafaker is optional for secondary values, with a per-test fixed seed and an existing compatible dependency.

## Database integration

Mirror the infrastructure package and use an `IntegrationTest` suffix discovered by Failsafe. The module's existing test configuration supplies the real supported database, runs the accepted migrations and wires the real `ReservationStore`. No new container superclass is needed. The schema guarantees uniqueness of `externalReference`; a service check alone cannot establish it.

```java
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Reservation external references")
class ReservationStoreIntegrationTest {
    @Autowired
    private ReservationStore store;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Test
    @DisplayName("Rejects a duplicate external reference in the database")
    void rejectsDuplicateExternalReference() {
        // Given
        store.createWithExternalReference("external-42", 2);
        entityManager.flush();
        entityManager.clear();

        // When / Then
        assertThatThrownBy(() -> {
            store.createWithExternalReference("external-42", 3);
            entityManager.flush();
        }).isInstanceOf(jakarta.persistence.PersistenceException.class);
    }
}
```

Use the exception exposed by the actual flush/translation boundary. If the adapter flushes and translates before returning, assert that translated constraint exception instead. Keep both writes visible and force the second to reach the database. Rollback isolates test data; it does not prove application commit semantics. Use a test without an enclosing test transaction when application commit/rollback ownership is the changed behavior. Never claim these excerpts ran without the module, migrations and database.

Tool mechanics: [AssertJ exception assertions](https://assertj.github.io/doc/#assertj-core-exception-assertions) and [JUnit parameterized tests](https://docs.junit.org/current/writing-tests/parameterized-classes-and-tests.html). Use the versions supported by the owning project.
