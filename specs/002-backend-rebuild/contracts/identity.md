# Identity and subscription contracts

The current-user contract belongs to T015–T023. Subscription contracts below belong to the separate T024–T032 increment; their presence here does not make those routes available in the profile delivery. OpenAPI sources define generated transport types; this document describes behavior and delivery boundaries.

## Current user

POST /api/v2/users/me has no request body. JWT supplies the actor. Return 201 with Location: /api/v2/users/me for the winning creation, or 200 for existing/concurrent reuse. GET on that Location is read-only, returning 200 or 404 USER_NOT_FOUND.

UserProfileResponse: id UUID, pseudo string, email/firstName/lastName/phoneNumber/pictureUrl nullable strings, active boolean, createdAt/updatedAt UTC date-times. Never return external subject, provider identities, credentials, internal billing binding, or a fabricated favorites list.

Errors use ProblemDetail with stable code: 401 bearer validation; 403 USER_IDENTITY_REQUIRED, USER_INACTIVE; 404 USER_NOT_FOUND; 503 PROFILE_STORE_UNAVAILABLE, IDENTITY_PROVIDER_UNAVAILABLE or IDENTITY_CONFIGURATION_ERROR with Retry-After; 409 IDENTITY_MISMATCH or IDENTITY_NOT_SUPPORTED; 500 INTERNAL_ERROR for unexpected failures. Provider messages and profile attributes never appear in details. Response caches are private/no-store. Only the current actor's profile is addressable.

## Subscription delivery

GET /api/v2/users/me/subscription returns local active/grace/inactive/unknown evidence with verifiedAt, usableUntil, refreshState and safe errorCode. No GET starts work. POST /api/v2/users/me/subscription-refreshes returns 202, Location pointing at subscription and Retry-After; requests for pending work coalesce without losing arrivals. POST profile creation publishes the initial refresh atomically only once the matching worker handler is delivered.

POST /api/v2/webhooks/revenuecat authenticates X-RevenueCat-Webhook-Signature (`t=<seconds>,v1=<hex>`) over t+'.'+raw JSON bytes before parsing. It persists a deduplicated receipt and publishes work before 200. Auth0 bearer authentication is not the webhook credential. No provider-specific payload is exposed in the mobile contract.
