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
- At most one prepared interstitial, with native validity/loading outcome and the privacy/session context for which it was prepared.
- At most one accepted pending sporting destination. Native display resets the count; dismissal/failure releases it at most once. A fresh process abandons an unresolved destination.
- Current F09 entitlement state and F05 session are consumed from their existing owners rather than copied into a persistent advertising identity.

Unavailable/loading ads do not delay navigation. Incompatible/expired ads and old-session events are discarded. There is no event ledger, retry queue, distribution lock, ad pool or cross-device frequency state.

## Legal document

Three stable types: `imprint`, `privacy`, `terms`. Each complete static HTML document contains its title, free-form version, current body and truthful modification date. The files live with backend resources and have no database identity or mobile editing state. Reviewed release is publication; reading creates neither acceptance nor history. The privacy page contains the externally accessible account-deletion direction and operational rights contact.

## Club contact restriction

[F02](../002-sporting-data/data-model.md#presentation-and-privacy) owns club identity, field modes, values and editing revision. Add a durable restriction flag to the existing metadata of each affected contact field (address, city, postal code, email, phone or website). It is separate from the ordinary source/manual/hidden presentation mode.

An authorized manual transaction locks the club, clears both source and manual values for the affected field, marks the restriction and increments the editing revision if state changes. Ingestion omits restricted values from persistence; projections expose null. Ordinary manual editing/return-to-source cannot lift the restriction. Authorized rights handling is necessary before any deliberate lifting; there is no new user-facing process.

The restriction stores no removed personal value or historical contact archive. Existing private support may retain proportionate request evidence under F10/F11. Restoration reconciles current restrictions before reopening access. A restriction changing effective locality also clears obsolete coordinates and advances the locality revision under the existing F02 rules. No generic personal-data registry or automatic referee matching is introduced.

## Existing independent owners

F05 owns business-account erasure and original-target provider cleanup; F09 owns RevenueCat rights, F10 private reports/attachments, F07 notification expiry and F13 backups/diagnostics. Advertising age is not account seniority. Their existing deletion, retention and restoration meanings remain authoritative.
