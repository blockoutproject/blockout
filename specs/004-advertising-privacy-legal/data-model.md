# Data model: Advertising, privacy and legal

This describes state ownership, not a requirement to create a table for every concept.

## Advertising choices

Google UMP owns advertising choices and their persistence for the installation. Blockout uses the SDK's current request permission and privacy-options requirement. iOS owns the tracking permission.

## Runtime advertising state

- One in-memory count starts at zero for each process and survives backgrounding. The tenth eligible sporting navigation starts a new cycle regardless of ad availability or presentation.
- At most one prepared interstitial is held. [The plan](plan.md#mediation-and-presentation) owns expiry and provider callbacks. Loss of eligibility or an incompatible change of choices invalidates preparation.
- A presentation attempt can retain one sporting destination. Dismissal or presentation failure releases it once if still valid. When no ad is ready, the navigation proceeds immediately.
- F09 supplies the current entitlement and F05 supplies the active session. These determine eligibility and continuation independently of the installation's consent flow.

## Legal document

Three stable types: `imprint`, `privacy`, `terms`. Each complete static HTML document contains its title, free-form version, current body and truthful modification date. The files live with backend resources and have no database identity or mobile editing state. The native browser owns the opened document's lifecycle; opening failure has only local action feedback, without a mobile document cache or read state. Reviewed release is publication; reading creates neither acceptance nor history. The privacy page contains the externally accessible account-deletion direction and operational rights contact.

## Club contact restriction

[F02 owns the field metadata, restriction flag, transactions and locality revisions](../002-sporting-data/data-model.md#presentation-and-privacy). F11 requires restricted data to remain absent after collection, ordinary editing and restoration. Existing private support may retain proportionate request evidence under F10/F11; it is not an archive of the removed contact values.

## Existing independent owners

F05 owns business-account erasure and original-target provider cleanup; F09 owns RevenueCat rights, F10 private reports/attachments, F07 server notification cutoff/purge and ordinary-event local filtering, and F13 safe diagnostics. Their existing deletion, retention and restoration meanings remain authoritative.
