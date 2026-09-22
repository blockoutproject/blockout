# Python mapping boundaries

## Owner and purpose

Place each conversion with the boundary it translates:

| Conversion                                                          | Owner                                       |
| ------------------------------------------------------------------- | ------------------------------------------- |
| Incoming command/transport to application command                   | Incoming adapter                            |
| Provider JSON/CSV/HTML record to normalized application observation | Provider infrastructure adapter             |
| Application command/value to generated API request                  | Outgoing API adapter                        |
| Generated response to application result                            | The same outgoing adapter                   |
| Persistence representation to application/domain value              | Persistence adapter, if the project has one |
| Application value to pure domain concept                            | The boundary entering that domain           |

Neither domain nor application code imports an infrastructure mapper. If an application combines several already-normalized results to decide an outcome, that is application composition, not a reason to move external mapping inward.

Use names that identify the target: `to_create_request`, `to_application_view`, `to_domain_status`. When multiple similar roles coexist, name the resource or operation. Do not introduce a `Mapper` class for stateless functions or a runtime mapping framework. A trivial one-off constructor can stay in its adapter; an extracted function is justified by a meaningful named conversion or actual reuse, not a minimum caller count.

## Explicit construction

Construct targets with deliberately selected named attributes. Reuse a nested converter only when it implements the same semantics. In this illustrative fragment, `Club` is an application-owned value and `CreateClubRequest` is the owning API's generated transport type. Both names stand for the project's actual types; this is not a standalone executable module:

```python
# Illustrative signature; use the owning project's actual generated request type.
def to_create_request(club: Club) -> CreateClubRequest:
    """Translate an application club into its external creation contract."""
    return CreateClubRequest(name=club.name, postal_code=club.postal_code)
```

Do not copy every field with `Target(**source.model_dump())`, `asdict` or reflection as a default mapping convention. Such copies obscure intentionally omitted fields and couple representations. Native serialization remains appropriate for serialization itself: let the generated client serialize its generated request. Do not build a second JSON encoder or rewrite aliases around it.

An identifier assigned by the destination must not be supplied incidentally by a source object's matching field. Preserve explicit nested ownership and collection order when meaningful. Do not mutate the source while converting it. Copy a mutable collection only where ownership requires separation; no deep-copy ritual.

## Absence, null, enums and normalization

Missing, null, empty and invalid are different states. A missing optional update property may mean “leave unchanged,” while an explicit null may mean “clear.” Use the actual generated model's supported presence/unset representation; inspect and test its serialized request. Do not create a generic tri-state framework or default missing data to an empty string/zero merely to construct a target.

Convert provider strings, numbers or dates only where the declared input format permits it. Parse a numeric CSV column deliberately; reject an unexpected numeric string in a JSON field whose contract requires a number unless that API explicitly allows it. Validate the result and bounds before treating it as a business value. Normalization happens once at the owner of the stronger invariant, not in every mapper.

Map enums by explicit meaning, not ordinals or name similarity alone. Preserve serialized contract values. An exact contract-owned enum may be retained in application code; pure domain values stay independent. An unknown provider value is rejected or represented according to the accepted external-data policy, never silently mapped to a privileged/success state.

Pydantic's Python and JSON validation paths need not accept the same inputs. For example, a strict `date` accepts an ISO date string through JSON validation, while strict Python validation expects a `date` instance. Choose and test the actual boundary path; do not replace `model_validate_json` with `model_validate(json.loads(...))` assuming identical behavior. Field-specific strictness can reject JSON quantity strings while allowing declared environment/CSV conversions. See the [documented strict-mode behavior](https://docs.pydantic.dev/latest/concepts/strict_mode/); a global switch does not decide the input contract.

## Mapping is not orchestration

A mapper performs no network, storage, scheduling, logging side effect or dependency lookup. It does not decide create/update/delete, source priority, conflict policy or whether an incomplete dataset may replace an existing one. Those decisions belong to the application/domain. Do not hide them inside a convenient constructor or Pydantic field validator.

Keep four operations distinct: decode the format, validate its declared shape/constraints, map representations, then apply the owned business decision. External Pydantic validation belongs to the adapter. Internal values retain their own invariants, not another copy of all transport constraints. Source generation and actual generated validation are the contract workflow's responsibility.

## Evidence

Assert concrete target values and intentionally omitted fields; cover meaningful nested conversions, unknown enums and absent/null semantics. Use real models. Include request serialization when presence or aliases affect the wire contract. A test that compares the mapper to another copy of its constructor proves little; select scenario values that reveal a meaningful regression.
