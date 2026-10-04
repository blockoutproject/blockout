# Targeted typed test data

Use a factory only when several tests share a rich valid object. This illustrative fragment assumes an application-owned `Customer` with `id`, `display_name`, `contact_email` and `active` fields. The UUID and activity are decisive; Faker supplies secondary synthetic values. The imports stand for the owning project's contracts, not a supplied application or a transport DTO.

```python
from uuid import UUID

from faker import Faker

from app.customers.model import Customer


def valid_customer(fake: Faker, customer_id: UUID, *, active: bool) -> Customer:
    """Fill secondary fields without hiding scenario identity or eligibility."""
    return Customer(
        id=customer_id,
        display_name=fake.name(),
        contact_email=fake.email(),
        active=active,
    )
```

The following test assumes `can_book(customer)` rejects inactive customers. It illustrates use of the factory in a behavior test, rather than a test that merely repeats the factory's field assignments.

```python
from uuid import UUID

from faker import Faker

from app.reservations.eligibility import can_book
from tests.customers.factories import valid_customer


def test_inactive_customer_cannot_book() -> None:
    # Given
    fake = Faker("en_US")
    fake.seed_instance(42)
    customer = valid_customer(
        fake,
        UUID("c17c5c0d-9134-4d55-81ef-472fa2b4be47"),
        active=False,
    )

    # When
    allowed = can_book(customer)

    # Then
    assert allowed is False
```

The value belongs to its application owner and the factory stays near its consuming tests. Use a fresh local seeded instance per test or Faker's standard pytest fixture. Do not share mutable random state, assert exact generated strings, generate object graphs by reflection or create a replay framework. Locale and library versions belong to the project when they affect a scenario. Small records in the [adapter fragment](examples.md) use literals because a fake-data dependency adds no value there.
