# Data model: Advertising, privacy and legal

This describes state ownership, not a requirement to create a table for every concept.

## Installation-local advertising declaration

| Field        | Meaning and constraints                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `category`   | Under 16, 16–17 or adult. Derived at submission from an explicitly selected age in completed years; the raw input is not retained.            |
| `declaredAt` | Local declaration date used to request a fresh minor declaration after one calendar year at a subsequent launch. Not the person's birth date. |

No account identifier, country, location or backend synchronization. Adult categories have no annual reprompt; categories never advance automatically. Missing, invalid or expired data receives child-protected advertising without synthesizing a declaration; the required initial form still applies. Correction replaces category/date only on successful submission and invalidates prepared ads. A session/account switch grants no old Pro exemption; the local advertising declaration is separate from profile identity. UMP owns its own native choice persistence; Blockout does not duplicate consent strings/status in business storage.

## Runtime advertising state

- Count in the range 0–10, initialized at process start; survives backgrounding, never persisted as history.
- At most one prepared interstitial, with its load time, SDK loading outcome and preparation privacy/session context; [the plan](plan.md#mediation-and-presentation) owns freshness and callback handling.
- At most one accepted pending sporting destination. Native display resets the count; dismissal/failure releases it at most once. A fresh process abandons an unresolved destination.
- Current F09 entitlement state and F05 session are consumed from their existing owners rather than copied into a persistent advertising identity.

Unavailable/loading ads do not delay navigation. Incompatible/expired ads and old-session events are discarded.

## Legal document

Three stable types: `imprint`, `privacy`, `terms`. Each complete static HTML document contains its title, free-form version, current body and truthful modification date. The files live with backend resources and have no database identity or mobile editing state. Reviewed release is publication; reading creates neither acceptance nor history. The privacy page contains the externally accessible account-deletion direction and operational rights contact.

## Club contact restriction

[F02 owns the field metadata, restriction flag, transactions and revisions](../002-sporting-data/data-model.md#presentation-and-privacy). F11 requires restricted data to remain absent after collection, ordinary editing and restoration. Existing private support may retain proportionate request evidence under F10/F11; it is not an archive of the removed contact values.

## Existing independent owners

F05 owns business-account erasure and original-target provider cleanup; F09 owns RevenueCat rights, F10 private reports/attachments, F07 notification expiry and F13 backups/diagnostics. Advertising age is not account seniority. Their existing deletion, retention and restoration meanings remain authoritative.
