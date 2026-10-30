# F07 contract boundaries

## Canonical HTTP source

The backend provides and the mobile consumes the [mobile OpenAPI root](../../../contracts/http/mobile/openapi.yaml). F07 owns its [notification paths](../../../contracts/http/mobile/notifications/paths.yaml), [parameters](../../../contracts/http/mobile/notifications/parameters.yaml) and [schemas](../../../contracts/http/mobile/notifications/schemas.yaml). This directory is a guide, not another editable contract.

| Resource                                                    | Operations and meaning                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/accounts/{accountId}/notifications`                       | GET owner inbox, twenty entries, original date/UUID descending, optional opaque continuation.                      |
| `/accounts/{accountId}/notifications/{notificationId}`      | GET current retained entry; PATCH read=true only. A repeated read cannot reset state or recreate an expired entry. |
| `/accounts/{accountId}/notification-summary`                | GET all consultable unread entries' count and next age-driven expiry.                                              |
| `/accounts/{accountId}/push-subscriptions/{subscriptionId}` | PUT complete current connection association; DELETE exact association, absent deletion succeeds.                   |

Every operation checks the usable authenticated owner and F12 admission. Pro/moderation grant no foreign access. Account recreation uses another UUID. A cursor encodes only continuation keys, grants no access and remains usable after its former bound row is removed. New entries require refresh; all pages apply current age/visibility. No list total or snapshot is promised.

Reuse F03's match summary and division presentation with identical public meaning, without exposing video addresses or private author/moderator data. Notification text is current French presentation; family and creation date remain stable. Enum extension is not assumed compatible. Absence is explicit: nextCursor at end, nextExpiryAt at zero, sporting facts according to their owning schema. None of those absences is a fabricated zero or null.

Requests reject unknown fields and forbidden null; responses validate known fields while allowing additions. Successful private responses and errors use no-store. PATCH advertises the existing atomic JSON document format. No parallel error profile, generic batch API, event endpoint or push delivery-status resource. F13 owns validation/bundling, OpenAPI Generator, Orval/Zod and affected consumer compilation; this planning task generates no application code.

## In-process interfaces

| Owner / provider                     | Consumer and agreement                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F02 sporting acceptance              | F07 receives previous/current definitive result, match identity and trusted discovery/reconstruction context within the acceptance transaction. Current public-link state under the match lock fixes composition.   |
| F08 accepted contribution transition | F07 receives actual publication/approval/reactivation or availability change. A repeated/failed proposal is not a new event; consumed match categories remain consumed.                                             |
| F06 follows                          | F07 selects distinct eligible account IDs plus retained relation IDs for both teams and pool; before sending at least one originally selected relationship must still exist. No follow history or new F06 endpoint. |
| F05 account lifecycle                | F07 checks usable original identities, removes inbox/subscriptions in local erasure, and supplies bounded exact-association logout removal.                                                                         |
| F12 admission                        | All private routes use ordinary access rules and explicit authorized bypass. Maintenance suspends new pushes even for operators; creation and purge continue, without catch-up.                                     |
| F03 current consultation             | F07 derives current authorized presentation and navigates through the existing match route. Old pushes after account changes never read the former owner's inbox.                                                   |
| F11 / F14                            | F07 preserves private data/retention rules and existing ad navigation; transition imports neither old inbox nor pending V1 sends.                                                                                   |

These calls are explicit application APIs in one backend, not HTTP APIs between feature modules. They must not pass JPA entities or import another feature's repository. Required F07 writes share the producer transaction; external push happens after commit.

## External provider

Expo owns [its HTTP send/receipt API](https://docs.expo.dev/push-notifications/sending-notifications/). Spring RestClient consumes it in one focused adapter; do not copy provider schemas into the mobile OpenAPI or add a community Java SDK. Its provider vocabulary remains local to the adapter. Native SDK events supply permissions, token changes, foreground messages and taps. Registration sends the Expo address obtained for the configured project, not the native APNs/FCM token.

Push data contains only ownerAccountId, notificationId and matchId references needed for safe routing, alongside the sporting title/body. It contains no old video URL or private profile fields. IDs are navigation context, never authority. Outgoing messages omit badge counts; supported system badges use the current account’s confirmed summary through the native SDK, with no background synchronization guarantee. Provider acceptance is not a phone receipt. Tokens, addresses and content remain outside logs. The [operations guide](../../../infra/operations/README.md#sporting-push-inputs-and-failure-limits) owns implemented input names and future authorized credential activation. No provider schema or delivery-status resource is added to mobile OpenAPI.
