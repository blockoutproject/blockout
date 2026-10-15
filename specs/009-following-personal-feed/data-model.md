# Data model: following and personal feed

[F06](spec.md) owns these meanings. [F02](../002-sporting-data/data-model.md) owns sporting identities and viewability; [F05](../005-accounts-identity/data-model.md) owns accounts and erasure.

## Persisted associations

| Entity     | Fields and relationships              | Constraints and lifecycle                                                                                                             |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| TeamFollow | UUID id; accountId; seasonal teamId   | Non-null foreign keys and unique(accountId, teamId). One confirmed relationship; no implicit pool or club follow.                     |
| PoolFollow | UUID id; accountId; contextual poolId | Non-null foreign keys and unique(accountId, poolId). Following one pool does not follow another phase/tour or its teams individually. |

Use the unique account/target indexes for owner reads and indexes beginning with targetId for counts and eligible-recipient reads. No mutable name, season, public count, client timestamp or notification state is copied into the relations. The target supplies its sporting context.

True from absence creates a UUID; repeated true retains it. False removes the row; repeated false has no effect. Re-follow creates another UUID, so consumers can distinguish a new relationship without retaining deleted rows. No audit history, negative-state row or version ledger.

Account deletion removes both associations in the same local transaction under F05's account lock. Never cascade a follow removal into a sporting target. Sporting hiding/restoration preserves associations and only changes their visibility in reads. A newly established account receives a new identity and no old relationships. F14 does not import V1 personal follows.

Use the existing Liquibase XML baseline posture: extend the mutable baseline while all databases are disposable and no preproduction/production version has run; immutable migrations follow its freeze. This document authorizes no reset or executable migration creation.

## Derived read models

| Read              | Derivation and invariants                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Follow state      | Boolean existence for the original account and a viewable target; false does not require a stored row. Unknown/hidden targets are not exposed.    |
| Follow list       | Viewable targets joined to their current F03 summaries, optionally restricted by sporting season; stable effective-name/UUID order.               |
| Follow options    | Distinct eligible catalog/follow seasons and the ordinary default; absence of default means All seasons.                                          |
| Follower count    | Number of existing relations for the target, independent of personal display filters; no follower identities or estimated zero.                   |
| Personal calendar | F03 match projection selected by an eligible followed participant or pool. Existence predicates avoid duplicate matches from overlapping origins. |

The calendar response couples hasAvailableFollows for the selected season with the F03 calendar under one consistent transaction. False means no viewable follows in that selection, not no persisted history; true with empty days means no eligible matches in the requested portion/category.

## Ephemeral mobile context

Query owns confirmed data and pending mutation state. Keys distinguish session/account/target and, for lists/calendar, season/category/time zone. One in-memory season choice belongs to the personal space, not to search or notifications. No persistent cache, per-match selection provenance, event log or private state inside public sporting DTOs.

F07 may read account, target and relation identities to apply its trigger/send eligibility. It must not treat a recreated relation as the old subscription or use the displayed season as a delivery preference. Its notification records and lifecycle are defined by the [F07 model](../011-notifications-delivery/data-model.md). Relation IDs retained for a pending send remain transient; F06 adds no historical audience snapshot.
