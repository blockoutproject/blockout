# F13 mobile transport, state and native qualification

**Trace**: FR-008, FR-013, FR-016, FR-018–FR-019, FR-029–FR-031; A08–A10, A19–A21.
**Owners**: F13 transport/shared accessibility; F05 session semantics; F03–F12 product flows.

## Request behavior

| Operation    | Attempt timeout                             | Automatic repetition       |
| ------------ | ------------------------------------------- | -------------------------- |
| Read         | 10 seconds including transfer/body decoding | At most one after 1 second |
| Mutation     | 30 seconds                                  | None                       |
| Image upload | 60 seconds                                  | None                       |

Eligible read failures: transient network/timeout and HTTP 408/502/503/504. Do not automatically retry explicit offline state, cancellation, authentication/authorization refusal, request/business validation, invalid response contracts or unknown failures. HTTP 429 is a controlled refusal without this generic retry; provider-specific Retry-After behavior belongs to its owner. There is one retry owner in the TanStack Query configuration; the fetch mutator never adds another retry. Worst ordinary timed-out read sequence is approximately 21 seconds, without blocking navigation.

Timeouts use abortable requests and release listeners/timers. The deadline covers response body consumption as well as headers. Check session/cancellation before scheduling and before sending a retry. An abandoned screen must not initiate a queued retry. No infinite exponential backoff or background retry loop. These limits do not terminate an interactive Auth0 browser flow or native store purchase dialogue.

A mutation timeout/connection loss is uncertain when the request may have reached the server. Never label it cancelled or retry automatically. Reread domain state or use supported provider evidence/manual resolution as appropriate. Disable ordinary double-submission while pending, but domain uniqueness/version checks remain server responsibilities. F10's rare externally created duplicate issue follows its explicit manual resolution rule.

## Session and state isolation

Capture an in-memory session generation when a request starts. On logout/account replacement, increment it, cancel private in-flight queries, clear private cached data and reset account-scoped rights/state. A result/error side effect from an older generation is discarded even if transport cancellation failed. Query keys scope private resources by the current account where appropriate; key scoping alone does not replace cache clearing or server authorization.

Auth0 secure token management belongs to F05; no token in AsyncStorage, logs, query keys or error messages. Public retained data may remain only when its owner's current visibility permits it. A 401 triggers F05's defined session handling; a timeout or 503 does not by itself log the user out. Server-proven invalid tokens, withdrawn permissions and an erased/deleting business account must refuse access under F05/F09 rules. This does not add retroactive JWT invalidation or override F05's accepted same-subject return limitation.

Keep loading, true empty, retained data, refreshing, offline, error, denied, pending action and uncertain outcome distinct. Preserve editable values after failures and dirty form values during refetch. Failed contract validation never installs successful cached data. No global continuous refresh rule: F03/F06/F09/F12 own freshness and lifecycle triggers. No SQLite, persisted query cache or offline mutation queue.

## Presentation and accessibility

Use existing approved foundations/states, French Blockout text and domain date/source semantics. Shared controls expose accessible name, role and state; 44 logical-point touch targets; coherent focus order and restoration after overlays; essential text readable with system scaling. Respect reduced motion; no color/animation-only status or unexplained gesture. Navigation/back remain available during network waits.

Do not create a new error-screen design or UI kit in F13. Implement a shared control/state only when an approved feature has a concrete consumer. Its owner supplies the exact approved Figma node and state matrix. Material visual/journey changes require design revalidation.

## Native evidence and release configuration

- Development build: local Expo development client/Metro; not a production artifact.
- Preview: separate application IDs, display name/icon distinction, preproduction API; on-demand EAS internal Android APK and registered-device iOS ad hoc build.
- Production candidate: existing production app/store identities preserved by F14, production API, build/version recorded; manual EAS Build/Submit to TestFlight and Play internal testing.
- Public store release remains manual. No EAS Update/OTA. A preview-configured binary cannot be promoted into a production binary.
- EAS public config contains only non-secret endpoints/identifiers. Auth0 callback/logout URLs and platform identifiers are qualified against authorized provider configuration, not guessed in documentation.
- Operator independently chooses the minimum supported app version per platform under F12 after real store availability. API support follows all still-permitted clients.

Jest Expo/RNTL proves state, navigation intent, validation, forms, timeout/retry and session isolation with controlled I/O. It does not prove native SDK integration or visual fidelity. Qualify both actual iPhone/Android devices for affected auth, purchases/restore, push, consent, accessibility and provider journeys. Record OS/device/build identity and limitations. Free EAS quotas are checked before use; no implicit paid upgrade.
