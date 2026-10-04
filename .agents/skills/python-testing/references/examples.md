# Illustrative test fragments

These fragments show the intended reading order, explicit scenario values and visible real/replaced dependencies. They assume the project contracts described below; the `app` imports are illustrative, not an executable sample application. Adapt names and async test configuration to the owning project. No dependency versions, generated client or reusable test harness are supplied.

## Unit behavior

Assume the application's pure `remaining_places(capacity, reserved)` returns remaining capacity and rejects impossible counts. This scenario proves a concrete result; it neither prescribes a domain layer nor inspects the implementation.

```python
from app.reservations.capacity import remaining_places


def test_returns_unreserved_places() -> None:
    # Given
    capacity = 8
    reserved = 3

    # When
    remaining = remaining_places(capacity=capacity, reserved=reserved)

    # Then
    assert remaining == 5
```

Use explicit parameterized cases for relevant boundaries. An exception assertion may use a combined `# When / Then` so the action remains inside the assertion, without a custom capturing helper. Several assertions are acceptable when they establish the same outcome.

## Adapter integration with controlled transport

Assume `HttpCatalogueSource(client)` borrows an HTTPX client and its async `read()` calls `GET /catalogue`, validates provider JSON, and maps provider `title` to the application item's `label`. It returns an application-owned observation with `complete` and immutable `items`, each exposing `sku`, `label` and `quantity`. The provider permits integer zero. The owning test configuration already runs async pytest functions.

```python
import httpx

from app.catalogue.infrastructure.provider import HttpCatalogueSource


def catalogue_response(request: httpx.Request) -> httpx.Response:
    """Supply controlled provider JSON for the expected catalogue read."""
    assert request.method == "GET"
    assert request.url.path == "/catalogue"
    return httpx.Response(
        200,
        json={
            "complete": True,
            "items": [{"sku": "A-1", "title": "Blue mug", "quantity": 0}],
        },
    )


async def test_reads_and_maps_provider_catalogue() -> None:
    # Given: real adapter and HTTPX request path; only transport is replaced.
    transport = httpx.MockTransport(catalogue_response)
    async with httpx.AsyncClient(
        base_url="https://provider.example.test", transport=transport
    ) as client:
        source = HttpCatalogueSource(client)

        # When
        observation = await source.read()

        # Then
        assert observation.complete is True
        assert len(observation.items) == 1
        item = observation.items[0]
        assert item.sku == "A-1"
        assert item.label == "Blue mug"
        assert item.quantity == 0
```

The context owns client closure; the adapter borrows it. The response callback makes the HTTP expectation and returned data visible and performs no external I/O. There is no hidden mock installation or business action in a factory.

In a project, this shape exercises its real provider parser, validation and mapping. It does not prove generated-client decoding, live sockets, server persistence or completeness of all invalid-input cases. If the task concerns those guarantees, test the actual affected path with the project's versions. A missing required field, forbidden numeric string or malformed response needs its own meaningful rejection scenario.

Use [targeted test data](test-data.md) only when rich reused values need a factory; these small records remain literal. These fragments clarify conventions; reading the skill does not require constructing or running a demonstration project.
