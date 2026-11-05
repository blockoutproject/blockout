# Canonical Java tests

Adapt the names to the actual application; these excerpts are not a new testkit. `ReservationService.create` accepts an application command and uses a `ReservationStore` port. Its constructor takes that port. The store returns the created view. DTOs, views and commands are real values, never Mockito mocks. The repository's existing suffix/build discovery remains authoritative.

## Unit behavior and a rich factory

Place `ReservationServiceUnitTest` beside the mirrored production package, for example `src/test/java/example/reservation/application`. Imports below show the tools involved; application types belong to that package. `CreateReservation` contains customer ID, customer name, contact email and guest count; `ReservationView` contains ID and guest count. In this example the command permits an unknown ID and the use case owns customer rejection.

```java
import java.util.Locale;
import java.util.Random;
import java.util.UUID;
import net.datafaker.Faker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("Reservation creation")
class ReservationServiceUnitTest {
    @Test
    @DisplayName("Returns the persisted reservation for the supplied customer")
    void returnsCreatedReservation() {
        // Given
        Faker faker = new Faker(Locale.ENGLISH, new Random(42L));
        UUID customerId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        CreateReservation command = validReservation(faker, customerId, 2);
        ReservationView stored = new ReservationView(
                UUID.fromString("00000000-0000-0000-0000-000000000002"), 2);
        ReservationStore store = mock(ReservationStore.class);
        when(store.create(command)).thenReturn(stored);
        ReservationService service = new ReservationService(store);

        // When
        ReservationView result = service.create(command);

        // Then
        assertThat(result).isEqualTo(stored);
    }

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

    /**
     * Constructs valid secondary values without hiding the scenario's customer or capacity.
     * @param faker this test's seeded value generator
     * @param customerId explicit valid customer identity
     * @param guests scenario-owned guest count
     * @return a command with stable shape and generated secondary contact values
     */
    private static CreateReservation validReservation(
            Faker faker, UUID customerId, int guests) {
        return new CreateReservation(
                customerId, faker.name().fullName(), faker.internet().emailAddress(), guests);
    }
}
```

Keep this factory local until another test genuinely needs the same valid shape, then move it to the feature's test support and import it; do not duplicate or build a universal object mother. A private helper need not have multiple callers to explain a coherent step.

## Parameterized input variants

When the same rule rejects several inputs, use a native source rather than a loop hiding the individual cases. Here the use case accepts 1–8 guests and rejects other counts before calling the store. Place this method in the unit test above, with these imports:

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

## Database integration

Mirror the infrastructure package and use an `IntegrationTest` suffix discovered by Failsafe. The example assumes the module's existing test configuration supplies the real supported database, runs the accepted migration mechanism and wires the real `ReservationStore`. It deliberately does not invent a container superclass. The actual schema in this example guarantees uniqueness of `externalReference`; a service check alone is not that guarantee.

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

Use the exact exception exposed by the application's actual flush/translation boundary; if the adapter flushes and translates before returning, assert that translated constraint exception instead. Keep both writes visible and force the second write to reach the database. Rollback isolates test data; it does not prove application commit semantics. Add a separate transaction test without an enclosing test transaction when commit/rollback ownership is the behavior. Never claim this example ran without the module, migrations and database.

Tool mechanics: [AssertJ exception assertions](https://assertj.github.io/doc/#assertj-core-exception-assertions), [JUnit parameterized tests](https://docs.junit.org/current/writing-tests/parameterized-classes-and-tests.html) and [Datafaker setup](https://www.datafaker.net/documentation/getting-started/). Use the versions supported by the owning project.
