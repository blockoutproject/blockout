# Data model: V1-to-V2 transition

F14 coordinates data owned elsewhere. It introduces no PostgreSQL migration ledger, duplicate customer directory or durable job model.

## Installation state

| Value                             | Storage and lifecycle                                                                                                             | Invariant                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 initialization complete        | Non-sensitive, stable installation flag in Expo-compatible AsyncStorage. Written after native Auth0 credential clearing succeeds. | Read before mounting Auth0Provider. An interruption before successful persistence repeats safe initialization; failure does not resume V1 credentials. It is not keyed by every app release. |
| Common V2 discovery complete      | Separate installation flag, written on explicit completion or skipping.                                                           | Neither interruption nor initialization alone completes discovery. V1 completion does not substitute for first V2 discovery. Later sign-out/account recreation does not reset V2 completion. |
| Current session and private state | Existing F05 in-memory lifecycle and native SDK credentials.                                                                      | Establish the current account through explicit first V2 sign-in, then normal restoration; never import a cached V1 profile, role or entitlement.                                             |

These flags contain no personal payload and survive only according to the platform's ordinary installation/storage lifecycle. Reinstallation and OS restore require native qualification. F11 age/consent and native notification permissions remain separately owned; no broad permission reset is inferred.

## Identity and entitlement references

Auth0 owns the retained principal, existing linked identities and principal creation date. F05 creates the new V2 business UUID and initial profile from the current authenticated principal. Existing V1 business UUIDs, personal data and administrative roles are not copied.

RevenueCat/store records retain historical customers, product/receipt associations and current rights. F09 associates the new business UUID and handles explicit native restoration under its existing transfer rules. Migration never deletes an old provider customer simply because the business database is rebuilt. No matching by email, automatic alias rewrite or universal one-to-one assumption is valid.

Only indispensable historical references not reliably retained by the providers need private preservation: original principal/customer references, beneficiary evidence and current scoped erasure obligations. Record ambiguities for manual resolution before destroying the necessary source. Do not copy complete profiles or create a durable deletion registry. Check current purchases/revocations at cutover; the logo-edit freeze does not freeze provider state.

The owner reports no V1 gifted entitlement. Confirm this before retirement; if the assumption changes, preserve its beneficiary and current validity under F09 rather than silently dropping it or building speculative migration support now.

## Protected club-logo association

The private preservation copy contains the exact FFVB club identifier string, original logo reference and its usable bytes. Verify association completeness and decoded file usability before destroying the source. Do not convert identifiers to numbers, trim meaningful leading zeros or infer identity from club names.

The sole administrator's freeze makes a verified copy stable while manual edits remain stopped and relevant in-flight writes are settled. The deployed collector must preserve these fields. An exceptional edit refreshes the affected copy; no synchronized counter, change feed or scheduled recopy is required.

| Outcome                                         | Handling                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Exact single rebuilt club match and usable file | Apply through F02's existing protected manual-image association and PostgreSQL image storage.                  |
| No rebuilt club or ambiguous match              | Retain association and file privately for manual resolution; create no guessed club or professional-team link. |
| Missing/unusable file or association            | Preservation is incomplete; block the destructive action affecting that source.                                |

These are verification outcomes, not a new persisted application status enum. Other V1 presentation customizations are outside the preserved scope.

## Reset and reconstructed data

V1 follows, personal notifications/read state, contribution history and unretained profile customizations are not imported. Old destinations/sends are retired under F07; current V2 installation registration follows its normal lifecycle. An already delivered push is not guaranteed recallable and grants no access to an old inbox.

F01/F02 reconstruct the current and three completed seasons from controlled official sources. Native identities, restrictions, partial results and source failures retain their existing meaning. F04 derives its projection from accepted V2 sporting data. Initial reconstruction creates no F07 announcements. Reapplying a protected club logo does not change source identity or fabricate a team relationship.

## Release configuration

The existing store apps, native package/bundle identifiers, EAS project, signing credentials and increasing build counters remain provider-owned. The existing subscription product/base plan carries the new price; a V2 offering changes presentation, not purchase identity. No Blockout price table mirrors store renewal cohorts.

The legacy status adapter reads a small deployment configuration: the qualified first V2 versions and existing store URLs, with the frozen historical wire shape and maintenance disabled for retired clients. It has no second writable settings aggregate. Its fixed retirement thresholds reject every supported V1 release independently of later F12 settings changes. The adapter remains callable while ordinary V2 use is in maintenance.

Restoration of any retained copy must apply current F05/F09/F11 restrictions before publication. Preserving evidence does not authorize restoring erased personal data or extending an expired entitlement.
