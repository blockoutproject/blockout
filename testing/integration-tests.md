# Integration scenario inventory

The [canonical patterns](README.md) own setup, naming and lifecycle conventions. This inventory audits the current handwritten integration boundaries, including correctly classified unit scenarios inside the collector and mobile boundary families. Each named method inherits its suite's explicitly listed real components and doubles. Parameterized inputs remain in the linked executable source; every declared row is covered. The regression column describes what would make the assertions fail, not a claim that the test ran or that a provider/native qualification passed.

## Process, scheduling configuration and diagnostics

### AccessSettingsConsumerProcessIntegrationTest

[Source](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumerProcessIntegrationTest.java). Real: operating-system process tree, `ProcessHandle` and the consumer fixture's cleanup. Controlled: a shell with an idle child replaces npm/Jest; no Spring, PostgreSQL or HTTP. The child's `sleep` keeps it alive until termination and is not an assertion delay. Cleanup forcibly terminates both processes in `finally` and clears the intentional interrupt.

| Method                                 | Detectable regression                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `stopsDelegatedChildAfterTimeout`      | A zero-deadline consumer wait leaves its real delegated child or parent alive.      |
| `stopsDelegatedChildAfterInterruption` | Interrupted waiting fails to propagate interruption or leaves either process alive. |

### SearchProjectionConfigurationIntegrationTest

[Source](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionConfigurationIntegrationTest.java). Real: minimal Spring web/non-web contexts, production projection configuration, native scheduler registration, property validation and Micrometer registry. Controlled: `ProjectSearch` execution. Each runner closes its scheduler/context; no database, search engine or execution-timing claim.

| Method                      | Detectable regression                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `enablesServingWriter`      | A serving search-enabled context lacks its one-thread projection scheduler or creates duplicate workers. |
| `preservesDefaultScheduler` | The dedicated projection worker replaces the default scheduler used by other owners.                     |
| `disablesNonWebWriter`      | A non-web operator context incorrectly starts background search projection.                              |
| `validatesDelay`            | A nonpositive rebuild delay passes native configuration validation.                                      |

### SearchDiagnosticsIntegrationTest

[Source](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchDiagnosticsIntegrationTest.java). Real: Boot ECS logging setup/encoder, captured log output, Micrometer meters, handwritten scheduler/writer. Controlled: task execution, `ProjectSearch`, OpenSearch client or transport failures carrying synthetic private strings. The narrow non-web Boot context owns only logging; each case owns its registry/doubles. These are logging/metric integration proofs, not live engine, SQL or scheduler-concurrency proofs.

| Method                        | Detectable regression                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `preservesLatestSuccess`      | A failed rebuild changes last-success evidence, miscounts failure, or leaks dependency diagnostics.      |
| `diagnosesRejectedSubmission` | Rejected transient work propagates to the committer, lacks a failure metric or leaks private text.       |
| `diagnosesBulkItems`          | HTTP-success bulk item errors become successful projection evidence or expose native error payloads.     |
| `diagnosesCleanupFailure`     | Failure to read current aliases triggers deletion, disappears from diagnostics or leaks provider detail. |

## HTTP, generated server contracts and serialization

### `AccessContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/AccessContractJsonTest.java) — 2 scenario methods.

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

| Method                    | Regression detected by its assertions                                   | Shape         |
| ------------------------- | ----------------------------------------------------------------------- | ------------- |
| `preservesCompleteAccess` | Serializes complete nullable access groups and additive response fields | test          |
| `preservesPermissions`    | Preserves absent and boolean permissions without inserting privileges   | parameterized |

### `AccessContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/AccessContractWebMvcTest.java) — 3 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `AccessContractWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                            | Regression detected by its assertions                               | Shape         |
| --------------------------------- | ------------------------------------------------------------------- | ------------- |
| `rejectsInvalidVersionChange`     | Rejects invalid version changes with canonical non-cacheable errors | parameterized |
| `preservesVersionPresence`        | Preserves omitted, null and supplied version fields                 | parameterized |
| `rejectsInvalidMaintenanceChange` | Keeps content edits separate from explicit boolean activation       | parameterized |

### `AdministrationSettingsWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/AdministrationSettingsWebMvcTest.java) — 15 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `AdministrationSettingsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `AccessSettingsExceptionHandler`, `AccessApiMapperImpl`, `UpdateAccessSettings`, `ReadAccessConfiguration`.

**Controlled:** Mockito: `CurrentAccount`, `ActionAuthorization`, `AccessSettingsStore`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                           | Regression detected by its assertions                                          | Shape         |
| -------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| `requiresAuthentication`         | Requires mobile authentication before any settings read                        | parameterized |
| `refusesMaintenanceWithoutGrant` | Checks the independent maintenance grant before reading content                | test          |
| `refusesVersionsWithoutGrant`    | Requires a separate versions grant                                             | test          |
| `rejectsMaintenanceShape`        | Rejects invalid maintenance shapes before use-case effects                     | parameterized |
| `rejectsVersionShape`            | Rejects unknown and null platform request objects                              | parameterized |
| `readsStoredMaintenance`         | Returns a complete private group and the advertised PATCH media type           | test          |
| `clearsOptionalImage`            | Preserves omission while removing an explicitly null optional image            | test          |
| `rejectsStaleNoop`               | Returns 409 for a stale no-op rather than HTTP precondition failure            | test          |
| `refusesInvalidResult`           | Refuses a whole resulting group with a minimum but no store link               | test          |
| `setsDesiredActivation`          | Sets desired activation without replacing content                              | test          |
| `rejectsUnsupportedMedia`        | Refuses unsupported PATCH media without effects                                | test          |
| `readsCompleteVersions`          | Returns both complete platform settings with explicit nulls                    | test          |
| `hidesPreparedContent`           | Anonymous complete reads hide all prepared inactive maintenance content        | test          |
| `refusesUnavailableSettings`     | Unavailable settings produce a safe diagnostic and never fabricate maintenance | parameterized |
| `refusesInvalidActivation`       | Activation requires a desired boolean and cannot accept content fields         | parameterized |

### `MaintenanceAdmissionWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionWebMvcTest.java) — 6 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `MaintenanceAdmissionWebMvcTest.Probe`; Mockito: `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                    | Regression detected by its assertions                                                  | Shape         |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| `refusesOrdinary`         | Refuses ordinary direct calls including unsupported methods and unknown administration | parameterized |
| `preservesExactException` | Leaves exact exceptions to authentication and their owning action authorization        | parameterized |
| `rejectsInvalidHeader`    | Rejects noncanonical bypass values before ordinary work                                | parameterized |
| `rejectsRepeatedHeader`   | Rejects repeated bypass values                                                         | test          |
| `keepsUnavailableGeneric` | Keeps failed admission configuration generic and non-cacheable                         | test          |
| `rejectsInactiveRefusal`  | Does not manufacture active maintenance from an inconsistent refusal                   | test          |

### `AccountAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountAccessWebMvcTest.java) — 18 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `AccountsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `AccountExceptionHandler`, `ReadAccount`, `AccountApiMapperImpl`, `AccountRequest`.

**Controlled:** Mockito: `AccountStore`, `EstablishAccount`, `ChangeAccountProfile`, `ProfilePhotoPreparation`, `CurrentPermissions`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                                | Regression detected by its assertions                                              | Shape         |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| `establishesExplicitly`               | Establishes explicitly with canonical status and generated current permissions     | parameterized |
| `readsCurrentForIdentification`       | Reads locally during controlled maintenance without establishing or synchronizing  | test          |
| `leavesUnknownAbsent`                 | Returns 404 on an unknown current account without establishing it                  | test          |
| `reportsUnavailableStorage`           | Reports unavailable account storage with the canonical non-cacheable 503           | parameterized |
| `preservesUnexpectedIntegrityFailure` | Keeps unexpected storage integrity failures distinct from temporary unavailability | test          |
| `hidesAnotherOwner`                   | Hides another principal's original UUID                                            | test          |
| `requiresOrdinaryAdmission`           | Applies ordinary admission to original reads and establishment only                | test          |
| `rejectsWrongClient`                  | Refuses collector or wrong-client credentials before account effects               | parameterized |
| `rejectsVisitors`                     | Refuses visitors before account effects                                            | test          |
| `rejectsInvalidBearer`                | Refuses invalid bearers before account effects                                     | test          |
| `readsOriginalOwner`                  | Reads the owner's original resource with current photo presence                    | test          |
| `reportsUnavailableEstablishment`     | Reports an unavailable establishment without announcing a usable account           | test          |
| `reportsMissingInitialEmail`          | Returns the canonical missing-provider-email refusal without private details       | test          |
| `forwardsBypassIntent`                | Forwards explicit bypass intent to the controlled admission owner                  | test          |
| `retainsAdmittedLifecycle`            | Retains the exact admitted lifecycle for establishment                             | test          |
| `refusesForeignAdmittedLifecycle`     | Refuses a foreign bypass lifecycle before reading private account data             | parameterized |
| `preservesUnavailableErasure`         | Keeps unfinished erasure unavailable after ordinary admission                      | test          |
| `rejectsMalformedOriginal`            | Rejects a malformed original identifier with canonical non-cacheable validation    | test          |

### `AccountProfileWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountProfileWebMvcTest.java) — 13 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `AccountsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `AccountExceptionHandler`, `ReadAccount`, `AccountApiMapperImpl`, `AccountRequest`, `ChangeAccountProfile`, `ProfilePhotoProcessor`.

**Controlled:** Mockito: `AccountStore`, `EstablishAccount`, `CurrentPermissions`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                          | Regression detected by its assertions                                  | Shape         |
| ------------------------------- | ---------------------------------------------------------------------- | ------------- |
| `rejectsMetadata`               | Rejects invalid or empty metadata without effects                      | parameterized |
| `rejectsUnexpectedImage`        | Rejects an image without explicit replacement intent                   | parameterized |
| `acceptsTrimmedCurrentUsername` | Trims an unchanged valid username before saving                        | parameterized |
| `requiresMetadata`              | Requires JSON metadata before an account mutation                      | test          |
| `refusesMedia`                  | Refuses unsupported photo media without account effects                | parameterized |
| `refusesOversizedPhoto`         | Refuses oversized photo parts before applying a username               | test          |
| `refusesInvalidPhoto`           | Rejects invalid decoded content before applying a username             | test          |
| `translatesCollision`           | Exposes only the canonical username collision after whole-save refusal | test          |
| `refusesExtraPart`              | Rejects unknown or repeated multipart parts                            | parameterized |
| `refusesRepeatedImages`         | Rejects repeated replacement images                                    | test          |
| `readsBinary`                   | Reads private binary photos without JSON serialization                 | test          |
| `hidesAnotherOwner`             | Hides another owner's photo and mutations                              | test          |
| `refusesMissingPhoto`           | Returns 404 for an owner whose photo is absent                         | test          |

### `CollectionContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/CollectionContractWebMvcTest.java) — 9 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectorOperationsController`, `HttpConfiguration`, `SecurityConfiguration`, `CollectionApiMapperImpl`, `CollectionExceptionHandler`.

**Controlled:** Mockito: `ObserveCollectionSource`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptSourceValidation`, `AdmitCollectionCycle`, `RecordCollectionResults`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                       | Regression detected by its assertions                                                      | Shape         |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ------------- |
| `acceptsSourceProposal`      | The generated discovery operation resolves owner identities with no-store                  | test          |
| `acceptsSourceValidation`    | The generated validation route maps terminal evidence and acknowledges the source revision | test          |
| `returnsUnregisteredRuntime` | Returns required explicit null before registration with no-store                           | test          |
| `rejectsInvalidRegistration` | Rejects malformed or unsafe registration before application effects                        | parameterized |
| `refusesMobileIdentity`      | Refuses a mobile identity even when it claims the ingestion scope                          | test          |
| `returnsAdmittedControl`     | A created control cycle exposes its location and omits candidate-only fields               | test          |
| `returnsTargetPage`          | Serializes target items, page index and continuation for the collector                     | parameterized |
| `rejectsUnboundedPage`       | Rejects out-of-range target pages before loading a snapshot                                | parameterized |
| `returnsConflict`            | A stale registration returns the shared non-cacheable conflict                             | test          |

### `CollectionControlWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/CollectionControlWebMvcTest.java) — 5 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionControlsController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `CollectionApiMapperImpl`.

**Controlled:** Mockito: `AccountAccess`, `ChangeCollectionControls`, `ReadCollectionConfiguration`, `CloseCollectionSeason`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                  | Regression detected by its assertions                                                  | Shape         |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------- |
| `acceptsPendingRequest` | A pending collection request returns 202 with its retained intent                      | test          |
| `returnsRunningWork`    | Already running collection work returns 200 with the admitted cycle                    | test          |
| `validatesActivity`     | Activity requires a safe revision and explicit boolean, and rejects unknown properties | parameterized |
| `validatesRequest`      | Manual HTTP requests cannot select an individual target or initial-import mode         | parameterized |
| `validatesClosure`      | Closure requires typed confirmation and offers no reopening flag                       | parameterized |

### `CollectionResultsWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/CollectionResultsWebMvcTest.java) — 5 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionResultsController`, `CollectorOperationsController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `CollectionApiMapperImpl`, `CollectionExceptionHandler`.

**Controlled:** Mockito: `ObserveCollectionSource`, `RecordCollectionResults`, `ReadCollectionConfiguration`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptSourceValidation`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                       | Shape         |
| ------------------------------ | --------------------------------------------------------------------------- | ------------- |
| `preservesResultPresence`      | Omits unmeasured counts and retains required nullable recovery timestamps   | test          |
| `rejectsInvalidPagination`     | Rejects pagination outside the generated bounded contract                   | parameterized |
| `refusesRevokedPermission`     | Refuses current results after collection-management permission is withdrawn | test          |
| `rejectsUnsafeOrder`           | Rejects unsafe result ordinals before application effects                   | test          |
| `refusesConflictingCompletion` | Returns the safe canonical conflict for an incompatible terminal write      | test          |

### `SourcePreparationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/SourcePreparationWebMvcTest.java) — 13 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionSourcesController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `CollectionApiMapperImpl`, `CollectionExceptionHandler`, `IngestionBodyLimitAdvice`.

**Controlled:** Mockito: `PrepareCollectionSources`, `ReadCollectionConfiguration`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                        | Regression detected by its assertions                                         | Shape         |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------- |
| `readsSourceEvidence`         | Source reads retain required nulls and expose no classification readiness     | test          |
| `readsSeasons`                | Returns ordered canonical seasons with their preparation revisions            | test          |
| `createsUnqualifiedCandidate` | Creating a candidate returns its location without implying qualification      | test          |
| `acceptsPendingValidation`    | Validation accepts pending intent with 202 rather than claiming qualification | test          |
| `replacesCandidate`           | Candidate replacement forwards the whole URL and current editing revision     | test          |
| `refusesDuplicateBinding`     | Duplicate binding creation returns the existing canonical conflict            | test          |
| `readsDirectChildren`         | Discovered children use default pagination without totals or mapping metadata | test          |
| `preservesExactConfirmation`  | Season confirmation preserves the exact submitted label                       | test          |
| `forwardsCompleteSelection`   | A selected launch is forwarded as one atomic command                          | test          |
| `refusesInvalidRevision`      | Missing or invalid body revisions fail before any application command         | parameterized |
| `refusesOversizedCommand`     | An oversized selection is refused without dispatching chunks                  | test          |
| `boundsChildren`              | Direct child reads enforce generated pagination bounds                        | parameterized |
| `requiresOperationalGrant`    | A revoked operational grant returns 403 even with an explicit bypass header   | test          |

### `HealthEndpointIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/HealthEndpointIntegrationTest.java) — 5 scenario methods.

**Real:** Native Boot Actuator health aggregation, readiness state, production security chains and MVC HTTP mapping.

**Controlled:** Controlled database `HealthIndicator`; ordinary `MaintenanceAdmission` outside operational routes.

**Limit/cleanup:** No JDBC/SQL proof; `HealthIntegrationTest` owns actual PostgreSQL health. Restores readiness after each scenario.

| Method                       | Regression detected by its assertions                        | Shape         |
| ---------------------------- | ------------------------------------------------------------ | ------------- |
| `returnsMinimalHealthyState` | Returns only aggregate UP to an anonymous main-path GET      | test          |
| `refusesUnhealthyDatabase`   | Maps each non-UP database state to an aggregate-only 503     | parameterized |
| `refusesUnreadyApplication`  | Refuses traffic when application readiness is out of service | test          |
| `deniesDiagnostics`          | Denies anonymous diagnostic and component paths              | parameterized |
| `refusesOtherMethods`        | Denies non-GET probe methods                                 | parameterized |

### `LoggingIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/LoggingIntegrationTest.java) — 3 scenario methods.

**Real:** Boot logging initialization, shipped structured ECS console encoder, SLF4J/MDC emission.

**Controlled:** Synthetic sensitive fields and exceptions; no external log exporter.

**Limit/cleanup:** Console schema/redaction only; no ingestion/export delivery qualification.

| Method                           | Regression detected by its assertions                                               | Shape |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| `excludesSensitiveContext`       | Keeps technical failure context while rejecting free-form sensitive data            | test  |
| `excludesPurposeLimitedContent`  | Excludes advertising, location and support content from ordinary integration errors | test  |
| `preservesPrivateCleanupTargets` | Retains only the approved original-target references for private account cleanup    | test  |

### `SecurityPropertiesIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/SecurityPropertiesIntegrationTest.java) — 2 scenario methods.

**Real:** Native Spring property binder and Bean Validation for `SecurityProperties`; shipped YAML configuration.

**Controlled:** Explicit synthetic environment/properties; host secrets excluded.

**Limit/cleanup:** Configuration binding/startup refusal only; no HTTP/database/provider.

| Method                          | Regression detected by its assertions                    | Shape         |
| ------------------------------- | -------------------------------------------------------- | ------------- |
| `rejectsAbsentVariable`         | Refuses an absent required security environment variable | parameterized |
| `bindsExistingEnvironmentNames` | Binds the existing security environment names            | test          |

### `SecurityWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/SecurityWebMvcTest.java) — 15 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`.

**Controlled:** test-only adapter endpoint(s) `SecurityWebMvcTest.BoundaryAdapter`; loopback synthetic JWKS authority; actual signature decoding runs.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                          | Regression detected by its assertions                                    | Shape         |
| ------------------------------- | ------------------------------------------------------------------------ | ------------- |
| `refusesVisitor`                | Challenges a visitor without invoking an account effect                  | test          |
| `refusesForeignSignature`       | Rejects a signature from an untrusted private key                        | test          |
| `refusesExpiredToken`           | Rejects an expired bearer before an account effect                       | test          |
| `refusesWrongIssuer`            | Rejects a correctly signed token from another issuer                     | test          |
| `refusesWrongAudience`          | Rejects another environment or ingestion audience on the mobile boundary | parameterized |
| `refusesWrongClient`            | Forbids an authenticated but unapproved mobile client                    | parameterized |
| `acceptsMobileToken`            | Passes a valid mobile bearer to the generated account boundary           | test          |
| `refusesMissingExpiry`          | Rejects a bearer without verifiable expiry                               | test          |
| `refusesFutureToken`            | Rejects a bearer that is not valid yet                                   | test          |
| `permitsPublicApiRead`          | Passes anonymous public API reads to their owning controllers            | parameterized |
| `refusesMissingIngestionScope`  | Requires the dedicated ingestion scope                                   | test          |
| `refusesForeignCollectorClient` | Forbids another client even with the ingestion scope                     | test          |
| `acceptsCollectorToken`         | Accepts the dedicated collector audience, client and scope               | test          |
| `permitsLegalRead`              | Keeps existing legal document reads public                               | parameterized |
| `translatesBusinessDenial`      | Keeps a business access denial on the native Bearer 403 boundary         | test          |

### `ContributionAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionAccessWebMvcTest.java) — 9 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `CurrentAccount`, `CurrentPermissions`, `ActionAuthorization`, `MaintenanceAdmission`, `ContributionRequest`.

**Controlled:** test-only adapter endpoint(s) `ContributionAccessWebMvcTest.AccessAdapter`; Mockito: `AccountAccess`, `PermissionStore`, `AccessSettingsStore`, `PlatformTransactionManager`; loopback synthetic JWKS authority; actual signature decoding runs.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                    | Regression detected by its assertions                                           | Shape         |
| ------------------------- | ------------------------------------------------------------------------------- | ------------- |
| `resolvesOriginalAccount` | Returns the original usable UUID without a subscription condition               | parameterized |
| `refusesAnotherAccount`   | Refuses another original account instead of transferring ownership              | test          |
| `refusesErasedAccount`    | Refuses an erased account even while its bearer remains valid                   | test          |
| `refusesRecreatedAccount` | Does not redirect an old command to the recreated account of the same principal | test          |
| `refusesCredentials`      | Refuses untrusted credentials before account or grant effects                   | parameterized |
| `admitsStreamModerator`   | One stream-only grant admits the shared video moderation context                | test          |
| `refusesUnrelatedPower`   | Current absence or unrelated administration and Pro confer no moderation        | parameterized |
| `refusesRevokedGrant`     | Re-reads the moderation grant after it is revoked                               | test          |
| `separatesMaintenance`    | Keeps explicit maintenance bypass separate from stream moderation               | parameterized |

### `ContributionContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionContractJsonTest.java) — 9 scenario methods.

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** Mockito generated interface target solely for native executable-constraint metadata validation.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

| Method                        | Regression detected by its assertions                                              | Shape         |
| ----------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| `rejectsUnknownEnums`         | Keeps every canonical stream vocabulary finite in Java                             | test          |
| `preservesPrivatePresence`    | Retains additive private fields and omits erased names and unknown sporting facts  | test          |
| `acceptsPrivateSportingFacts` | Preserves optional genuine private date and result without inventing a kickoff     | test          |
| `refusesNullAttribution`      | Rejects null optional attribution instead of treating it as omission               | parameterized |
| `preservesErasedReason`       | Requires an erased report reason as explicit null and retains counted facts        | test          |
| `rejectsUnsafeCounts`         | Rejects out-of-range counts through generated Bean Validation                      | parameterized |
| `validatesNativePage`         | Applies the generated twenty-item offset bound to page inputs                      | parameterized |
| `validatesReportPage`         | Accepts twenty reports and refuses twenty-one or an overflowing continuation       | test          |
| `serializesPublicStreamPair`  | Serializes public contribution identity only alongside its contributed URL fixture | test          |

### `ContributionContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionContractWebMvcTest.java) — 3 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `ContributionContractWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                          | Regression detected by its assertions                                         | Shape         |
| ------------------------------- | ----------------------------------------------------------------------------- | ------------- |
| `bindsStrictCommands`           | Binds complete generated commands and rejects unknown, absent and null fields | parameterized |
| `bindsOpaqueRevision`           | Treats revisions as opaque nonempty strings                                   | parameterized |
| `refusesInvalidCommandConcepts` | Refuses numeric revisions and unknown owner actions                           | parameterized |

### `ContributionSubmissionWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionSubmissionWebMvcTest.java) — 13 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `ContributionsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `ContributionExceptionHandler`, `ContributionRequest`, `CurrentAccount`, `MaintenanceAdmission`, `ActionAuthorization`, `CurrentPermissions`, `ContributionApiMapperImpl`, `SubmitModeratedContribution`.

**Controlled:** Mockito: `SubmitContribution`, `ReadOwnContributions`, `AccountAccess`, `AccessSettingsStore`, `PermissionStore`, `PlatformTransactionManager`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                            | Shape         |
| ------------------------------ | -------------------------------------------------------------------------------- | ------------- |
| `createsOrRecognizes`          | Returns completed creation or current repetition with the exact version identity | parameterized |
| `rejectsInvalidBody`           | Rejects missing null and unknown command properties before submission            | parameterized |
| `translatesRefusal`            | Translates safe current policy refusals into canonical private errors            | parameterized |
| `requiresAuthentication`       | Requires authentication before invoking a submission                             | test          |
| `rejectsForeignOwner`          | Refuses an intent addressed to another original account                          | test          |
| `rejectsMediaType`             | Rejects unsupported body media without business effects                          | test          |
| `hidesMissingMember`           | Hides a missing or foreign member through the real generated GET                 | test          |
| `rejectsUnprivilegedModerator` | An unrelated administrative role does not grant stream publication               | test          |
| `readsOwnCollection`           | Returns the owner collection with current eligibility and quota                  | test          |
| `readsOwnMember`               | Returns the exact current owner member with its match revision                   | test          |
| `publishesAsModerator`         | Creates a direct moderator publication with its administrative member Location   | test          |
| `reportsStorageOutage`         | Translates a known storage acquisition outage into a safe unavailable response   | test          |
| `reportsAudienceConflict`      | An audience change is a safe conflict without a mutation replay                  | test          |

### `FollowAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowAccessWebMvcTest.java) — 9 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `FollowingRequest`, `FollowingWebConfiguration`, `CurrentAccount`, `MaintenanceAdmission`, `ActionAuthorization`, `CurrentPermissions`.

**Controlled:** test-only adapter endpoint(s) `FollowingContractWebMvcTest.Adapter`; Mockito: `AccountAccess`, `AccessSettingsStore`, `PermissionStore`, `PlatformTransactionManager`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                       | Regression detected by its assertions                                        | Shape         |
| ---------------------------- | ---------------------------------------------------------------------------- | ------------- |
| `admitsOriginal`             | Admits the usable original UUID without entitlement conditions               | parameterized |
| `refusesUnavailableOriginal` | Hides an absent or different original owner even with an administrator claim | parameterized |
| `rejectsPrivateGuest`        | Rejects guests before any private owner lookup                               | test          |
| `reportsUnavailableProfile`  | Reports an unavailable private profile without exposing diagnostics          | test          |
| `refusesCollector`           | Refuses collector credentials at the mobile security boundary                | test          |
| `requiresBypass`             | Requires explicit current bypass before ordinary following access            | test          |
| `keepsBypassOwner`           | Bypass never authorizes another original lifecycle                           | test          |
| `refusesMissingGrant`        | Bypass requires a current grant rather than an administrator claim           | test          |
| `admitsPublicCounts`         | Admits public follower counts without reading any private profile            | parameterized |

### `FollowStateWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowStateWebMvcTest.java) — 11 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `FollowingController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `FollowingExceptionHandler`, `FollowingRequest`, `CurrentAccount`, `MaintenanceAdmission`, `ActionAuthorization`, `CurrentPermissions`.

**Controlled:** Mockito: `ReadFollowState`, `ReplaceFollowState`, `AccountAccess`, `AccessSettingsStore`, `PermissionStore`, `PlatformTransactionManager`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                      | Regression detected by its assertions                                     | Shape         |
| --------------------------- | ------------------------------------------------------------------------- | ------------- |
| `readsConfirmedState`       | Returns the confirmed boolean for a member read                           | parameterized |
| `replacesState`             | Returns application confirmation rather than echoing the requested state  | parameterized |
| `rejectsBody`               | Rejects incomplete or coerced bodies before mutation                      | parameterized |
| `rejectsQuery`              | Rejects all member query properties for both GET and PUT                  | parameterized |
| `rejectsMedia`              | Rejects unsupported media before mutation                                 | test          |
| `rejectsCredentials`        | Rejects guests and collector credentials without accessing personal state | test          |
| `rejectsUnavailableOwner`   | Hides unavailable original accounts despite an administrator claim        | parameterized |
| `rejectsTarget`             | Hides missing or currently hidden targets without unsafe details          | parameterized |
| `rejectsUnavailableStorage` | Translates storage unavailability into an opaque retryable read failure   | test          |
| `admitsExplicitBypass`      | Requires a current explicit maintenance bypass for the original owner     | test          |
| `rejectsDelete`             | Rejects DELETE instead of exposing a toggle or alternate removal protocol | test          |

### `FollowingContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowingContractJsonTest.java) — 1 scenario methods.

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

| Method                    | Regression detected by its assertions                                             | Shape |
| ------------------------- | --------------------------------------------------------------------------------- | ----- |
| `validatesResponseBounds` | Validates generated twenty-item pages, continuation bounds and exact count bounds | test  |

### `FollowingContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowingContractWebMvcTest.java) — 8 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`, `FollowingRequest`, `FollowingWebConfiguration`.

**Controlled:** test-only adapter endpoint(s) `FollowingContractWebMvcTest.Adapter`; Mockito: `CurrentAccount`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                      | Regression detected by its assertions                                     | Shape         |
| --------------------------- | ------------------------------------------------------------------------- | ------------- |
| `bindsBoolean`              | Binds required complete true and false state through generated interfaces | parameterized |
| `rejectsBody`               | Rejects missing, null, coerced or additive request state                  | parameterized |
| `preservesAbsence`          | Keeps absent season and exhausted continuation distinct from values       | parameterized |
| `rejectsPage`               | Rejects pages outside the generated native offset bound                   | parameterized |
| `rejectsQuery`              | Rejects undeclared, repeated or coerced query shapes                      | parameterized |
| `serializesOptionsAndCount` | Preserves generated options omission and exact safe integer counts        | test          |
| `rejectsMediaType`          | Rejects unsupported mutation media types                                  | test          |
| `bindsCalendar`             | Binds the reused personal calendar without losing its required envelope   | test          |

### `LegacyApplicationStatusUnavailableWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusUnavailableWebMvcTest.java) — 1 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `LegacyApplicationStatusController`, `HttpConfiguration`, `SecurityConfiguration`, `LegacyApplicationStatusMapperImpl`.

**Controlled:** .

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                          | Regression detected by its assertions                                | Shape |
| ------------------------------- | -------------------------------------------------------------------- | ----- |
| `refusesUnconfiguredRetirement` | Returns canonical unavailable without permissive retirement defaults | test  |

### `LegacyApplicationStatusWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusWebMvcTest.java) — 6 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `LegacyApplicationStatusController`, `HttpConfiguration`, `SecurityConfiguration`, `LegacyApplicationStatusMapperImpl`.

**Controlled:** Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                                    | Regression detected by its assertions                                   | Shape         |
| ----------------------------------------- | ----------------------------------------------------------------------- | ------------- |
| `returnsHistoricalResponse`               | Returns the flat historical response without credentials or maintenance | test          |
| `ignoresMalformedBearer`                  | Returns public update status despite a malformed bearer                 | test          |
| `ignoresOldClientIdentity`                | Returns public update status for an old authenticated client            | test          |
| `rejectsMalformedBearerOutsideStatusRead` | Rejects malformed bearers outside the exact legacy status GET           | parameterized |
| `refusesStatusMutation`                   | Does not expose an authenticated legacy status mutation                 | test          |
| `grantsNoLegacyBusinessAccess`            | A public status read grants no access to old business paths             | test          |

### `LegacyRetirementPropertiesIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/legacy/infrastructure/LegacyRetirementPropertiesIntegrationTest.java) — 3 scenario methods.

**Real:** Native Spring property binder and Bean Validation for `LegacyRetirementProperties`.

**Controlled:** Explicit synthetic environment/properties; host secrets excluded.

**Limit/cleanup:** Configuration binding/startup refusal only; no HTTP/database/provider.

| Method                   | Regression detected by its assertions                                               | Shape         |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------- |
| `bindsRetirementInputs`  | Binds both independent release versions and store destinations from the environment | test          |
| `requiresEveryInput`     | Leaves retirement unavailable when any required input is absent                     | parameterized |
| `rejectsMalformedInputs` | Rejects malformed supplied values instead of publishing a broken update action      | parameterized |

### `NotificationContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractJsonTest.java) — 5 scenario methods.

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

| Method                  | Regression detected by its assertions                                               | Shape         |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------- |
| `serializesFamily`      | Serializes each finite family with original microseconds and shared sporting values | parameterized |
| `rejectsUnknownFamily`  | Rejects unknown families without inventing compatibility                            | test          |
| `omitsZeroExpiry`       | Omits expiry for a zero-count summary                                               | test          |
| `validatesPageBound`    | Rejects arrays beyond twenty entries through generated constraints                  | test          |
| `validatesSummaryBound` | Rejects negative counts through generated constraints                               | test          |

### `NotificationContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractWebMvcTest.java) — 10 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`, `NotificationRequest`.

**Controlled:** test-only adapter endpoint(s) `NotificationContractWebMvcTest.Adapter`; Mockito: `CurrentAccount`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                            | Regression detected by its assertions                                      | Shape         |
| --------------------------------- | -------------------------------------------------------------------------- | ------------- |
| `preservesPageBoundary`           | Keeps twenty entries with an absent end cursor                             | test          |
| `preservesSummaryPrecision`       | Serializes the authored int64 count with its precise expiry                | test          |
| `rejectsReadIntent`               | Rejects every unsupported read intent at the generated HTTP boundary       | parameterized |
| `acceptsReadIntent`               | Accepts true intent without an opened state                                | test          |
| `rejectsRegistration`             | Rejects incomplete, null or extra destination request fields               | parameterized |
| `rejectsQueries`                  | Rejects undeclared or repeated collection parameters                       | parameterized |
| `rejectsMemberQueries`            | Only the collection accepts a cursor query parameter                       | parameterized |
| `preservesSubscriptionProjection` | Returns created association identities without echoing the private address | test          |
| `preservesNoContentRemoval`       | Returns 204 without a removal representation                               | test          |
| `refusesManualDeletion`           | Provides no manual notification deletion operation                         | test          |

### `NotificationsWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationsWebMvcTest.java) — 11 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `NotificationsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `NotificationRequest`, `NotificationApiMapperImpl`, `ConsultationApiMapperImpl`, `NotificationExceptionHandler`.

**Controlled:** Mockito: `CurrentAccount`, `AccountAccess`, `MaintenanceAdmission`, `ReadInbox`, `MarkNotificationRead`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                       | Regression detected by its assertions                                         | Shape         |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------- |
| `listsOwner`                 | Returns an exhausted empty owner page with no total or null cursor            | test          |
| `rejectsReadDocument`        | Rejects unsupported read documents before the write                           | parameterized |
| `readsThenMarks`             | Member GET leaves unread unchanged and PATCH returns the confirmed true state | test          |
| `summarizesOwner`            | Zero summary omits expiry and all successful private responses forbid storage | test          |
| `rejectsCursor`              | Rejects malformed collection/query intent before database selection           | parameterized |
| `hidesMember`                | Hides missing, expired or restricted members through the canonical 404        | test          |
| `refusesForeignOwner`        | Refuses foreign owners on collection/member/summary/mark operations           | test          |
| `preservesUnavailable`       | Storage failures remain unavailable, distinct from an empty inbox             | test          |
| `preservesUnexpectedFailure` | Unexpected SQL faults retain the shared HTTP failure outcome                  | test          |
| `refusesUnsupportedActions`  | No manual notification deletion or other PATCH media is exposed               | test          |
| `enforcesAdmission`          | Guests and maintenance refusals never reach the owner inbox reader            | test          |

### `NotificationAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationAccessWebMvcTest.java) — 12 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `CurrentAccount`, `AccountAccess`, `NotificationRequest`.

**Controlled:** test-only adapter endpoint(s) `NotificationAccessWebMvcTest.Adapter`; Mockito: `AccountStore`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal; loopback synthetic JWKS authority; actual signature decoding runs.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                          | Regression detected by its assertions                                           | Shape         |
| ------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| `refusesWrongAudience`          | Rejects signed wrong-environment and ingestion audiences on notification routes | parameterized |
| `refusesWrongEnvironmentIssuer` | Rejects another issuer even when signed by the known test key                   | test          |
| `acceptsSignedOwner`            | Accepts a valid signed mobile bearer for its current original owner             | test          |
| `capturesOriginal`              | Captures the usable original UUID independently of later account resolution     | test          |
| `refusesAbsentAccount`          | Refuses erased or not established accounts before personal data                 | test          |
| `refusesForeignPrivilege`       | No entitlement or moderation claim grants another inbox                         | parameterized |
| `refusesUnavailableAccount`     | Fails closed when current owner storage is unavailable                          | parameterized |
| `requiresAdmission`             | Keeps maintenance admission independent of usable ownership                     | test          |
| `preservesOwnerWithBypass`      | An explicitly admitted bypass still resolves only the owner                     | test          |
| `refusesDeniedBypass`           | Refuses bypass denied by F12 before owner resolution                            | test          |
| `refusesWrongClient`            | Refuses collector and other-client credentials at native security               | parameterized |
| `refusesGuest`                  | Challenges guests and invalid bearer credentials                                | test          |

### `NotificationRetentionConfigurationIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/infrastructure/NotificationRetentionConfigurationIntegrationTest.java) — 3 scenario methods.

**Real:** Native config data, scheduled-annotation processor, shipped `NotificationRetentionConfiguration`, CronTrigger calculation.

**Controlled:** `TaskScheduler` and `PurgeNotifications`; host environment/system properties removed.

**Limit/cleanup:** Registration/callback/UTC trigger calculation only; no wall-clock execution or SQL purge.

| Method                         | Regression detected by its assertions                                           | Shape |
| ------------------------------ | ------------------------------------------------------------------------------- | ----- |
| `disablesOrdinaryTestCallback` | Disables retention in ordinary backend test contexts                            | test  |
| `schedulesEveryUtcDay`         | Registers the shipped daily UTC trigger across daylight-saving transitions      | test  |
| `refusesInvalidConfiguration`  | Rejects an invalid retention cron at startup through Spring's native validation | test  |

### `DiscoveryAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryAccessWebMvcTest.java) — 7 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `DiscoveryController`, `SecurityConfiguration`, `HttpConfiguration`, `DiscoveryWebConfiguration`, `ApiExceptionHandler`, `CurrentPermissions`, `ActionAuthorization`, `MaintenanceAdmission`, `DiscoveryRequest`, `DiscoveryApiMapperImpl`, `ConsultationApiMapperImpl`.

**Controlled:** Mockito: `AccountAccess`, `PermissionStore`, `AccessSettingsStore`, `PlatformTransactionManager`, `ReadSearch`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                           | Shape         |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------- |
| `admitsGuest`                  | Admits public textual discovery without an account lookup                       | parameterized |
| `admitsPublicRights`           | Ignores entitlement claims for ordinary public search                           | parameterized |
| `refusesMissingBypassIdentity` | Refuses anonymous explicit bypass during active maintenance                     | test          |
| `refusesInvalidBearer`         | Refuses a malformed bearer before current admission or search                   | test          |
| `refusesWrongClient`           | Refuses an authenticated wrong mobile client before current admission or search | test          |
| `refusesActiveMaintenance`     | Refuses ordinary search during active maintenance before reading sporting data  | test          |
| `rechecksCurrentGrant`         | Rechecks the actual current bypass grant on every search request                | test          |

### `DiscoveryContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryContractWebMvcTest.java) — 10 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `DiscoveryWebConfiguration`, `ApiExceptionHandler`, `DiscoveryRequest`.

**Controlled:** test-only adapter endpoint(s) `DiscoveryContractWebMvcTest.Adapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                    | Regression detected by its assertions                                      | Shape         |
| ------------------------- | -------------------------------------------------------------------------- | ------------- |
| `acceptsUnicodeLimit`     | Accepts 200 Unicode characters at each generated binding                   | parameterized |
| `rejectsOverLimit`        | Rejects input beyond 200 Unicode characters without truncation             | parameterized |
| `acceptsExpandingCase`    | Normalizes accepted text even when lowercase expands beyond the wire limit | test          |
| `rejectsBlankExample`     | Rejects blank UUID examples alongside a valid retained identity            | parameterized |
| `keepsNonWhitespaceText`  | Keeps non-whitespace control and format characters in textual mode         | parameterized |
| `preservesExamples`       | Preserves ordered distinct retained examples and optional absence          | test          |
| `rejectsInvalidSelection` | Rejects malformed shapes, unknown parameters and incompatible modes        | parameterized |
| `bindsCursorToContext`    | Accepts continuation only for its original normalized selection            | test          |
| `rejectsCursorStructure`  | Rejects malformed decoded cursor structures                                | parameterized |
| `bindsSportingFilters`    | Binds exact sporting wire filters without broadening them                  | test          |

### `DiscoveryWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryWebMvcTest.java) — 3 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `DiscoveryController`, `DiscoveryRequest`, `DiscoveryWebConfiguration`, `DiscoveryApiMapperImpl`, `ConsultationApiMapperImpl`, `DiscoveryExceptionHandler`, `ApiExceptionHandler`.

**Controlled:** Mockito: `ReadSearch`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                   | Shape |
| ------------------------------ | ----------------------------------------------------------------------- | ----- |
| `returnsCurrentClub`           | Serializes only current club presentation with absent context omitted   | test  |
| `exposesUnavailable`           | Returns the shared retryable unavailable profile for an incomplete read | test  |
| `rejectsMalformedContinuation` | Rejects malformed continuations before application reads                | test  |

### `ContractBoundaryWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/shared/http/ContractBoundaryWebMvcTest.java) — 8 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `ContractBoundaryWebMvcTest.BindingAdapter`, `ContractBoundaryWebMvcTest.AccountAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                       | Regression detected by its assertions                                         | Shape         |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------- |
| `rejectsInvalidDate`         | Rejects invalid dates at the generated ingestion boundary                     | parameterized |
| `rejectsMultipartMetadata`   | Rejects invalid multipart metadata using the generated interface              | parameterized |
| `acceptsMultipart`           | Binds JSON metadata and image parts through the generated multipart interface | test          |
| `rejectsUnsupportedMedia`    | Returns safe Problem Details for unsupported media                            | test          |
| `preservesNoContent`         | Keeps an adapter no-content response empty through the generated mapping      | test          |
| `preservesLocation`          | Preserves an adapter resource location through the generated mapping          | test          |
| `sanitizesUnexpectedFailure` | Keeps unexpected failures free of internal details                            | test          |
| `acceptsAdditiveResponse`    | Serializes and decodes valid additive root and nested response fields         | test          |

### `ContractPresenceWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/shared/http/ContractPresenceWebMvcTest.java) — 6 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `ContractPresenceWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                              | Shape         |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------- |
| `rejectsOmittedRequiredNames`  | Rejects omitted required names instead of interpreting them as removal             | parameterized |
| `preservesRequiredNames`       | Preserves explicitly supplied null or value names                                  | parameterized |
| `rejectsOmittedRequiredObject` | Rejects an omitted required classification instead of removing it                  | test          |
| `preservesRequiredObject`      | Preserves an explicitly supplied null or value classification                      | parameterized |
| `rejectsInvalidDivisionColors` | Rejects missing or invalid division colors and gradients through native validation | parameterized |
| `preservesMultipartCollection` | Preserves explicit null or supplied gradients in multipart metadata                | parameterized |

### `HttpErrorOwnershipWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/shared/http/HttpErrorOwnershipWebMvcTest.java) — 4 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionResultsController`, `SportingClassificationController`, `HttpConfiguration`, `CollectionApiMapperImpl`, `SportingAdministrationMapperImpl`.

**Controlled:** Mockito: `CurrentAccount`, `ReadCollectionConfiguration`, `ReadSportingConfiguration`, `ChangeSportingClassification`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                             | Regression detected by its assertions                                           | Shape         |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| `translatesStorageAcquisition`     | Translates storage acquisition failures identically before application dispatch | parameterized |
| `translatesStorageResourceFailure` | Translates storage resource failures identically                                | parameterized |
| `preservesUnexpectedFailure`       | Keeps programming failures distinct from temporary storage outages              | parameterized |
| `preservesFrameworkHeaders`        | Preserves native Allow headers with the same opaque framework error profile     | parameterized |

### `ConsultationContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/ConsultationContractJsonTest.java) — 8 scenario methods.

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation; real `ConsultationApiMapper`.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

| Method                        | Regression detected by its assertions                                              | Shape         |
| ----------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| `preservesAbsence`            | Keeps unknown optional facts absent without manufacturing numbers or private state | test          |
| `preservesSpecialResult`      | Keeps nonnumeric official notation distinct from zero and preserves empty referees | test          |
| `preservesContributedVersion` | Pairs the exact contributed version with its public URL without moderation data    | test          |
| `omitsProfessionalVersion`    | Omits the contribution identity for a professional URL                             | test          |
| `mapsNullableGradient`        | Emits the required gradient as null and preserves exactly three configured colors  | test          |
| `mapsStandings`               | Maps official standings availability without computing rank or statistics          | parameterized |
| `acceptsAdditiveFields`       | Accepts additive generated response properties                                     | test          |
| `rejectsKnownFields`          | Rejects an invalid known field in an otherwise valid generated calendar            | parameterized |

### `DivisionAdministrationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/DivisionAdministrationWebMvcTest.java) — 10 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `DivisionAdministrationController`, `SportingPresentationValidator`, `ValidateSportingImage`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `SportingAdministrationMapperImpl`, `SportingExceptionHandler`.

**Controlled:** Mockito: `CurrentPermissions`, `ChangeDivisionLifecycle`, `ReadSportingConfiguration`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                               | Regression detected by its assertions                                                        | Shape         |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------- |
| `createsDivision`                    | Creates an active division with a matching Location and explicit null presentation values    | test          |
| `refusesBlankDivisionName`           | Rejects a blank division name before decoding optional image content                         | test          |
| `refusesInvalidImage`                | Refuses an undecodable replacement before creating any division                              | test          |
| `refusesUnauthorizedImageValidation` | Refuses a missing lifecycle grant before inspecting invalid image content                    | test          |
| `acceptsActualImage`                 | Accepts decodable supported bytes and derives media type independently from the upload label | parameterized |
| `refusesUnexpectedImage`             | Forbids an image when the logo instruction does not replace it                               | parameterized |
| `requiresReplacementImage`           | Refuses a replacement without image bytes before any write                                   | test          |
| `readsDivisions`                     | Reads the generated list and member projections without caching administrative values        | test          |
| `deactivatesDivision`                | Binds explicit false through the generated lifecycle PUT                                     | test          |
| `requiresMultipart`                  | Requires multipart creation instead of accepting a JSON-only request                         | test          |

### `SportingClassificationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingClassificationWebMvcTest.java) — 8 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SportingClassificationController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `SportingAdministrationMapperImpl`, `SportingExceptionHandler`.

**Controlled:** Mockito: `ChangeSportingClassification`, `ReadSportingConfiguration`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                    | Regression detected by its assertions                                                     | Shape         |
| ------------------------- | ----------------------------------------------------------------------------------------- | ------------- |
| `challengesVisitor`       | Challenges visitors without invoking an administrative use case                           | parameterized |
| `requiresCompleteState`   | Rejects missing, partial and unknown writable state                                       | parameterized |
| `removesSetting`          | Passes an explicit null through the real generated PUT and serializes both required nulls | test          |
| `exposesConflictScopes`   | Returns a safe complete conflict with only scoped identities                              | test          |
| `refusesPermission`       | Preserves the native permission refusal without exposing its private diagnostic           | test          |
| `refusesUnsupportedMedia` | Rejects unsupported request media before invoking a classification command                | test          |
| `readsClassification`     | Reads complete canonical classification values from either generated resource             | parameterized |
| `replacesClassification`  | Maps a complete generated request into the canonical application classification           | test          |

### `SportingIngestionWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingIngestionWebMvcTest.java) — 15 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SportingIngestionController`, `ValidateSportingImage`, `HttpConfiguration`, `SecurityConfiguration`, `ApiExceptionHandler`, `CollectionExceptionHandler`, `SportingExceptionHandler`, `SportingObservationMapperImpl`, `SportingPresentationMapperImpl`, `SportingObservationValidator`, `SportingPresentationValidator`, `IngestionBodyLimitAdvice`.

**Controlled:** Mockito: `AcceptMatchObservation`, `AcceptCalendar`, `AcceptCatalog`, `AcceptStandings`, `AcceptClubDetails`, `AcceptClubLocality`, `AcceptSourceImage`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                                | Regression detected by its assertions                                                  | Shape         |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| `refusesCombinedOverflow`             | Refuses a calendar whose combined collections exceed 1000 entries                      | test          |
| `refusesOversizedJson`                | Refuses more than 8 MiB before parsing or invoking an acceptance service               | test          |
| `validatesEnvelope`                   | Every JSON ingestion envelope requires its generated mandatory context                 | parameterized |
| `refusesWrongClient`                  | A mobile or another environment's client cannot invoke sporting ingestion              | parameterized |
| `returnsCalendarOutcomes`             | Returns canonical synchronous per-item outcomes without a job or multi-status response | test          |
| `refusesInvalidCycleScope`            | An invalid cycle scope is a non-cacheable conflict before item acceptance              | test          |
| `refusesInvalidStandings`             | Refuses contradictory non-publication and undeclared statistic columns before writes   | parameterized |
| `acceptsStandings`                    | Maps a published table through the generated HTTP boundary with source column order    | test          |
| `bindsClubDetailPresence`             | Preserves omitted and explicit-null club fields through generated ingestion binding    | test          |
| `bindsClubLocality`                   | Binds exact locality revision and paired coordinates through generated ingestion       | test          |
| `bindsSourceImageBytes`               | Accepts actual source-image bytes independently from their declared PNG/JPEG type      | test          |
| `refusesUnauthorizedSourceImage`      | Refuses source-image authorization before decoding invalid bytes                       | test          |
| `refusesUnsupportedSourceImageMedia`  | Rejects unsupported source-image media types without an image transaction              | parameterized |
| `boundsSourceImageBeforeConversion`   | Rejects oversized source-image bytes before invoking any image use case                | test          |
| `reportsAnnouncementAudienceConflict` | An audience turnover refuses detail acceptance with a safe conflict                    | test          |

### `SportingObservationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingObservationWebMvcTest.java) — 3 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`, `SportingObservationMapperImpl`.

**Controlled:** test-only adapter endpoint(s) `SportingObservationWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                  | Shape         |
| ------------------------------ | ---------------------------------------------------------------------- | ------------- |
| `rejectsInvalidFacts`          | Rejects invalid or unknown nested facts before application mapping     | parameterized |
| `rejectsInvalidContext`        | Requires valid collection context independently from optional facts    | parameterized |
| `preservesPresenceThroughHttp` | Keeps omitted and withdrawn facts distinct through binding and mapping | parameterized |

### `SportingPresentationMultipartIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingPresentationMultipartIntegrationTest.java) — 3 scenario methods.

**Real:** Loopback HTTP, native servlet multipart PATCH parser, production presentation controller, generated binding, validators and mappers.

**Controlled:** Mockito: `CurrentPermissions`, `CurrentAccount`, `ReadSportingConfiguration`, `ChangeSportingPresentation`, `ChangeClubContacts`; permissive test security.

**Limit/cleanup:** Servlet parsing and size enforcement only; no committed presentation effects or production authorization.

| Method                     | Regression detected by its assertions                                                | Shape         |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| `parsesRealPatch`          | Parses explicit null metadata and replacement bytes on a real multipart PATCH        | test          |
| `enforcesNativeFileBound`  | Accepts the exact five MiB image boundary and refuses the next byte in the container | parameterized |
| `rejectsOmittedManualName` | Refuses omitted required metadata instead of treating it as an explicit null         | test          |

### `SportingPresentationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingPresentationWebMvcTest.java) — 13 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SportingPresentationController`, `SportingPresentationValidator`, `ValidateSportingImage`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `SportingAdministrationMapperImpl`, `SportingPresentationMapperImpl`, `SportingObservationMapperImpl`, `SportingExceptionHandler`.

**Controlled:** Mockito: `CurrentPermissions`, `AccountAccess`, `ChangeSportingPresentation`, `ReadSportingConfiguration`, `ChangeClubContacts`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                               | Shape         |
| ------------------------------ | ----------------------------------------------------------------------------------- | ------------- |
| `replacesPoolNames`            | Accepts complete names-only pool replacement with independent explicit nulls        | test          |
| `readsPresentation`            | Reads each current presentation through its canonical generated shape               | parameterized |
| `bindsMultipartPatch`          | Binds multipart PATCH nulls and detects actual image content before the atomic save | parameterized |
| `rejectsUnexpectedImage`       | Rejects unexpected image parts without saving names or artwork                      | parameterized |
| `rejectsInvalidReplacement`    | Refuses absent, invalid or oversized replacement before any part of the save        | parameterized |
| `requiresImage`                | Requires a replacement part when replace is selected                                | test          |
| `rejectsInvalidPoolState`      | Rejects incomplete or non-name pool state through the generated strict request      | parameterized |
| `mapsIndependentContacts`      | Maps only supplied contact modes while returning explicit nulls                     | test          |
| `rejectsMalformedContactPatch` | Rejects null field objects and strict nested contact properties                     | parameterized |
| `checksGrantBeforeDecoding`    | Checks the current grant before inspecting replacement content                      | test          |
| `translatesStaleRevision`      | Returns the canonical stale conflict without private submitted content              | test          |
| `challengesAnonymousRead`      | Uses a Bearer challenge for an unauthenticated editor read                          | test          |
| `refusesWrongMedia`            | Refuses JSON-only presentation PATCH as unsupported media                           | test          |

### `SportingResourcesWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingResourcesWebMvcTest.java) — 11 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `ConsultationController`, `HttpConfiguration`, `ConsultationHttpConfiguration`, `SecurityConfiguration`, `ConsultationApiMapperImpl`, `SportingExceptionHandler`, `ApiExceptionHandler`.

**Controlled:** Mockito: `ReadSportingResources`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                     | Regression detected by its assertions                                         | Shape         |
| -------------------------- | ----------------------------------------------------------------------------- | ------------- |
| `servesPublicClub`         | Serves guest club facts without private state or credentials                  | test          |
| `servesResourceDetail`     | Serves the exact team pool and match identity through generated JSON mappings | parameterized |
| `servesEmptySeason`        | Returns a successful empty exact club-season selection                        | test          |
| `refusesUnavailableTarget` | Returns safe not-found for missing hidden or dateless targets                 | parameterized |
| `requiresSeason`           | Requires an explicit club season before reading data                          | test          |
| `refusesUnknownSeason`     | Reports an unknown club season safely                                         | test          |
| `servesBinaryLogo`         | Delivers the effective binary image with its owner media type                 | parameterized |
| `bindsAutomaticLogo`       | Binds automatic logo selection without silently choosing the manual logo      | test          |
| `admitsExplicitBypass`     | Rechecks current authorized bypass before image delivery                      | test          |
| `refusesGuestBypass`       | Refuses guest bypass before any sporting read                                 | parameterized |
| `refusesInvalidBearer`     | Refuses an invalid bearer without falling back to public admission            | test          |

### `SupportGeneratedWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/api/SupportGeneratedWebMvcTest.java) — 12 scenario methods.

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `SupportGeneratedWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

| Method                         | Regression detected by its assertions                                        | Shape         |
| ------------------------------ | ---------------------------------------------------------------------------- | ------------- |
| `bindsMultipart`               | Binds Unicode JSON metadata and repeated image parts                         | test          |
| `rejectsUnknownContext`        | Rejects an undeclared context field before the adapter                       | test          |
| `rejectsMissingRequiredField`  | Rejects each omitted required metadata field                                 | parameterized |
| `rejectsEmptyField`            | Rejects empty required text                                                  | parameterized |
| `rejectsBlankField`            | Rejects whitespace-only required text                                        | parameterized |
| `rejectsUnicodeBlankField`     | Rejects Unicode whitespace-only required text                                | parameterized |
| `normalizesBeforeValidation`   | Trims title and reply address before canonical validation                    | test          |
| `enforcesTextBounds`           | Accepts exact text bounds and rejects the next character                     | parameterized |
| `enforcesUtf16Bounds`          | Counts supplementary characters as two units at the approved UTF-16 boundary | parameterized |
| `enforcesContextBounds`        | Enforces every contextual string's exact and excessive length                | parameterized |
| `enforcesEmail`                | Enforces reply-email syntax and its 254 character boundary                   | test          |
| `rejectsInvalidCanonicalShape` | Rejects forbidden null, enum, UUID and nested property values                | parameterized |

### `SupportMultipartIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/api/SupportMultipartIntegrationTest.java) — 2 scenario methods.

**Real:** Loopback HTTP, native embedded servlet multipart parser, generated support binding, `HttpConfiguration`, error translation.

**Controlled:** Test-only generated support adapter and permissive test security; synthetic image and JSON bytes.

**Limit/cleanup:** Exact servlet file/request size proof; no support delivery, production authentication or provider.

| Method                 | Regression detected by its assertions                                            | Shape         |
| ---------------------- | -------------------------------------------------------------------------------- | ------------- |
| `enforcesRequestLimit` | Accepts exactly 26 MiB and refuses the next byte including metadata and overhead | parameterized |
| `enforcesFileLimit`    | Accepts exactly five MiB per file and refuses the next byte                      | parameterized |

### `SupportConfigurationDiagnosticsIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/infrastructure/SupportConfigurationDiagnosticsIntegrationTest.java) — 1 scenario methods.

**Real:** SpringApplication startup, native support property binding/validation, shipped logging/failure diagnostics.

**Controlled:** Synthetic invalid destination configuration.

**Limit/cleanup:** Startup diagnostic redaction only; no GitHub/Discord request.

| Method            | Regression detected by its assertions                                   | Shape |
| ----------------- | ----------------------------------------------------------------------- | ----- |
| `excludesSecrets` | Reports native configuration failure without rejected credential values | test  |

### `SupportPropertiesIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/infrastructure/SupportPropertiesIntegrationTest.java) — 6 scenario methods.

**Real:** Native Spring property binder and Bean Validation for `SupportProperties and MultipartProperties`; shipped YAML configuration.

**Controlled:** Explicit synthetic environment/properties; host secrets excluded.

**Limit/cleanup:** Configuration binding/startup refusal only; no HTTP/database/provider.

| Method                         | Regression detected by its assertions                                          | Shape         |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------- |
| `bindsMultipartLimits`         | Sets exact file and complete multipart request byte limits                     | test          |
| `bindsUnconfiguredFoundation`  | Leaves the destination absent while binding positive bounded waits             | test          |
| `rejectsIncompleteDestination` | Rejects incomplete destination configuration                                   | parameterized |
| `rejectsInvalidTimeout`        | Rejects absent or unbounded waits through native binding                       | parameterized |
| `bindsDestination`             | Binds fixed provider settings without exposing credentials in object rendering | test          |
| `rejectsIdenticalLabels`       | Rejects indistinguishable incomplete and complete intake labels                | parameterized |

## PostgreSQL, JPA, transactions and concurrency

All 48 Spring/PostgreSQL suites use the context-owned container and native property registrar in `PostgresTestConfiguration`, directly or through `ContributionScenario`. Each class closes its context with `@DirtiesContext(AFTER_CLASS)`, so datasource pools and application consumers close before PostgreSQL. Scenario fixtures reset the class's disposable data; explicit transactions, lock observations and failure hooks retain their local cleanup. `DatabaseConfigurationIntegrationTest` is the direct startup/role runner exception: JUnit owns its container, and every manually started application context closes explicitly before that container.

The inventory includes unchanged suites to distinguish retained SQL evidence from reclassified tests. `SearchTraversalIntegrationTest` and `SearchProjectionIntegrationTest` integrate both PostgreSQL and the disposable TLS OpenSearch engine; they are inventoried with external clients because that owner maintains their engine lifecycle. Pure HTTP/MVC/JSON suites belong to the HTTP inventory.

### AccountMaintenanceAdmissionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/api/AccountMaintenanceAdmissionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/api/AccountMaintenanceAdmissionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc controller/security/admission chain. Controlled/absent boundaries: PrincipalReader returns synthetic evidence; jwt() supplies a validated principal; admission spy observes real transaction boundaries.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `establishesWhileInactive`               | Establishes a first profile while inactive, independently of bypass intent.          |
| `refusesOrdinaryAccountOperation`        | Refuses every ordinary account operation with the observed active maintenance.       |
| `identifiesDuringMaintenance`            | Keeps current-account identification available without automatic establishment.      |
| `checksCurrentBypassGrant`               | Requires a current bypass grant on the exact existing business lifecycle.            |
| `bindsBypassToOriginalLifecycle`         | Does not transfer an admitted bypass to a missing or replacement business lifecycle. |
| `establishesAdmittedOriginal`            | Refreshes only the original existing profile admitted by current bypass.             |
| `preservesOrdinaryOwnership`             | Keeps original ownership checks after successful maintenance bypass.                 |
| `rejectsInvalidBypass`                   | Rejects noncanonical bypass syntax before provider or account effects.               |
| `refusesInvalidConfiguration`            | Keeps invalid stored maintenance unavailable rather than allowing profile creation.  |
| `ordersAdmissionBeforeProviderIo`        | Lets an admitted establishment finish while refusing new work after activation.      |

### MaintenanceAdmissionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `MaintenanceAdmission`; MockMvc controller/security/admission chain. Controlled/absent boundaries: jwt() supplies validated principals; real JWT decoding belongs to the security boundary suite.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `requiresExplicitIntent`                 | Blocks public business reads without explicit bypass even for a granted operator.           |
| `checksGuestBypass`                      | Requires credentials for guest bypass without making the public read private when inactive. |
| `rechecksCurrentGrant`                   | Checks the current bypass grant and exact usable lifecycle on each public read.             |
| `keepsGrantsIndependent`                 | Keeps management, versions, domain rights and ordinary bypass independent.                  |
| `observesActivation`                     | Uses committed activation on the next admission and the in-process read.                    |
| `readsCurrentWithinCallerTransaction`    | Reads committed maintenance afresh even inside a longer caller transaction.                 |
| `preservesPublicExceptions`              | Keeps public configuration, existing identification and health readable.                    |
| `preservesIngestion`                     | Keeps ingestion authorization separate from mobile admission.                               |
| `keepsInvalidStateUnavailable`           | Never fabricates maintenance from invalid current SQL configuration.                        |

### AccessSettingsConsumersIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumersIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumersIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AccountStore`; embedded HTTP server, generated mobile client/form components via the existing Jest runner, real JWT decoder with loopback JWKS. Controlled/absent boundaries: native credential I/O; local synthetic JWT issuer; opt-in BLOCKOUT_ACCESS_CONSUMERS_TEST=true, no Auth0 or store runtime.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `qualifiesGeneratedConsumers`            | Exercises two editors, conflicts, independent groups and retained uncertain drafts over real HTTP. |

### AccessSettingsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `UpdateAccessSettings`, `ReadAccessConfiguration`, `AccessSettingsStore`, `AccountStore`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `requiresWriteTransaction`               | Refuses a settings write without its application transaction.                           |
| `requiresMutationLoadTransaction`        | Refuses optimistic mutation loading without a transaction retaining the check.          |
| `readsFixedGroups`                       | Seeds exactly two independently versioned fixed groups.                                 |
| `preservesActivation`                    | Saving content retains activation and leaves the versions group untouched.              |
| `distinguishesNoops`                     | Matching no-ops preserve revision while stale no-ops conflict.                          |
| `clearsOptionalImage`                    | Null clears only the image and omission keeps the content.                              |
| `rejectsPartialInvalidResult`            | Validates the entire resulting versions group before any write.                         |
| `conflictsAcrossPlatforms`               | Platform changes share one revision and cannot overwrite each other.                    |
| `excludesConcurrentCommit`               | Concurrent same-group writes retain JPA optimistic exclusion after revision comparison. |
| `permitsIndependentGroups`               | Concurrent independent-group writes both succeed.                                       |
| `refusesOverflow`                        | Refuses revision overflow but accepts the largest matching no-op.                       |
| `refusesMissingSettings`                 | A missing group is unavailable instead of synthesized defaults.                         |
| `refusesInvalidStoredSettings`           | Invalid stored configuration fails closed even when maintenance is inactive.            |
| `refusesRevokedEditor`                   | A revoked original editor cannot change settings.                                       |
| `refusesWaitingEditorAfterWithdrawal`    | A manual withdrawal ordered first refuses the blocked settings mutation.                |
| `completesEditorBeforeWithdrawal`        | An authorized settings mutation commits before a waiting withdrawal.                    |
| `refusesVersionOverflow`                 | Version no-ops preserve the largest safe revision and real changes refuse overflow.     |
| `checksNoopAtCommit`                     | A matching no-op retains JPA optimistic verification until outer commit.                |
| `constrainsStoredRevision`               | PostgreSQL rejects unsafe persisted revisions independently of the application.         |

### PermissionPersistenceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/infrastructure/PermissionPersistenceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/PermissionPersistenceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AccountStore`, `AccountAccess`, `CurrentPermissions`, `ActionAuthorization`, `SportingStore`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `readsCurrentAssignments`                | Reads each assigned action only for its original account.                               |
| `grantsNoImplicitPrivilege`              | A new account receives no privileges from role-like or entitlement-like identifiers.    |
| `rejectsDuplicateGrant`                  | Enforces unique account-action associations in PostgreSQL.                              |
| `rejectsMissingAccount`                  | Refuses an association without an active account lifecycle.                             |
| `removesErasedAccountGrants`             | Erasure removes grants without transferring them to a recreated principal.              |
| `requiresCallerTransaction`              | Requires the caller's transaction for a protected mutation.                             |
| `refusesMutationAfterWithdrawal`         | A withdrawal ordered first refuses the waiting mutation despite its earlier projection. |
| `finishesMutationBeforeWithdrawal`       | An authorized mutation commits before a waiting manual withdrawal.                      |

### ChangeAccountProfileIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/application/ChangeAccountProfileIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/application/ChangeAccountProfileIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeAccountProfile`, `AccountStore`, `ReadAccount`, `EstablishAccount`; MockMvc multipart handling for the photo transaction scenario. Controlled/absent boundaries: PrincipalReader and MaintenanceAdmission; photo spy executes real ImageIO and checks transaction absence.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `savesProfileAtomically`                 | Saves normalized username and photo together and preserves them on provider login.  |
| `refusesCollisionAtomically`             | Rolls back replacement when a case-insensitive username is unavailable.             |
| `refusesInvalidFieldAtomically`          | Refuses an invalid username without removing the previous photo.                    |
| `removesPhotoExplicitly`                 | Removes all photo columns only on explicit removal.                                 |
| `preservesOmittedConcurrentFields`       | Serializes concurrent supplied fields while preserving omitted fields.              |
| `refusesDeletedOriginal`                 | An old UUID write cannot modify a replacement after deletion wins the row lock.     |
| `preparesPhotoOutsideSql`                | Validates and reencodes actual image bytes before entering the profile transaction. |
| `serializesPhotoChanges`                 | Serializes replacement and removal of the same original photo.                      |
| `settlesConcurrentUsernameCollision`     | Allows at most one competing account to acquire a username regardless of case.      |

### EstablishAccountIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/application/EstablishAccountIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/application/EstablishAccountIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `EstablishAccount`, `ChangeAccountProfile`; real AccountStore spy delegates all SQL operations. Controlled/absent boundaries: PrincipalReader synthetic provider evidence; spy inserts controlled competing commits.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `settlesConcurrentEstablishment`         | Settles concurrent explicit establishment through PostgreSQL uniqueness.                   |
| `preservesConcurrentWinnerProfile`       | Preserves the concurrent winner's profile when synchronizing provider evidence.            |
| `keepsSharedEmailSeparate`               | Keeps principals distinct when provider email is identical.                                |
| `retriesNeutralNameCollision`            | Generates a new neutral candidate after a real case-insensitive name collision.            |
| `rejectsMissingInitialEmail`             | Rejects missing first email without committing partial data.                               |
| `retainsKnownEvidenceOnFailure`          | Retains known profile evidence during provider unavailability.                             |
| `readsPhotoPresence`                     | Reads photo presence independently from the identity and original-row lock.                |
| `returnsCurrentProjection`               | Returns current photo presence and grants with the established original account.           |
| `refusesErasureAfterCommit`              | Keeps a committed establishment unavailable when its original is erased before projection. |
| `refusesErasedOriginal`                  | Does not create or synchronize a replacement when the captured lifecycle disappears.       |

### AccountEstablishmentJpaTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/AccountEstablishmentJpaTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/AccountEstablishmentJpaTest.java). Classification: **JPA slice / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AccountStore`, `AccountAccess`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `settlesConcurrentCreation`              | Allows only one competing creation for a principal or case-insensitive username.   |
| `separatesPrincipalsSharingEmail`        | Keeps exact principals distinct even when they share an email.                     |
| `readsWithoutCreating`                   | Leaves an unknown principal absent on an ordinary read.                            |
| `rejectsUnusableInitialEmail`            | Rejects an unusable initial provider email through native validation.              |
| `rejectsInvalidUsername`                 | Rejects usernames outside the shared ASCII and length rules.                       |
| `normalizesUsername`                     | Trims outer username whitespace before validating and persisting it.               |
| `preservesKnownEvidence`                 | Preserves known email and principal age when provider evidence is unavailable.     |
| `synchronizesAvailableEvidence`          | Synchronizes available provider evidence without replacing the chosen username.    |
| `rollsBackSynchronization`               | Rolls back provider synchronization with the enclosing business transaction.       |
| `doesNotSynchronizeReplacement`          | Never redirects delayed synchronization after original-account deletion.           |
| `requiresCallerTransaction`              | Refuses account locking without an enclosing business transaction.                 |
| `refusesAbsentOriginal`                  | Reports an absent original account to the caller holding the business transaction. |
| `rollsBackPhotoStorage`                  | Stores photo bytes with the account and rolls them back atomically.                |
| `rejectsInvalidPhotoStorage`             | Rejects photo storage outside its media, byte and square-dimension limits.         |
| `rejectsMissingInitialEmail`             | Rejects a missing initial email without persisting a partial account.              |

### SourcePreparationMaintenanceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/api/SourcePreparationMaintenanceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/api/SourcePreparationMaintenanceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc controller/security/admission chain. Controlled/absent boundaries: jwt() supplies validated principals; no provider execution.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `admitsCollectionOperations`             | Current collection permission admits each preparation route without personal bypass.   |
| `refusesGuests`                          | Guests cannot use the operational maintenance exception.                               |
| `refusesOrdinaryMembers`                 | A mobile bearer alone grants no preparation access during maintenance.                 |
| `refusesInheritedPermissions`            | Other operational, sporting, moderation and bypass grants confer no collection access. |
| `rechecksCollectionPermission`           | Revocation after an admitted read forbids the next preparation operation.              |
| `requiresCurrentAccount`                 | An erased account cannot reuse its previously admitted mobile principal.               |
| `keepsOrdinaryAccessBlocked`             | Collection access leaves ordinary business reads blocked by current maintenance.       |
| `refusesImplicitBypass`                  | Explicit personal bypass still requires its own current grant.                         |

### CollectionOperationalEvidenceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/application/CollectionOperationalEvidenceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/application/CollectionOperationalEvidenceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `RecordCollectionResults`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `ObserveCollectionSource`, `CollectionStore`, `ChangeCollectionSeasons`, `ReadSportingData`, `ReadSportingAcquisition`, `ApplicationEventPublisher`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `firstCompetitionFailure`                | First competition failure is actionable for periodic and manual evidence.                  |
| `retainsSeasonlessDeadline`              | Seasonless technical deadline stays at the first failure plus twenty-four hours.           |
| `reportsStructureImmediately`            | Structural seasonless failure is immediately actionable.                                   |
| `recoversOnlyExactKey`                   | Acquisition recovery preserves failed integration, standings and another scope.            |
| `preservesPartialEvidence`               | Partial evidence preserves useful success while bounding only diagnostic counts.           |
| `retainsFailureWhileClosed`              | Pause, closure and completion do not fabricate recovery.                                   |
| `omitsRolledBackEvidence`                | Rollback publishes no accepted result or recovery log.                                     |
| `rereadsDelayedEvidence`                 | Delayed after-commit callbacks reread the latest accepted logical evidence.                |
| `reportsGroupedPreparation`              | Source observations report one current provider-season preparation aggregate.              |
| `reportsActualClassificationNeeds`       | Classification aggregates distinguish effective settings from retained published facts.    |
| `ordersCurrentEvidenceByStableKey`       | Current evidence pages use stable scope, stage and phase ordering.                         |
| `retainsStructuralEvidence`              | Later transport failures cannot postpone retained structural evidence.                     |
| `clearsStructureOnlyWithUsableEvidence`  | Structural evidence discovered during an outage survives until usable evidence.            |
| `reportsUnavailableDiagnostics`          | Unavailable committed diagnostics retain a safe exception type without failing the caller. |

### ClubAcquisitionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/ClubAcquisitionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/ClubAcquisitionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AdmitCollectionCycle`, `ReadCollectionWork`, `RecordCollectionResults`, `RegisterCollectorRuntime`, `ChangeClubContacts`, `RestrictClubContacts`, `AcceptClubDetails`, `ReadSportingConfiguration`, `AcceptClubLocality`, `ReadSportingData`, `AccountStore`, `ChangeCollectionSeasons`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values)          | Protected behavior / detectable regression                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `suppressesOldFailureAfterUnrecordedNormalResult` | A newer accepted F02 no-result suppresses an older failed F01 attempt.                        |
| `retriesTechnicalFailureAfterNormalResult`        | A failed manual retry of an old normal no-result becomes ordinarily eligible.                 |
| `reportsInvalidSecondaryField`                    | Invalid secondary source fields emit a safe diagnostic while retaining usable state.          |
| `respectsDailySheetCadence`                       | Attempts a discovered club immediately then exactly after 24 hours.                           |
| `suppressesUnresolvedLocality`                    | Suppresses unchanged normal no-results until an explicit unresolved-only rerun.               |
| `excludesValidPoints`                             | A manual rerun never recalculates an accepted municipal point.                                |
| `retriesTechnicalFailureNormally`                 | A technical failure remains eligible at the next ordinary hour.                               |
| `tracksEffectiveLocality`                         | Only an effective municipality or postal change creates another unresolved need.              |
| `currentLocalityWins`                             | Targets resolve current corrections and restrictions after admission, rejecting late results. |
| `discoversNewNeedWithinHour`                      | Newly permitted locality is selected on the minute passage independently of sheets.           |

### CollectionAdmissionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionAdmissionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionAdmissionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `RegisterCollectorRuntime`, `CollectorRuntimeAccess`, `ReadCollectionWork`, `AdmitCollectionCycle`, `CollectionCycleAccess`, `ChangeCollectionSeasons`. Controlled/absent boundaries: `Clock`; real-delegating instrumentation: `CollectionStore`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `refusesDuplicateSeasonalControl`        | PostgreSQL refuses duplicate seasonal controls.                                            |
| `refusesDuplicateSourceRoot`             | PostgreSQL refuses duplicate source roots.                                                 |
| `rejectsRevisionExhaustion`              | Rejects revision exhaustion without replacing the current incarnation.                     |
| `keepsWorkReadOnly`                      | Reading current work does not admit cycles or advance configuration.                       |
| `isolatesCandidatePurpose`               | Admits the exact pending candidate without granting sporting-write permission.             |
| `rejectsAmbiguousPurpose`                | Rejects simultaneous control and candidate purpose before admission.                       |
| `replacesObsoleteCycle`                  | A replacement admits a later logical cycle without retaining old context as history.       |
| `freezesEligibleClassification`          | Freezes only current effective classification and pages the snapshot deterministically.    |
| `selectsDueTargets`                      | Uses actual attempt age without making an empty admission successful.                      |
| `resolvesCurrentLocality`                | Reads changed permitted locality when serving a frozen geocoding target.                   |
| `readsLocalitiesAsOneBatch`              | Serving a larger geocoding page does not add one SQL read per club.                        |
| `insertsNewTargetsWithoutExistenceReads` | Inserts new frozen targets without reading each assigned key first.                        |
| `preservesClubsAcrossConcurrentCreation` | Concurrent club creation before the page boundary preserves the admitted selection.        |
| `preservesPoolsAcrossDivisionActivity`   | Concurrent division activity changes preserve every already eligible pool.                 |
| `readsControlSelectionsTogether`         | Reads pending selections without one SQL query per control.                                |
| `readsWorkCyclesTogether`                | Polling reads current cycle states together without reviving old work.                     |
| `readsWorkSeasonsTogether`               | Polling reads only its current seasonal configuration in one lookup.                       |
| `serializesWithClosure`                  | Admission waits for the lifecycle owner and observes its committed closure.                |
| `serializesCompetingAdmissions`          | Only one concurrent admission can consume the current control revision.                    |
| `rejectsStaleCandidate`                  | Rejects an edited candidate revision without admitting validation.                         |
| `refusesControlOverflow`                 | Refuses control revision overflow before creating a cycle.                                 |
| `admitsSelectedInitialImport`            | Initial import consumes only its explicit source selection without enabling periodic work. |
| `excludesInactiveDivision`               | Inactive divisions cannot authorize a sporting target even with a qualified URL.           |
| `admitsCurrentCycle`                     | Admits one cycle with frozen source context before returning it.                           |
| `rejectsStaleRevision`                   | Rejects a stale control revision without creating a cycle.                                 |
| `refusesClosedSeason`                    | Refuses new admission after terminal season closure.                                       |
| `preservesRegistrationRevision`          | Repeating the current registration is harmless but stale replacement is refused.           |
| `holdsFenceThroughDomainCommit`          | Replacement waits for the fenced domain commit then refuses old writes.                    |

### CollectionControlIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionControlIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionControlIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `ReadCollectionSeasons`, `RegisterCollectorRuntime`, `AdmitCollectionCycle`, `ReadCollectionWork`, `RecordCollectionResults`, `CollectionStore`, `com.blockout.backend.collection.application.service.ChangeCollectionControls`, `ReadCollectionConfiguration`, `ReadSportingData`, `ReadSportingAcquisition`, `CloseCollectionSeason`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `listsSelectedScope`                     | Control lists isolate the selected season and preserve family ordering.                           |
| `readsControlCyclesTogether`             | Lists retained control cycles together while preserving family order.                             |
| `onePendingRequest`                      | An authorized request remains pending under actual maintenance and repeated reads create no work. |
| `pauseResume`                            | Pause cancels pending intent and resume restores eligibility without replay.                      |
| `drainsRunning`                          | Running work is returned once but pausing refuses the duplicate and lets admitted work finish.    |
| `currentGrantBeforeDuplicate`            | Grant withdrawal is checked before returning an already pending request.                          |
| `exactTerminalClosure`                   | Closure checks exact canonical label and revision before cancelling only this season.             |
| `closureAfterAdmission`                  | A cycle admitted before closure may finish once, while every new admission is refused.            |
| `independentScopes`                      | Seasonal closure preserves another season's pending request and both seasonless controls.         |
| `refusesRevisionOverflowAtomically`      | Exhausted control revisions refuse pending cancellation and roll back the entire closure.         |
| `deniesRevokedRunningAndClosure`         | A revoked grant cannot close history or return an existing running execution.                     |
| `refusesUnlaunchedProvider`              | An unlaunched provider cannot request or resume while another provider's season is active.        |
| `closureWinsAdmissionRace`               | Closure commits before a waiting admission and leaves no newly admitted cycle.                    |
| `admissionWinsClosureRace`               | Admission commits before waiting closure; only the admitted execution may drain.                  |
| `exactFastWindows`                       | Real F02 match and pool windows include exactly H−1 through H+4 even after final sets.            |
| `currentReliableTimeOnly`                | Unknown and corrected reliable start times supply no stale fast window.                           |

### CollectionResultIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionResultIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionResultIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `RegisterCollectorRuntime`, `ReadCollectionWork`, `AdmitCollectionCycle`, `RecordCollectionResults`, `CollectionStore`, `ChangeCollectionSeasons`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `rejectsLockOutsideTransaction`          | Refuses a runtime lock without an application transaction.                             |
| `retainsUnrelatedFailure`                | A success in another scope leaves an existing outage unchanged.                        |
| `doesNotRecoverEmptySelection`           | An empty selected passage cannot create full-control recovery.                         |
| `refusesCandidateCompletion`             | Candidate validation cannot end through the control completion operation.              |
| `separatesIntegrationFailure`            | Retains an acquisition success when integration fails.                                 |
| `ignoresOldEvidence`                     | Ignores older and duplicate evidence without clearing an outage.                       |
| `retainsOutageAcrossCycles`              | Keeps the same key and first failure across successive cycles.                         |
| `completesPartialWork`                   | Completes partial work without advancing full-control success.                         |
| `recordsFullSuccess`                     | Advances full success for each selected role only with both successful phases.         |
| `retainsFreshnessDuringIntentEdit`       | A later intent edit preserves bulk-written acquisition and completion freshness.       |
| `rollsBackEvidenceWithCompletion`        | A failed enclosing transaction rolls back evidence, freshness and completion together. |
| `retainsLatestAttempt`                   | Retains the latest actual attempt without changing the operator revision.              |
| `refusesIncompletePhases`                | A selected role with a missing phase cannot establish full success.                    |
| `refusesMissingRole`                     | A successful role cannot cover a different selected role for the same scope.           |
| `enforcesTerminalIdentity`               | Accepts identical terminal submission and refuses a conflicting completion.            |
| `rejectsUnselectedRole`                  | Rejects a result for a role absent from the authorized snapshot.                       |
| `checksChildMembership`                  | Resolves match and team scopes through their actual admitted calendar.                 |
| `checksLogoMembershipWithBoundedReads`   | Logo authorization keeps bounded reads across retained pool memberships.               |

### SourcePreparationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/SourcePreparationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/SourcePreparationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `PrepareCollectionSources`, `AcceptSourceValidation`, `ReadCollectionConfiguration`, `ObserveCollectionSource`, `ChangeCollectionSeasons`, `ReadCollectionSeasons`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AdmitCollectionCycle`. Controlled/absent boundaries: `Clock`; real-delegating instrumentation: `CollectionStore`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `retainsSourcePreparationOnDiscovery`    | Current source proposals reuse the season while preserving operator-owned preparation.  |
| `looksUpOnlyProposedSource`              | A repeated proposal loads only its exact source root.                                   |
| `readsValidationCyclesTogether`          | Lists pending validation states together while retaining interrupted or missing cycles. |
| `fencesNewSeasonProposal`                | A superseded incarnation cannot create even a missing season through discovery.         |
| `clearsPreviousEvidence`                 | Changing a candidate clears its accepted validation evidence.                           |
| `rejectsEditedValidation`                | A late validation cannot qualify an edited candidate.                                   |
| `rejectsClosedValidation`                | Closing a season refuses an admitted candidate's late result.                           |
| `completesValidationAtomically`          | Qualification and terminal completion commit together and repeat identically.           |
| `refusesInvalidConfirmation`             | Human confirmation cannot override the collector's invalid scope result.                |
| `confirmsMissingAttribution`             | Exact confirmation supplies only missing season attribution.                            |
| `projectsInterruptedValidation`          | An obsolete unfinished validation reads as unvalidated without requeuing.               |
| `readsSourceAfterCycleReplacement`       | A source read remains available when renewal removes its loaded cycle.                  |
| `retainsPendingRequest`                  | A repeated current pending request retains one request and its revision.                |
| `launchesQualifiedSource`                | Launch freezes the qualified URL without requiring or creating mappings.                |
| `refusesPartialSelection`                | One unqualified selection rolls back the entire launch.                                 |
| `preservesLocksInActiveSeason`           | Pause never unlocks an accepted source while new roots remain preparable.               |
| `requiresCurrentCollectionGrant`         | Other management grants do not authorize source changes.                                |
| `createsUnqualifiedCandidate`            | Manual creation stores an unqualified candidate instead of a second organizer registry. |
| `refusesDuplicateBinding`                | An existing source root cannot be replaced by creation.                                 |
| `refusesStaleSeasonSelection`            | A source change invalidates an older whole-season launch decision.                      |
| `refusesUnusableCandidate`               | Candidate creation refuses credentials and non-HTTP addresses.                          |
| `preservesOlderSeason`                   | Preparing a later season cannot replace accepted references or reopen closed history.   |
| `launchesInitialImportReference`         | Initial import freezes the candidate and permits a later unchanged periodic launch.     |
| `scopesDiscoveredChildren`               | Direct child reads page unmapped pools and refuse a pack from another source.           |

### DatabaseConfigurationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/config/DatabaseConfigurationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/config/DatabaseConfigurationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; production application startup, actual Liquibase and JDBC role permissions. Controlled/absent boundaries: synthetic StartupFixture entity only; isolated per-scenario schemas.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `startsAfterMigration`                   | Starts the real HTTP application after explicit migration with application credentials. |
| `allowsApplicationDataWrites`            | Allows application credentials to insert, update and delete migrated data.              |
| `rejectsMissingSchema`                   | Refuses startup when a mapped table is missing without initializing its schema.         |
| `refusesApplicationDdl`                  | Denies application schema writes.                                                       |

### HealthIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/config/HealthIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/config/HealthIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; embedded HTTP server, actual Actuator readiness and disposable DB pause. Controlled/absent boundaries: none; only its own container is paused, never an external DB.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                               |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `servesMainPortReadiness`                | Reports aggregate readiness from the actual application port.            |
| `boundsUnresponsiveDatabase`             | Returns bounded aggregate-only failure when PostgreSQL stops responding. |

### ContributionAnnouncementsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `Probe`, `SportingProjectionChanges`, `ProcessDueMatch`, `com.blockout.backend.sporting.application.service.MatchContributionAccess`, `com.blockout.backend.notifications.application.AnnouncementRecipients`, `AnnounceContribution`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`; actual publication/result/F07 producers and after-commit event listeners. Controlled/absent boundaries: clock; instance-owned recording/failing after-commit listener; controlled SQL uniqueness failure.

| Scenario (all declared parameter values)          | Protected behavior / detectable regression                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ordersCommittedHandoffs`                         | Hands off announcements before projection invalidation only after their shared commit.              |
| `enrichesAfterPublicLink`                         | Publication before the first result yields live then one enriched result.                           |
| `announcesLaterPublication`                       | A later moderator publication preserves plain composition and creates replay for current followers. |
| `rollsBackPublication`                            | Required inbox persistence failure rolls back publication, revision and allowances.                 |
| `rollsBackResult`                                 | Required inbox failure rolls back only the affected result acceptance.                              |
| `preservesCommitAfterHandoffFailure`              | An after-commit sender failure cannot roll back the accepted result and inbox.                      |
| `preservesEmptyAudienceFacts`                     | Zero recipients consume live and replay so later follows receive no backfill.                       |
| `allowsReplayAfterControlledPurge`                | Controlled personal row purge leaves an unused later-link allowance available exactly once.         |
| `preservesAllowanceThroughControlledReactivation` | Controlled hiding and a new exempt version do not renew an enriched replay allowance.               |
| `serializesPublicationBeforeResult`               | Concurrent result waits for publication and observes its committed public link.                     |
| `locksCompleteAccountUnion`                       | Complete audience locks precede the author lock even when the author is not a follower.             |
| `serializesResultBeforePublication`               | Concurrent publication waits for a final result and keeps plain plus separate replay.               |
| `rejectsDeletedActor`                             | Deleting the original actor while submission waits prevents all publication effects.                |
| `distinguishesFinishedDiscovery`                  | A first finished discovery is silent but a genuinely later publication may announce replay.         |
| `suppressesReconstruction`                        | Trusted reconstruction of a known match records silent result processing.                           |
| `preservesPersonalOrigin`                         | A correction and result withdrawal preserve the original personal read state and creation time.     |
| `serializesDuePassWithPublication`                | A due pass racing a publication consumes the live allowance only once.                              |
| `rejectsConcurrentStaleRevision`                  | Concurrent same-match submissions cannot overwrite an unseen revision.                              |
| `rejectsWithdrawnModeratorGrant`                  | Current moderator grant is reread after the actor lock wait.                                        |
| `serializesDifferentMatchQuota`                   | Concurrent different-match submissions cannot exceed the derived Paris-day quota.                   |

### ContributionAttributionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAttributionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAttributionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `waitsForPreviousOwnerErasure`           | Replacing an erased nonfollowing owner waits before loading mutable attribution. |
| `waitsForRetainedDecisionActor`          | All retained decision actors enter the sorted account union before publication.  |

### ContributionSportingLocksIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionSportingLocksIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionSportingLocksIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeDivisionLifecycle`, `ProcessDueLinkAnnouncements.ProcessDueMatch`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `serializesDivisionActivity`             | Division deactivation waits behind the producer before any account-lock wait. |

### ReadOwnContributionsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `hidesForeignHistory`                    | Foreign members remain unavailable while collection reads include only the caller. |
| `pagesTiedVersions`                      | A twenty-item Slice uses a stable UUID tie-break and independent aggregate usage.  |
| `rejectsHiddenMatch`                     | Current hiding revokes both collection and member access.                          |

### SubmitContributionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitContributionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitContributionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `publishesOrdinaryVersion`               | An eligible ordinary submission publishes one quota-participating version.                  |
| `preservesPendingProposal`               | An ordinary post-result submission remains pending without an announcement.                 |
| `enforcesLifetimeQuota`                  | Third ordinary version is accepted and a fourth different address changes nothing.          |
| `rejectsStaleNoop`                       | A stale unchanged submission is refused before duplicate recognition.                       |
| `preservesForeignActiveVersion`          | Refusing another owner preserves the public version and editing revision.                   |
| `retainsActiveWhilePending`              | A replacement pending after the result retains the authorized active link.                  |
| `publishesModeratorSelection`            | A stream moderator supersedes proposals and resolves the hold with an exempt version.       |
| `enforcesDailyQuota`                     | A fourth distinct Paris-day match is refused while same-match continuation remains allowed. |

### SubmitModeratedContributionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitModeratedContributionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitModeratedContributionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `SubmitModeratedContribution`, `ChangeAttributionAfterCommit`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`; moderated command and post-commit attribution reads. Controlled/absent boundaries: clock; instance-owned listener performs explicit competing account mutation after commit.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                     |
| ---------------------------------------- | -------------------------------------------------------------- |
| `readsAttributionAfterCommit`            | Reads current attribution after publication has committed.     |
| `refusesEnclosingTransaction`            | Refuses an enclosing transaction before moderator publication. |

### ContributionPersistenceJpaTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/infrastructure/ContributionPersistenceJpaTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/infrastructure/ContributionPersistenceJpaTest.java). Classification: **JPA slice / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ContributionStore`, `ContributionPersistenceMapper`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values)    | Protected behavior / detectable regression                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pagesActiveMatchesByIdentity`              | Traverses active matches in bounded exclusive UUID batches.                                                 |
| `enforcesOneActiveVersion`                  | Allows active/pending coexistence while rejecting a second active regardless of owner.                      |
| `enforcesPendingOwnership`                  | Allows distinct owners' pending proposals and rejects one owner's second pending proposal.                  |
| `permitsOwnerlessPendingVersions`           | Retains distinct ownerless pending proposals when their account references are removed.                     |
| `enforcesSameMatchLineage`                  | Rejects cross-match source and replacement references at the database boundary.                             |
| `enforcesSameMatchHold`                     | Rejects an unresolved hold referring to another match's version.                                            |
| `retainsValidLineage`                       | Retains same-match lineage and the exact unresolved hidden version.                                         |
| `enforcesExternalOwners`                    | Rejects version and state rows referring to unknown F02 or F05 identities.                                  |
| `enforcesNonnegativeRevision`               | Rejects a negative editing revision.                                                                        |
| `enforcesCompleteDecisionFacts`             | Rejects incomplete decision facts while permitting erased actor attribution.                                |
| `mapsVersionFacts`                          | Maps immutable literals, source/replacement and distinct publication/later-decision facts through real JPA. |
| `mapsAbsentAttributionAndDecisions`         | Maps an ownerless pending version without inventing decisions.                                              |
| `mapsMatchState`                            | Maps initial and edited match state without creating a row on the initial read.                             |
| `preservesDecisionsAfterAttributionRemoval` | Preserves useful publication and later decision facts after nullable actor attribution is removed.          |
| `supportsJpaReplacementOrdering`            | Flushes old states before inserting replacement active and pending versions.                                |
| `readsUnusedQuota`                          | Returns zero usage before the first participating submission.                                               |
| `aggregatesParisDays`                       | Derives daily usage from participating rows at both DST boundaries with inclusive/exclusive midnight.       |
| `countsPreviouslyContributedMatchAgain`     | Counts yesterday's match today and permits same-day continuation when three distinct matches are used.      |
| `retainsCreationParticipation`              | Keeps ordinary quota participation after approval, rejection, cancellation and later grant changes.         |

### FollowRelationsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/following/infrastructure/FollowRelationsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/following/infrastructure/FollowRelationsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ReadFollowState`, `ReplaceFollowState`, `FollowStore`, `ReadFollowEligibility`, `AccountAccess`. Controlled/absent boundaries: `PrincipalReader`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `replacesIdempotently`                   | Preserves UUID on repeated true and assigns a new UUID after removal.                          |
| `isolatesOwnersAndKinds`                 | Removes only the exact owner's typed association.                                              |
| `enforcesConstraints`                    | Enforces non-null owners/targets, foreign keys and pair uniqueness in PostgreSQL.              |
| `retainsHiddenRelations`                 | Retains a hidden relation and restores its identity when F02 permits viewing again.            |
| `preservesIdentityAcrossCorrections`     | Keeps corrections on the original identity without transferring to homonyms in another season. |
| `refusesMissingTarget`                   | Rejects unknown targets without creating a relationship.                                       |
| `rollsBack`                              | Rolls back all relation changes on a later transactional failure.                              |
| `serializesDevices`                      | Serializes two devices so the last server-recorded state wins.                                 |
| `deletionWins`                           | A waiting original-account write cannot recreate relations after controlled row deletion.      |
| `writerWins`                             | A controlled deletion waits for the writer then removes its relation in the same transaction.  |
| `readsEligibility`                       | Reads current typed relations for eligibility and excludes a recreated UUID.                   |

### LegacyApplicationStatusIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc legacy controller and current settings persistence. Controlled/absent boundaries: no provider, native V1 application or deployed client.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `preservesLegacyReadAcrossActivation`    | Keeps the exact legacy response public after actual F12 maintenance activation.   |
| `preservesRetirementAfterVersionChanges` | Keeps fixed retirement thresholds when F12 versions and store links change.       |
| `preservesRetirementAfterVersionRemoval` | Keeps retirement configured when F12 removes both version minima and store links. |

### LegacyApplicationStatusUnavailableIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusUnavailableIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusUnavailableIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc legacy controller and malformed stored-state response. Controlled/absent boundaries: no provider, native V1 application or deployed client.

| Scenario (all declared parameter values)    | Protected behavior / detectable regression                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `refusesMissingRetirementDuringMaintenance` | Returns unavailable without exposing maintenance as a legacy retirement response. |

### AnnouncementAudienceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementAudienceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementAudienceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ProcessDueLinkAnnouncements.ProcessDueMatch`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                             |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `preservesAllowanceForNewAudience`       | An audience turnover aborts processing without consuming the category. |

### AnnouncementTransactionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementTransactionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementTransactionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ProcessResultAnnouncement`, `NotificationStore`, `AccountAccess`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `deduplicatesRecipients`                 | Creates one unread entry for the three-origin union with original relation IDs.                 |
| `serializesComposition`                  | Orders concurrent result/publication inputs under the same sporting roots.                      |
| `rollsBackOnlyFailedMatch`               | Rolls back one producer's sporting state, facts and entries on required SQL failure.            |
| `preservesCommittedEffects`              | An external after-commit failure preserves the committed producer and inbox.                    |
| `excludesRemovedFollows`                 | Rechecks a relation removed while the result waits for its account lock.                        |
| `excludesDeletedAccount`                 | Account-row deletion before the waiting recipient lock cannot resurrect personal data.          |
| `preservesLifetime`                      | Purge and corrections preserve consumed result composition and read origin.                     |
| `rejectsExistingPersonalIdentity`        | Creating an existing notification UUID cannot reset its retained read state.                    |
| `recordsEmptyAudience`                   | Zero-recipient processing cannot backfill a follow added later.                                 |
| `preservesUnusedPostResultCategory`      | Silent final discovery or reconstruction with a link preserves the later-publication allowance. |
| `sortsAccountLocks`                      | Locks the complete candidate set in sorted account UUID order.                                  |
| `deletionAfterCreation`                  | Controlled deletion waits for creation and removes entries while retaining match facts.         |
| `enforcesAllocationConstraints`          | PostgreSQL enforces owner/match/family uniqueness and required allocation values.               |

### LinkAnnouncementIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `rejectsEnclosingTransaction`            | Rejects an enclosing transaction before a due candidate can be processed.                            |
| `selectsAtProcessing`                    | Advance publication uses the audience present at actual minute processing.                           |
| `waitsForConfirmedStart`                 | An unknown start waits for actual F02 confirmation without resetting an already processed live fact. |
| `excludesWithdrawnLink`                  | A controlled withdrawal before H prevents the due announcement.                                      |
| `excludesHiddenMatch`                    | Current sporting hiding prevents an otherwise due public-link announcement.                          |
| `isolatesFailingCandidate`               | One failing due match rolls back while another match commits independently.                          |

### MarkNotificationReadIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/MarkNotificationReadIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/MarkNotificationReadIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `MarkNotificationRead`, `ReadInbox`, `AccountAccess`. Controlled/absent boundaries: `Clock`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `marksWithoutReset`                      | Repeated true preserves the original creation, family and ordering.           |
| `rejectsExpired`                         | An expired entry cannot be marked or recreated.                               |
| `serializesMarks`                        | Concurrent repeated read intents retain true without moving the entry.        |
| `rejectsDeletedOwner`                    | A waiting mark cannot recreate a controlled removed owner or personal entry.  |
| `reconcilesConcurrentRead`               | A committed read is visible after an overlapping snapshot read finishes.      |
| `refusesUnavailableEntry`                | Foreign, hidden and removed entries never receive a read write.               |
| `preservesConsumedFacts`                 | Reading and controlled personal removal preserve non-personal consumed facts. |

### PurgeNotificationsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `NotificationRetentionConfiguration`, `PurgeNotifications.DeleteExpiredEntries`, `ReadInbox`, `MarkNotificationRead`, `NotificationStore`; real retention entry point, per-batch commits and read/create races. Controlled/absent boundaries: clock; instance-owned Hibernate observer injects one controlled SQL failure or observes a lock attempt.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `removesAllStates`                       | Purges every expired read/hidden combination while retaining the younger boundary.    |
| `ignoresDaylightSaving`                  | Uses 24-hour elapsed days across spring and autumn time changes.                      |
| `resumesNextDailyPass`                   | Keeps committed batches after interruption and removes remaining rows next day.       |
| `racesReadAndCreate`                     | Preserves a committed read while purge waits and accepts a concurrent new allocation. |
| `commitsIndependentlyOfCallerRollback`   | Keeps committed purge removals when an unrelated caller rolls back.                   |
| `purgesDuringMaintenance`                | Purges during maintenance without removing a still-needed follow.                     |

### ReadInboxIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/ReadInboxIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/ReadInboxIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ReadInbox`, `ReadSportingResources`; real repeatable-read projection and bounded SQL queries. Controlled/absent boundaries: clock; instance-owned Hibernate statement observer performs explicit concurrent committed changes.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `continuesWithoutAnchor`                 | Continues through tied timestamps after anchor deletion and a newer insertion. |
| `filtersBeforeWindow`                    | Filters hidden and expired newer rows before filling a twenty-entry page.      |
| `summarizesAllPages`                     | Counts unloaded unread entries with the earliest exact 29-day expiry.          |
| `excludesHidden`                         | Applies current sporting restrictions before paging and counting.              |
| `projectsCurrentOwners`                  | Reuses F03 presentation and current F08 availability after corrections.        |
| `keepsCoherentProjection`                | Keeps multi-query projections in one repeatable-read snapshot.                 |
| `avoidsPerNotificationQueries`           | Loads twenty distinct matches with a bounded number of sporting/link queries.  |
| `scopesEveryContinuation`                | A cursor from another owner supplies keys without granting access to its rows. |

### RecipientSnapshotIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/RecipientSnapshotIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/RecipientSnapshotIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `ReplaceFollowState`, `ProcessDueLinkAnnouncements`; real SQL audience union with independent follow commits. Controlled/absent boundaries: clock; instance-owned Hibernate statement observer coordinates the interleaving without changing SQL.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                              |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `retainsARealAudienceSnapshot`           | A continuously nonempty audience cannot disappear between origin reads. |

### ProjectSearchTransactionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/ProjectSearchTransactionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/ProjectSearchTransactionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ProjectSearch`; ProjectSearch Spring proxy, actual transaction manager and SQL connection. Controlled/absent boundaries: SearchProjectionWriter; no engine; proves rejection before writer effects only.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `refusesEnclosingTransaction`            | Refuses an enclosing SQL transaction before any external projection effect. |

### SearchCurrentDataIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/SearchCurrentDataIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/SearchCurrentDataIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `HydrateSearch`; real ReadSportingResources spy and current SQL hydration. Controlled/absent boundaries: synthetic stale engine candidates; engine retrieval not exercised.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `omitsStaleCity`                         | Omits a stale city even when the resource name matches.                             |
| `hydratesCurrentClub`                    | Returns the current public identity and logo of a club without teams.               |
| `hydratesProfessionalTeam`               | Preserves clubless professional identity across published past and future seasons.  |
| `respectsCurrentRestrictions`            | Current sporting restrictions remove teams and affected pool reads.                 |
| `respectsCurrentFilter`                  | Rechecks exact filters against current classification.                              |
| `attachesClub`                           | A verified club attachment supplies current context without changing team identity. |
| `omitsUnknownClassification`             | An unknown current pool classification cannot satisfy a stale exact filter.         |
| `hydratesUnknownClassification`          | Preserves unknown current pool classification when no exact filter is requested.    |

### ResultAnnouncementIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `consumesResultWithEmptyAudience`        | Accepting a final result consumes its fact even with no followers. |

### SportingPresentationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `com.blockout.backend.access.application.CurrentPermissions`, `ReadSportingData`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AccountStore`, `ChangeDivisionLifecycle`, `ReadSportingConfiguration`, `AcceptSourceImage`, `ChangeClubContacts`, `RestrictClubContacts`, `AcceptClubDetails`, `AcceptClubLocality`, `ChangeSportingPresentation`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values)  | Protected behavior / detectable regression                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `publishesIndependentManualPoolName`      | Publishes a manual pool name while preserving the independent source label.                                    |
| `preservesIndependentNames`               | Keeps independent team names across source refresh and restoration.                                            |
| `rejectsStaleNoOp`                        | Preserves no-op revisions while rejecting stale matching presentation changes.                                 |
| `preservesContactModes`                   | Retains independent contact modes through repeated collection and explicit source restoration.                 |
| `preservesValidSourceValues`              | Preserves valid automatic contacts on invalid proposals and withdraws only explicit nulls.                     |
| `refusesWholeContactCorrection`           | Refuses a whole contact correction if one field is invalid or restricted.                                      |
| `preservesRestrictions`                   | Clears restricted source/manual values and prevents collection or ordinary restoration from republishing them. |
| `rejectsEditorsPredatingRestriction`      | Rejects a contact editor opened before a restriction through the generated route.                              |
| `preservesRestrictionAcrossReactivation`  | Division reactivation cannot authorize a restricted contact from the source.                                   |
| `rejectsRestrictedContactRouteAtomically` | A current restricted manual write returns 409 without changing another contact.                                |
| `restrictsLatestCollectedValues`          | A restriction waits for collection before clearing only the requested field.                                   |
| `rejectsEditWaitingOnRestriction`         | A contact edit waiting on a restriction rejects its obsolete revision without partial writes.                  |
| `reconcilesEffectiveLocality`             | Invalidates the point only when the effective municipal context changes.                                       |
| `excludesLocatedClubFromGeocoding`        | A current municipal point creates no further geocoding candidate.                                              |
| `reportsCurrentUnresolvedResult`          | Reports accepted unresolved locality metadata for F01 scheduling.                                              |
| `preservesPointOnInvalidSubmission`       | Rejects incomplete or out-of-range coordinates without erasing a current valid point.                          |
| `commitsImageAndMetadataTogether`         | Rolls back image bytes, names and metadata together while preserving repeat no-ops.                            |
| `serializesGrantRevocation`               | A grant revoked while a prepared save waits cannot authorize a write.                                          |
| `serializesRestrictionAndCollection`      | Source collection waiting on a rights restriction cannot reintroduce the private field.                        |
| `inheritsCurrentClubArtwork`              | Resolves current club artwork across seasons without copying it into teams.                                    |
| `resolvesProfessionalArtwork`             | Professional artwork follows manual team then LNV then optional club then absence.                             |
| `isolatesSourceArtworkFailure`            | A failed or stale source image preserves the independently accepted match and valid logo.                      |
| `holdsSourceImageFenceThroughCommit`      | Keeps the current F01 incarnation fenced through the source-image commit.                                      |
| `submitsCurrentPresentationScopes`        | Emits changed presentation/privacy scopes only after commit and expands retained dependents.                   |
| `preservesInactiveDivisionPresentation`   | Division presentation preserves explicit inactivity and matching no-op revision.                               |
| `rejectsDuplicateDivisionRename`          | A duplicate division rename rolls back the whole presentation change.                                          |

### SportingProjectionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingProjectionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingProjectionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `AcceptCatalog`, `ReadSportingData`, `ReadSportingAcquisition`, `SportingProjectionChanges`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `refusesHandoffOutsideTransaction`       | Projection handoff requires the transaction that owns the sporting mutation.        |
| `handsOffCommittedScopes`                | Projection handoff is delivered only after a successful sporting commit.            |
| `ignoresScoreOnlyProjectionChanges`      | Score-only details submit no search projection work.                                |
| `handsOffSourceRenaming`                 | Source renaming reaches dependent teams and pools after commit.                     |
| `hydratesCurrentCanonicalValues`         | Projection hydration rereads permitted city, scoped aliases and current visibility. |
| `projectsUnattachedProfessionalTeam`     | Professional projection keeps absent club context null.                             |

### SportingResourcesIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingResourcesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingResourcesIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ReadSportingResources`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `ChangeClubContacts`, `RestrictClubContacts`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `usesEffectivePermittedContacts`         | Uses effective contacts while refusing restricted source reappearance.           |
| `suppressesRestrictedLocality`           | Does not reuse a locality after its municipal context is restricted.             |
| `ordersViewableSeasons`                  | Orders future and closed club seasons from viewable teams only.                  |
| `ordersClubTeams`                        | Orders every club team by its effective name and exact UUID.                     |
| `avoidsPerTeamLookups`                   | Reading another team in the same club season adds no per-team SQL reads.         |
| `selectsSeasonsWithoutTeamHydration`     | Club season discovery does not hydrate more team search inputs as history grows. |
| `keepsClublessTeam`                      | Keeps a professional clubless team and all visible participations.               |
| `readsCompleteLargeClub`                 | Reads every club team beyond F02's batch size without publishing hidden seasons. |
| `preservesPartialMatch`                  | Preserves independent schedule result and set freshness on partial match detail. |
| `hidesWithdrawnMatch`                    | Hides retained final results after date or whole-match withdrawal.               |
| `hidesRestrictedParent`                  | Applies current parent restrictions to every affected resource.                  |
| `selectsCurrentLogos`                    | Selects effective or automatic team artwork under current visibility.            |

### SportingVisibilityIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingVisibilityIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingVisibilityIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `ReadCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptCalendar`, `AcceptMatchObservation`, `AcceptCatalog`, `ReadSportingData`, `ReadSportingAcquisition`, `AcceptStandings`, `CloseCollectionSeason`, `RecordCollectionResults`, `ChangeCollectionControls`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `readsVisibilityWithoutLoadingEntities`  | Visibility reads only authorization facts without materializing sporting content.        |
| `retainsUnclassifiedMatchReasons`        | An unclassified retained match keeps every independent hiding reason.                    |
| `withdrawsEmptyCalendar`                 | One qualified empty current calendar withdraws retained participations.                  |
| `withdrawsMissingParticipation`          | A complete nonempty calendar withdraws only its missing participants.                    |
| `keepsIndependentReasons`                | Catalog rediscovery clears only catalog absence after an empty calendar.                 |
| `restoresOnlyCalendarReason`             | Attributable calendar return reuses identities while inactive division still hides them. |
| `preservesOtherParticipation`            | A second visible participation keeps the retained team usable.                           |
| `preservesClubBetweenSeasons`            | A club remains publicly consultable with no visible seasonal team.                       |
| `retainsWithdrawnResult`                 | A successful nonempty calendar hides an absent scored match without deleting its result. |
| `preservesPartialPresence`               | Partial and failed processing cannot withdraw previously accepted identities.            |
| `preservesOtherSeasonCatalog`            | Wrong-season source discovery cannot withdraw another season's pool.                     |
| `preservesOtherAuthority`                | FFVB absence does not withdraw a professional LNV phase.                                 |
| `preservesPartialCatalog`                | Partial catalog discovery cannot withdraw accepted pools.                                |
| `enrichmentDoesNotRestore`               | Detail and standings enrichment never restore calendar presence.                         |
| `removesStaleStandingLink`               | A retained official row loses only its team link when calendar participation disappears. |
| `finishesRunningCycleAfterClosure`       | The cycle running at real F01 closure finishes once and cannot recollect afterward.      |
| `preservesHistoricalEmptyInput`          | Initial empty reconstruction retains accepted history and all visibility reasons.        |
| `restoresRetainedIdentity`               | A known match returns immediately under the same identities after calendar withdrawal.   |
| `ignoresCompletedOrOlderCalendar`        | A completed empty calendar cannot apply absence twice or be undone by older work.        |
| `pauseDoesNotHide`                       | A collection pause keeps accepted public history visible.                                |
| `keepsDatelessMatchPrivate`              | Dateless matches remain retained while public hydration requires a known date.           |

### TransitionLogoIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/TransitionLogoIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/TransitionLogoIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `com.blockout.backend.access.application.CurrentPermissions`, `SportingStore`, `ChangeSportingPresentation`, `ReadSportingConfiguration`, `ReadSportingData`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AccountStore`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `reassociatesExactClub`                  | Reassociates original file bytes only to the exact FFVB string.                        |
| `leavesUnmatchedReferenceUnresolved`     | Leaves an unmatched exact FFVB reference unresolved without creating a club.           |
| `rejectsCreationOutsideTransaction`      | Refuses club creation without an application transaction before writing.               |
| `refusesDuplicateClubIdentity`           | Refuses a duplicate FFVB club reference through native database uniqueness.            |
| `refusesMissingFile`                     | Stops a missing-file attempt before any presentation mutation.                         |
| `refusesCorruptBytes`                    | Stops empty or corrupt preserved content before replacing a protected logo.            |
| `refusesRevokedGrant`                    | Refuses reassociation after the current operator grant is withdrawn.                   |
| `refusesStaleReplacement`                | Preserves a newer manual logo when an earlier revision is resubmitted.                 |
| `inheritsOnlyEstablishedClub`            | Inherits the preserved club image across seasons without guessing a professional link. |

### CalendarAcceptanceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/CalendarAcceptanceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/CalendarAcceptanceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptCalendar`, `ValidateSportingImage`, `AcceptMatchObservation`, `AcceptCatalog`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `refusesImageDecodingInTransaction`      | Refuses image decoding while a database transaction is active.                                        |
| `refusesAmbientTransaction`              | Refuses an ambient transaction before admitting any calendar work.                                    |
| `commitsUsefulSubset`                    | Commits 99 usable matches while the failed match keeps its accepted date.                             |
| `acceptsChangedSourceLabel`              | Counts an updated source label as an accepted change.                                                 |
| `keepsOutcomeOrder`                      | Collapses identical references, refuses contradictions and appends acquisition failures.              |
| `refusesSupersededWork`                  | A superseding calendar blocks late identity creation and older missing fields.                        |
| `rejectsGlobalScope`                     | Rejects a globally unselected pool before creating sporting identities.                               |
| `classifiesFirstCalendar`                | The first calendar establishes the admitted classification of a discovered pool.                      |
| `respectsCurrentClassification`          | Current classification removal refuses the item without restoring collection.                         |
| `preservesAtomicCatalog`                 | An incomplete catalog preserves references and a conflicting duplicate rolls back the entire catalog. |
| `qualifiesCatalogAbsence`                | Qualified empty discovery withdraws only its source-season catalog; old discovery cannot restore it.  |
| `ignoresPublicationForOrder`             | Provider publication time never overrides logical observation order.                                  |
| `fencesReplacementThroughCommit`         | Incarnation replacement waits for the actual match transaction to commit.                             |
| `preservesNewerConcurrentDetail`         | A concurrent older detail cannot overwrite the newer committed observation.                           |
| `withdrawsDate`                          | Explicit schedule withdrawal clears the persisted date.                                               |
| `preservesIndependentAttribution`        | Omitted entry references retain their independent publication and observation times.                  |
| `distinguishesIncompleteEmpty`           | A current empty calendar completes only when the envelope is qualified complete.                      |
| `rollsBackCatalogMutation`               | A late invalid catalog entry rolls back earlier pool creation in the same request.                    |
| `refusesNewIdentityFromCompletedRead`    | A completed calendar token cannot create another late encounter when replayed.                        |
| `preservesInitialHistory`                | Wholly empty initial reconstruction cannot finalize retained calendar absence.                        |

### ClassificationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ClassificationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ClassificationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeSportingClassification`, `ReadSportingConfiguration`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AccountStore`, `SportingStore`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `preservesPublishedClassification`       | Removes acquisition settings without erasing published identities or classification.           |
| `refusesSharedParticipation`             | Refuses the entire pack correction when one team has an incompatible outside participation.    |
| `refusesTargetCollision`                 | Rejects a target identity collision without merging teams or restoring acquisition.            |
| `refusesAliasCollision`                  | Refuses a correction that collides through a qualified alias.                                  |
| `refusesAliasesWithinCorrectedPack`      | Refuses the whole pack when two corrected teams would share a qualified alias.                 |
| `preservesIndependentAliasContexts`      | Preserves aliases in distinct qualified contexts during correction.                            |
| `preservesIndependentAliasOwners`        | Keeps identical aliases independent across clubs or seasons after correction.                  |
| `rejectsStaleNoOp`                       | Preserves a matching revision and rejects a stale no-op after an inherited change.             |
| `preservesOverride`                      | Corrects all inherited pools together while preserving an explicit pool override.              |
| `refusesNewInternalCollision`            | Refuses duplicate target identities formed entirely within the corrected pack.                 |
| `waitsForCollection`                     | A classification change waits for collection and validates its newly committed participation.  |
| `collectionUsesCorrectedClassification`  | A waiting collection resolves identities using the classification committed by the correction. |
| `refusesWithdrawnGrant`                  | Rechecks the current grant after a concurrent withdrawal holding the account lock.             |

### DivisionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/DivisionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/DivisionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `com.blockout.backend.access.application.CurrentPermissions`, `ChangeDivisionLifecycle`, `ReadSportingConfiguration`, `ChangeSportingClassification`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AccountStore`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values)   | Protected behavior / detectable regression                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `readsDivisionMetadataWithoutLoadingImage` | Reads division editor metadata without materializing stored image content.              |
| `refusesDuplicateName`                     | Rejects case-insensitive duplicate names through the actual unique index.               |
| `preservesPresentationAndNoOpRevision`     | Changes activity without changing presentation and rejects stale matching commands.     |
| `separatesReadAndWriteGrants`              | Allows each alternative read grant without granting division lifecycle writes.          |
| `rechecksGrantAfterUploadPreflight`        | A successful upload preflight does not authorize creation after grant withdrawal.       |
| `listsDivisionMetadata`                    | Lists ordered division metadata with image presence and optional inactive entries.      |
| `serializesDeactivationAndAssignment`      | A correction waiting on a deactivation refuses the now-inactive target without effects. |

### MatchDetailsAndStandingsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/MatchDetailsAndStandingsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/MatchDetailsAndStandingsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptCalendar`, `AcceptMatchObservation`, `AcceptStandings`, `SportingStore`, `SportingObservationMapper`. Controlled/absent boundaries: none.

| Scenario (all declared parameter values)      | Protected behavior / detectable regression                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `reportsActualMatchCreation`                  | Calendar responses distinguish newly identified matches from existing updates.           |
| `preservesSourceFinality`                     | Keeps source finality without a universal winning-score threshold.                       |
| `preservesCompatibleSets`                     | Retains compatible sets and their original provenance when a later result omits detail.  |
| `isolatesInconsistentSets`                    | An inconsistent new set list cannot discard a usable overall result or venue.            |
| `withdrawsWithoutStaleRestoration`            | Qualified result withdrawal removes sets and old observations cannot restore either.     |
| `retainsUninterpretedNotation`                | Unknown notation remains diagnostic and never becomes a zero result.                     |
| `retainsDocumentThroughRescheduling`          | Rescheduling preserves the qualified document code and independent document freshness.   |
| `preservesEstablishedProfessionalCode`        | A new date match cannot replace an established professional document association.        |
| `neverRestoresPresence`                       | Details cannot create an unknown match or restore withdrawn participation.               |
| `keepsOfficialRows`                           | Preserves official order, nonnumeric statistics and unknown rows without creating teams. |
| `boundsStandingsReads`                        | Reading a larger official table does not query statistics once per row.                  |
| `refreshesIdenticalTableWithoutReplacingRows` | Refreshing an identical published table preserves its rows while advancing attribution.  |
| `preservesTableOnNonPublication`              | Qualified non-publication preserves a retained usable table and its own freshness.       |
| `distinguishesEmptyAndAbsent`                 | Published empty and qualified absence without a retained table remain distinct.          |
| `rollsBackWholeTable`                         | A failed whole-table transaction preserves the prior table and logical order.            |
| `persistsSpecialResult`                       | Persists recognized special results without inventing numeric scores.                    |
| `withdrawsReferees`                           | Explicit referee withdrawal removes retained names from both state and storage.          |
| `replacesPublishedTable`                      | A later published table replaces all earlier rows and accepts an empty table.            |
| `keepsWithdrawnRowUnlinked`                   | Standings do not link or restore a withdrawn participant.                                |
| `enforcesProfessionalAuthority`               | An LNV encounter accepts only its admitted authority, without FFVB sporting fallback.    |
| `refusesStaleAbsence`                         | An older qualified absence cannot replace a newer published table.                       |

### SportingIdentityIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/infrastructure/SportingIdentityIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/infrastructure/SportingIdentityIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `EstablishMatchIdentity`, `ReadSportingData`, `ReadSportingAcquisition`. Controlled/absent boundaries: none; real-delegating instrumentation: `JpaSportingStore`.

| Scenario (all declared parameter values) | Protected behavior / detectable regression                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `refusesIdentityOutsideAcceptance`       | Refuses identity writes without an accepting caller transaction.                             |
| `locksCurrentSeasonAfterIdentityLookup`  | Season identity resolution cannot retain lifecycle from before its write lock.               |
| `selectsLatestStartWithinWindow`         | Uses the latest reliable match start inside the pool's current fast window.                  |
| `separatesSeasons`                       | Reuses canonical years and cross-season clubs while keeping seasonal teams separate.         |
| `sharesCompatibleTeams`                  | Shares one contextual team across compatible pools and retains distinct named teams.         |
| `scopesMatchReferences`                  | Keeps match references scoped to pools independently from dates and participant pairs.       |
| `resolvesOptionalPoolContext`            | Resolves the native pool identity with present or absent tour and group.                     |
| `refusesUnrecognizedReplacement`         | Preserves known matches when an FFVB participant cannot be associated.                       |
| `resolvesVerifiedAlias`                  | Uses scoped verified aliases without merging a similarly named club.                         |
| `preservesProfessionalIdentity`          | Keeps qualified LNV teams through labels and optional club association.                      |
| `rollsBackUnidentifiedClub`              | Rolls back a complete encounter when the other FFVB club cannot be identified.               |
| `confinesAliasContext`                   | Rejects a verified alias outside its qualified competition.                                  |
| `retainsOptionalProfessionalClub`        | Retains a technical professional club association without transferring it to another season. |
| `enforcesTeamUniqueness`                 | Enforces FFVB uniqueness at database commit, independently from lookup.                      |
| `enforcesProfessionalUniqueness`         | Enforces LNV uniqueness by championship and native TeamID independently from label or club.  |
| `enforcesOptionalPoolContextUniqueness`  | Treats absent tour and group as one unique native pool context.                              |
| `enforcesCanonicalSeasonUniqueness`      | Keeps one canonical row per qualified sporting start year.                                   |
| `protectsDivisionName`                   | Rejects a division name differing only by case.                                              |
| `protectsDivisionTerms`                  | Keeps controlled search terms unique on their real division owner.                           |
| `enforcesOwnerForeignKeys`               | Rejects a participation whose team owner does not exist.                                     |
| `isolatesConcurrentClubCreation`         | Rolls back the losing cross-season club creation without replay or partial identities.       |
| `readsClassificationAfterLock`           | Reads the committed classification only after acquiring the season lock.                     |

Inventory total: **47 suites, 484 test methods**; parameterized invocations are retained in source and counted by the runner, not expanded into duplicate rows.

## External clients and collector

### Auth0ConfigurationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0ConfigurationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0ConfigurationIntegrationTest.java). Family: **External OAuth HTTP integration**.

Real: Auth0Configuration, native OAuth manager/token client, Auth0 SDK, native HTTP. Controlled: Loopback identity/resource responses; synthetic registration. Lifecycle: Per-method pool, validator, worker and peer cleanup; latches hold timeout response.

| Scenario                             | Evidence / regression guarded                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `usesNativeClientCredentials`        | Obtains server credentials with the exact audience and reuses native token expiry |
| `boundsBothRequests` (parameterized) | Bounds token and resource waiting without retrying either request                 |
| `refusesDifferentIssuer`             | Refuses a different validated issuer before provider or token access              |
| `refusesTokenSafely`                 | Translates token refusal without leaking provider diagnostics or reading the user |

### Auth0PrincipalClientTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PrincipalClientTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PrincipalClientTest.java). Family: **Unit SDK adapter**.

Real: Auth0PrincipalClient, real SDK encoding/decoding and validator. Controlled: OkHttp native response interceptor; no sockets. Lifecycle: Per-method SDK pool/dispatcher/validator closes; exact paths/body/privacy assertions.

| Scenario                                      | Evidence / regression guarded                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `readsExactPrincipal`                         | Reads only the exact encoded principal and preserves existing linked evidence |
| `keepsMissingEvidenceUnknown` (parameterized) | Keeps missing or unusable email and missing age unknown                       |
| `refusesUnprovenPrincipal` (parameterized)    | Refuses an unproven principal or malformed provider representation            |
| `refusesProviderFailureSafely`                | Translates provider refusal without logging its private payload               |

### Auth0PropertiesIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PropertiesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Native Auth0 configuration binding and validation. Controlled: Synthetic properties. Lifecycle: ApplicationContextRunner; no provider request.

| Scenario                                   | Evidence / regression guarded                                       |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `acceptsBoundedUnconfiguredProvider`       | Binds explicit deadlines while leaving provider activation optional |
| `rejectsUnboundedDeadline` (parameterized) | Rejects unusable deadlines instead of allowing infinite waiting     |

### SearchTraversalIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/SearchTraversalIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/SearchTraversalIntegrationTest.java). Family: **HTTP/MVC + PostgreSQL + native search integration**.

Real: Generated MVC boundary, owner SQL hydration, real OpenSearch traversal. Controlled: Disposable engine credentials/CA only. Lifecycle: Context-owned engine; SQL + mapped generation reset each method; class context closes before native resources outlive it.

| Scenario                               | Evidence / regression guarded                                            |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `traversesCompleteSet` (parameterized) | Traverses every eligible identity once beyond the ordinary result window |

### OpenSearchClientIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchClientIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchClientIntegrationTest.java). Family: **Native search integration**.

Real: Pinned OpenSearch 3.9.0, official client, TLS, security, actual JSON/index/alias semantics. Controlled: Disposable credentials and certificate authority; no external engine. Lifecycle: One instance-owned container per class; isolated index names; explicit refresh; transport/container/files close.

| Scenario                        | Evidence / regression guarded                                                  |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `connectsWithTrustedTls`        | Connects through trusted TLS to the selected engine                            |
| `refusesUntrustedTls`           | Refuses an untrusted TLS certificate                                           |
| `refusesWrongCredentials`       | Refuses wrong credentials without anonymous fallback                           |
| `refusesUnrelatedIndex`         | Refuses writes outside the local search namespace                              |
| `serializesQueriesAfterRefresh` | Preserves native document serialization through a query after explicit refresh |
| `reportsIndividualBulkOutcomes` | Reports failed bulk items inside a successful HTTP response                    |
| `switchesAliasesAtomically`     | Replaces all resource aliases atomically without partial failure               |

### OpenSearchEngineTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchEngineTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchEngineTest.java). Family: **Unit SDK adapter**.

Real: OpenSearchEngine and real request/response values. Controlled: Official OpenSearch client collaborator. Lifecycle: Fresh mocks; no engine semantic evidence claimed.

| Scenario                                    | Evidence / regression guarded                                            |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `rejectsIncompleteResponse` (parameterized) | Rejects incomplete responses instead of publishing successful exhaustion |

### OpenSearchPropertiesIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchPropertiesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchPropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Shipped YAML, native OpenSearch connection/index property binding and validation. Controlled: Synthetic settings; no engine/client started. Lifecycle: ApplicationContextRunner closes each context.

| Scenario                                  | Evidence / regression guarded                                   |
| ----------------------------------------- | --------------------------------------------------------------- |
| `rejectsMissingInput` (parameterized)     | Rejects missing required connection input                       |
| `rejectsInvalidEndpoint` (parameterized)  | Rejects plaintext and non-origin endpoints                      |
| `bindsNativeSettings`                     | Binds safe native connection defaults                           |
| `bindsTimeoutOverride`                    | Accepts an explicit request timeout override                    |
| `rejectsZeroTimeout`                      | Rejects an unbounded zero request timeout                       |
| `bindsIndexNamespace`                     | Uses the local alias namespace from the actual application YAML |
| `bindsIndexOverride`                      | Accepts an explicit environment-owned alias namespace           |
| `rejectsInvalidNamespace` (parameterized) | Rejects blank and multi-index namespace shapes                  |

### SearchMatchingIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchMatchingIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchMatchingIntegrationTest.java). Family: **Native search integration**.

Real: Pinned OpenSearch analyzers/mappings and production OpenSearchEngine. Controlled: Disposable local credentials/CA only. Lifecycle: One class engine; fresh empty mapped index per method and deletion afterwards; explicit refresh.

| Scenario                  | Evidence / regression guarded                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `matchesWholeQuery`       | Matches complete prefix and fuzzy branches across fields while retaining whole query terms |
| `matchesExpandedPrefixes` | Retains full and intermediate 200-character prefixes after ligature folding                |
| `appliesStrictFilters`    | Keeps aliases and division terms on their own resource while enforcing every exact filter  |
| `favorsDirectMatch`       | Favors a direct name over the same small typo in comparable context                        |
| `preservesNamesakes`      | Retains distinct identities with identical names                                           |

### SearchProjectionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionIntegrationTest.java). Family: **PostgreSQL + native search integration**.

Real: Migrated PostgreSQL, real owner services/commit callbacks, scheduler and OpenSearch projection/alias writes. Controlled: Native client spies assert SQL independence or inject selected failures while other operations stay real. Lifecycle: Context-owned engine and scheduler; class context closed; SQL reset and drained scheduler before each method; explicit transactions/joins.

| Scenario                          | Evidence / regression guarded                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `distinguishesCommitFromRollback` | Publishes committed names while rollback leaves the usable document unchanged              |
| `rereadsQueuedChanges`            | Queued updates reread the latest committed state after a serialized full rebuild           |
| `updatesDependentScopes`          | Club, division and participation scopes update or delete their actual F02 dependents       |
| `catchesLostWork`                 | A full run catches up SQL changes that had no in-memory submission                         |
| `preservesAliasesOnFailedItem`    | Failed native bulk items leave every previous resource alias usable                        |
| `preservesAliasesOnFailedRefresh` | An unavailable refresh preserves the preceding complete generation                         |
| `resolvesUncertainAliasSuccess`   | A lost alias acknowledgement is resolved from native aliases before cleanup                |
| `preservesInFlightCandidates`     | Preserves candidates when a timed-out alias request applies after the state reread         |
| `preservesUncertainOldAliases`    | An interrupted alias request preserves the old usable aliases                              |
| `boundsOwnedCleanup`              | Cleanup removes at most twelve unaliased owned generations and preserves unrelated indexes |

### CollectorApplicationSmokeTest

Source: [apps/collector/src/test/java/com/blockout/collector/CollectorApplicationSmokeTest.java](../apps/collector/src/test/java/com/blockout/collector/CollectorApplicationSmokeTest.java). Family: **Startup smoke**.

Real: CollectorApplication component graph, native configuration binding. Controlled: CollectorStartup bean; all provider traffic suppressed. Lifecycle: Context shutdown owns pools; method has no mutable domain fixture.

| Scenario          | Evidence / regression guarded                        |
| ----------------- | ---------------------------------------------------- |
| `startsCollector` | Starts collector wiring without running registration |

### AcquisitionSchedulerIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerIntegrationTest.java). Family: **Executor integration**.

Real: AcquisitionScheduler, CollectorLifecycle, bounded ThreadPoolTaskExecutor. Controlled: TaskScheduler timer and application/backend ports. Lifecycle: Latch proves worker occupied before submission; release/shutdown in finally.

| Scenario                 | Evidence / regression guarded                                           |
| ------------------------ | ----------------------------------------------------------------------- |
| `skipsSaturatedExecutor` | Native executor saturation skips admission and queues no missed passage |

### AcquisitionSchedulerTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerTest.java). Family: **Unit**.

Real: AcquisitionScheduler, native Trigger evaluation; selected CollectorLifecycle. Controlled: Timer and application/backend ports; fixed time; synchronous executor. Lifecycle: Fresh JUnit instance; no thread or remote proof.

| Scenario                                            | Evidence / regression guarded                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `preservesDefiniteAdmissionRefusal` (parameterized) | A definite admission refusal releases the scope even when the secondary runtime read is unavailable |
| `stopsSupersededWork`                               | A superseded work poll stops subsequent ticks without registering again                             |
| `stopsSupersededCandidateRead`                      | A candidate read refused after admission still stops a superseded process                           |
| `retainsUnconfirmedAdmission` (parameterized)       | Uncertain control and candidate admissions retain their original identity across later ticks        |
| `admitsCurrentRevisionAfterRunningWork`             | Competition ticks admit fresh configuration and skip an overrun until the next ordinary tick        |
| `admitsEachEligibleMinuteScope`                     | The minute tick admits pending, seasonless and exact candidate work, without promising a start time |
| `rejectsUnconfirmedWork`                            | Unavailable current work never starts supplier work or registers again                              |
| `retainsUnconfirmedTerminalScope`                   | A lost completion response and failed confirmation block later automatic admission of that control  |
| `isolatesUnconfirmedScope`                          | Unconfirmed control ownership leaves other controls eligible on later ticks                         |
| `holdsUntilConfirmed`                               | Local ownership covers an in-progress confirmation and releases after confirmed completion          |
| `skipsOverrunFirings`                               | Discovery is independent of seasons and lenient triggers skip overrun firings                       |

### CollectPassageTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectPassageTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectPassageTest.java). Family: **Unit**.

Real: CollectPassage, immutable observations, selected readers/mappers. Controlled: Application backend ports and provider readers. Lifecycle: Nested scenarios use fresh JUnit fixture; no SQL or provider proof.

| Scenario                                           | Evidence / regression guarded                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `reportsInvalidSecondaryClubFields`                | F02's secondary-field refusal remains partial integration without a personal diagnostic         |
| `skipsRestrictedMunicipality`                      | A null current municipality skips the provider without inventing attempt evidence               |
| `integratesMunicipalOutcome` (parameterized)       | Each qualified municipal outcome preserves the exact F02 revision and source order              |
| `preservesLocalityOnTechnicalFailure`              | A technical geocoding failure cannot submit an empty locality or replay the read                |
| `reportsUncertainClubIntegration`                  | A lost club integration acknowledgement is reported once without replay                         |
| `executesClubSheetFamily`                          | An admitted club-sheet target reaches F02 independently of competition seasons                  |
| `stopsRemovedPoolImmediately`                      | Complete accepted catalog removal prevents an old frozen pool from being read                   |
| `retainsPoolsAfterDiscoveryFailure`                | Failed catalog discovery preserves selected same-season acquisition                             |
| `enrichesNewMatchesWithinCalendar` (parameterized) | Only new resolved matches get first detail while independent team image attempts remain bounded |
| `sharesDiscoveryPage`                              | Discovery and an admitted LNV calendar consume one page with its original timestamp             |
| `preservesDocumentRefusal`                         | A refused information-sheet association remains visible after a successful detail read          |
| `continuesIndependentStage`                        | Keeps independent standings when calendar acquisition fails                                     |
| `preservesUncertainIntegration`                    | Reports an uncertain sporting write without replaying it or claiming measured counts            |
| `preservesPartialIntegration`                      | Reports one accepted and one rejected match as partial integration                              |
| `stopsAfterContextRefusal`                         | Stops a superseded incarnation before another stage or sporting write                           |
| `excludesUnsafeFailureMessage`                     | Retains only safe exception information when acquisition unexpectedly fails                     |
| `stopsBetweenSharedStages`                         | Stops before another shared-resource stage when the lifecycle becomes inactive                  |
| `leavesEmptySelectionUnobserved`                   | An empty target selection creates no observation or recovery evidence                           |

### CollectionOperationalEvidenceTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectionOperationalEvidenceTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectionOperationalEvidenceTest.java). Family: **Unit**.

Real: CollectionOperationalEvidence and selected CollectPassage. Controlled: Backend/provider ports; captured logs. Lifecycle: Fresh JUnit fixture; log capture is scoped to each method.

| Scenario                                        | Evidence / regression guarded                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `categorizesAcquisitionFailure` (parameterized) | Reports structural and technical seasonless failures with fixed categories        |
| `separatesNormalAcquisition` (parameterized)    | Valid unresolved municipality acquisition stays successful when integration fails |
| `reportsWrappedTransportFailure`                | A wrapped FFVB HTTP failure remains a transport problem                           |

### CollectorContextIdentityIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorContextIdentityIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorContextIdentityIntegrationTest.java). Family: **Executable HTTP + PostgreSQL**.

Real: Generated HTTP clients, real backend security/services/repositories, migrated PostgreSQL commits. Controlled: Synthetic provider observations, local JWT signing peer. Lifecycle: Opt-in disposable runtime/database; SQL fixture before each method; transport after each; process after class.

| Scenario                                   | Evidence / regression guarded                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `preservesRepeatedContexts`                | Repeated pool and match codes retain distinct calendars with shared compatible teams |
| `preservesSeasonalIdentities`              | A new season reuses the club while teams, pools and matches remain seasonal          |
| `preservesSpecialNotation` (parameterized) | Synthetic special notations preserve source meaning without numeric scores           |
| `preservesUnknownFacts`                    | Normally absent facts and recognized slots create no fictional participants          |

### CollectorLifecycleIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleIntegrationTest.java). Family: **HTTP client integration**.

Real: CollectorLifecycle, CollectorStartup, generated client, native HTTP decoding. Controlled: Loopback backend responses; scheduler boundary. Lifecycle: Per-method listener/transport closes; no actual backend commit evidence.

| Scenario                                      | Evidence / regression guarded                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `readsGeneratedWork`                          | Current-work polling maps generated conditional intent without admitting or reading providers |
| `registersOneStartup`                         | Reads then registers the startup UUID once before accepting work                              |
| `confirmsUncertainAdmission`                  | Reads the same cycle after a lost admission response before exposing provider context         |
| `refusesUnconfirmedAdmission` (parameterized) | An unresolved original admission remains uncertain and logs its original UUID for inspection  |
| `confirmsLostRegistration`                    | Confirms a lost startup acknowledgement without another registration                          |
| `stopsSupersededProcess`                      | Supersession stops new reads and never automatically registers again                          |
| `refusesContradictoryContext`                 | A contradictory generated cycle never becomes provider authorization                          |

### CollectorLifecycleTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleTest.java). Family: **Unit**.

Real: CollectorLifecycle. Controlled: CollectionBackend port. Lifecycle: Fresh JUnit instance; microsecond precision checks do not substitute for SQL timestamp evidence.

| Scenario                             | Evidence / regression guarded                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `confirmsCompletionOnce`             | Confirms an uncertain completion by one read of the original cycle             |
| `confirmsPersistedPrecision`         | Confirms nanosecond clock completion at the persisted microsecond precision    |
| `leavesUnconfirmedCompletionBlocked` | Leaves an unconfirmed completion blocked after a single confirmation read      |
| `confirmsCandidateResultOnce`        | Confirms atomic candidate completion without substituting a control completion |

### CollectorPartialSuccessIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPartialSuccessIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPartialSuccessIntegrationTest.java). Family: **Executable HTTP + PostgreSQL**.

Real: CollectPassage, generated HTTP, backend transactions, migrated PostgreSQL constraints. Controlled: Provider resource readers/discovery; synthetic parsed facts. Lifecycle: Opt-in disposable runtime and reset SQL; committed SQL queried independently; no test transaction.

| Scenario                                                   | Evidence / regression guarded                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `retainsNinetyNineCommits` (parameterized)                 | A failed acquired or integrated item retains 99 commits without withdrawing absences   |
| `isolatesContradictoryRows`                                | Identical rows collapse while contradictory references isolate only that match         |
| `preservesIndependentStages`                               | Pool calendar and standings failures preserve independent successful stages            |
| `rollsBackStandingsReplacement`                            | A real row-constraint failure rolls back the entire official table replacement         |
| `preservesOfficialStandings`                               | Official order, unknown statistics and unlinked labels survive atomic replacement      |
| `preservesDataAfterUnqualifiedAcquisition` (parameterized) | Unusable or incomplete supplier evidence never withdraws retained matches              |
| `recordsQualifiedEmptySuccess`                             | A qualified current empty observation is successful evidence rather than a failure     |
| `rejectsWrongBackendContext`                               | The real backend rejects a pool outside the admitted snapshot before writing           |
| `reconcilesEmptyCurrentCalendar`                           | Only a complete empty current calendar withdraws data and return reuses identities     |
| `reconcilesSuccessfulCalendar`                             | A fully successful nonempty calendar withdraws only omitted retained matches           |
| `preservesHistoricalEmptiness`                             | A backend-admitted wholly empty initial reconstruction preserves retained history      |
| `preservesClosedHistory`                                   | A closed-season fixture retains history and rejects new admission and completed writes |

### CollectorPresentationBoundaryIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPresentationBoundaryIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPresentationBoundaryIntegrationTest.java). Family: **Executable HTTP + PostgreSQL**.

Real: CollectPassage, generated clients, backend presentation transactions and multipart transport. Controlled: Provider readers, geocoder/club sheets, loopback image/JWT peers. Lifecycle: Opt-in runtime, reset SQL and scenario images; actual commit visibility checked via JDBC.

| Scenario                                 | Evidence / regression guarded                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `acquiresEachDistinctTeamOnce`           | Acquires each distinct team once across repeated matches and pools in one passage                |
| `preservesLastValidLogo` (parameterized) | A failed image attempt retains accepted bytes without blocking matches or retrying the team      |
| `acceptsCurrentLocality`                 | Serves the current correction after admission and commits only that locality revision            |
| `rejectsLateLocality`                    | Rejects an in-flight old point after a real administrative locality correction                   |
| `preservesPointOnTechnicalFailure`       | A technical acquisition failure preserves an already committed current point                     |
| `respectsCurrentRestriction`             | A restriction applied after admission prevents municipal acquisition and publication             |
| `preservesContactChoices`                | Club collection preserves a correction, deliberate absence and current restriction independently |
| `bindsAtomicMultipartPresentation`       | Real multipart PATCH refuses an invalid image without changing the name or prior bytes           |
| `restoresAcceptedSourceLogo`             | Automatic multipart restoration resolves the accepted source bytes                               |
| `rejectsOldPointAfterReturnToSource`     | Returning to the current source locality rejects an earlier manual-context point                 |

### CollectorSportingBoundaryIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorSportingBoundaryIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorSportingBoundaryIntegrationTest.java). Family: **Executable HTTP + PostgreSQL concurrency**.

Real: CollectorLifecycle/CollectPassage, generated HTTP, backend security, row locks and transactions. Controlled: Provider reader and local JWT signing; response-loss interceptor invokes real request. Lifecycle: Opt-in runtime; PostgreSQL blocking edges observed with bounded Awaitility, manual blocker commits/rollbacks and bounded Future joins.

| Scenario                                   | Evidence / regression guarded                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `confirmsAdmissionBeforeReading`           | Confirms lost admission before reading, allocating the sporting order before the provider |
| `trustsBackendImportMode` (parameterized)  | Only backend-admitted initial imports suppress the real result announcement allowance     |
| `keepsUnconfirmedAdmissionUnusable`        | Unconfirmed admission authorizes no provider work or second admission                     |
| `confirmsLostCompletion` (parameterized)   | Lost completion remains uncertain unless the original cycle read confirms it              |
| `refusesCollectedResponseAfterReplacement` | A collected response cannot create sporting data after its incarnation is replaced        |
| `ordersReadsWithoutRekeyingIdentity`       | Later pre-read order preserves identities through postponement                            |
| `preservesUncertainSportingCommit`         | Lost sporting acknowledgement retains commits and records uncertainty without replay      |
| `fencesThroughSportingCommit`              | Incarnation replacement waits for the sporting commit and rejects subsequent old work     |
| `fencesEachCalendarCommit` (parameterized) | Every calendar item retains its runtime fence through its independent commit              |
| `fencesFinalAbsenceCommit`                 | Final empty-calendar reconciliation retains the runtime fence through commit              |
| `supersedesCalendarBeforeFinalization`     | A newer calendar admitted between item commits prevents old absence finalization          |

### CurrentEntryOperationalEvidenceIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CurrentEntryOperationalEvidenceIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CurrentEntryOperationalEvidenceIntegrationTest.java). Family: **Logging integration**.

Real: Native discovery parsers/orchestration and Boot ECS console encoder. Controlled: ProviderHttpClient and CollectionBackend ports; fixed Clock. Lifecycle: Minimal configuration-only Boot context; per-method objects/captured logs, no provider evidence.

| Scenario                                     | Evidence / regression guarded                                     |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `recoversSameEntry`                          | A usable reread recovers only the same official entry             |
| `refusesUnrecognizedEntry`                   | An unrecognized entry cannot manufacture recovery                 |
| `retainsPartialEntryFailure` (parameterized) | An accepted FFVB neighbor does not cover an unreadable branch     |
| `preservesUnknownSeason`                     | Missing seasonal attribution is not an unusable recognized source |

### DiscoverSeasonSourcesTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/DiscoverSeasonSourcesTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/DiscoverSeasonSourcesTest.java). Family: **Unit**.

Real: DiscoverSeasonSources with native FFVB/LNV parsers. Controlled: ProviderHttpClient and backend/lifecycle ports. Lifecycle: Fresh data and completed/failed futures; no HTTP proof.

| Scenario                        | Evidence / regression guarded                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `retainsPartialFrameCatalog`    | An unavailable frame preserves discovered siblings as a partial catalog            |
| `refusesRoundAsSeasonRoot`      | An isolated round cannot establish the whole seasonal catalog                      |
| `validatesBeforeConsumption`    | A contradictory LNV season never reaches a shared-page consumer                    |
| `retainsChampionshipStandings`  | A championship standings link without PID remains exactly as published             |
| `continuesNeighborAfterFailure` | An unavailable current FFVB menu does not prevent an independent neighbor proposal |

### QualifySourceTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/QualifySourceTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/QualifySourceTest.java). Family: **Unit**.

Real: QualifySource and native context qualification. Controlled: ProviderHttpClient and backend/lifecycle ports. Lifecycle: Fresh completed futures; no provider proof.

| Scenario                   | Evidence / regression guarded                                                       |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `requiresSeasonEvidence`   | A supported LNV championship without season evidence requires explicit confirmation |
| `refusesWrongChampionship` | A supported-origin redirect into another championship cannot be confirmed away      |

### SportingObservationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/SportingObservationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/SportingObservationTest.java). Family: **Unit**.

Real: Immutable SportingObservation invariants. Controlled: None. Lifecycle: Local values only.

| Scenario                        | Evidence / regression guarded                                 |
| ------------------------------- | ------------------------------------------------------------- |
| `rejectsContradictoryStandings` | Rejects an unpublished standings table with published columns |

### FfvbClubSheetTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbClubSheetTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbClubSheetTest.java). Family: **Unit**.

Real: Native FFVB club-sheet interpreter and request decision. Controlled: ProviderHttpClient port. Lifecycle: Synthetic HTML; no live lookup.

| Scenario                                  | Evidence / regression guarded                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `rejectsUnusableLookup` (parameterized)   | An unusable identity control cannot turn a covered lookup into a directory search |
| `recognizesTrailingColonLabels`           | Recognizes published field labels with a trailing colon                           |
| `followsPublishedForm`                    | Uses the published POST action with the exact encountered reference               |
| `preservesFieldPresence`                  | Preserves absent fields, explicit emptiness and malformed proposals independently |
| `rejectsUnqualifiedSheet` (parameterized) | Rejects unqualified or foreign sheets without producing a withdrawal              |

### FfvbDiscoveryTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbDiscoveryTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbDiscoveryTest.java). Family: **Unit**.

Real: Native FFVB document discovery/parser. Controlled: None. Lifecycle: Inline/classpath synthetic HTML.

| Scenario                                         | Evidence / regression guarded                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `discoversNativeRoundGroups`                     | A shared youth round discovers actual form-backed groups rather than one aggregate pool    |
| `resolvesCatalogDocumentBase`                    | Published catalog links use the HTML document base                                         |
| `resolvesNavigationDocumentBase` (parameterized) | Native navigation attributes use the HTML document base                                    |
| `rejectsForeignDocumentBase`                     | A foreign document base cannot add an allowed navigation target                            |
| `readsSubmittedRoundContext`                     | Shared-round context uses submitted controls instead of disabled input values              |
| `discoversNationalSelectors`                     | National selectors use published headings and exclude CDF options                          |
| `requiresPublishedSeasonForEmpty`                | A query season alone cannot turn an unsupported empty response into absence                |
| `refusesSeasonHeaderAlone`                       | A retained season header without a competition catalog cannot prove absence                |
| `excludesCupRoundNavigation`                     | A neutral round label remains excluded under a French Cup heading                          |
| `acceptsQualifiedEmptyCatalog`                   | A qualified native empty menu is distinct from a failed page                               |
| `retainsPublishedRoundContext`                   | Published youth rounds distinguish a reused group code without treating matchdays as pools |
| `discoversContextualPools`                       | Native pack headings and pool URLs survive without code-prefix or matchday grouping        |
| `refusesFalseEmpty` (parameterized)              | Refuses a page without positive catalog evidence                                           |
| `excludesOrganizer` (parameterized)              | Excluded organizers never produce FFVB sporting acquisition references                     |
| `keepsPartialCatalog`                            | A malformed covered link makes discovery partial while preserving usable pools             |

### FfvbObservationReaderIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationReaderIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationReaderIntegrationTest.java). Family: **HTTP reader integration**.

Real: FfvbObservationReader, actual bounded HTTP transport and parser. Controlled: Loopback provider responses; controlled Clock. Lifecycle: Per-method listener/client closes; real network serialization and reread count.

| Scenario                               | Evidence / regression guarded                                               |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `rejectsRedirectedRecentCalendar`      | Rejects a redirect that removes the full-calendar context                   |
| `resolvesRedirectedExport`             | Resolves a relocated page's relative export against the actual response URL |
| `sharesGroupedResource`                | Reuses one HTML and export for different groups with original read times    |
| `preservesStandingsAfterExportFailure` | Keeps standings usable after one refused export without disclosing its body |
| `refreshesNextPassage`                 | A later passage reads fresh provider bodies instead of retaining a cache    |

### FfvbObservationsTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationsTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationsTest.java). Family: **Unit**.

Real: FFVB HTML/CSV parsing and observation values. Controlled: None. Lifecycle: Synthetic resources with exact presence/identity cases.

| Scenario                                   | Evidence / regression guarded                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `followsPublishedGroups` (parameterized)   | Keeps published round groups independent even when another group's row is malformed     |
| `qualifiesEmptyPool`                       | Accepts a header-only export when the full page explicitly publishes an empty pool      |
| `preservesUnpublishedEmptyStandings`       | Leaves standings unpublished when the qualified empty pool has no table                 |
| `rejectsMatchesForEmptyPool`               | Rejects export matches contradicting an explicitly empty pool                           |
| `rejectsUnavailablePage`                   | Rejects an unavailable page before interpreting a calendar                              |
| `refusesHeaderOnlyCalendar`                | Refuses a header-only calendar without positive empty-pool evidence                     |
| `isolatesMalformedRow`                     | Isolates a locally malformed row without discarding an unrelated context slot           |
| `preservesFutureQualifier`                 | Keeps recognized future qualifiers as context instead of inventing a team               |
| `preservesNativeCalendarValues`            | Preserves Windows-1252 labels, quoted semicolons and leading-zero identifiers           |
| `preservesSpecialNotation` (parameterized) | Preserves synthetic exceptional results without inventing scores or winners             |
| `collapsesDuplicateMatch`                  | Collapses identical repeated match rows                                                 |
| `isolatesContradictoryMatch`               | Isolates conflicting versions of the same match                                         |
| `keepsUsablePartialCalendar`               | Keeps the valid match when another participant is invalid                               |
| `isolatesInvalidSecondaryValue`            | Distinguishes unknown time from an invalid date without dropping the match              |
| `rejectsWrongSeason`                       | Rejects a published season contradicting the admitted context                           |
| `rejectsRecentOnlyCalendar`                | Rejects a recent-only calendar URL before producing observations                        |
| `refusesFalseEmpty`                        | A header-only export cannot erase matches still published in the full calendar          |
| `preservesOfficialStandings`               | Keeps official order, positions and special statistics without filling blanks with zero |

### IgnMunicipalityTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ign/IgnMunicipalityTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ign/IgnMunicipalityTest.java). Family: **Unit**.

Real: IGN request/filter and response interpretation. Controlled: ProviderHttpClient port. Lifecycle: Synthetic JSON; no IGN network request.

| Scenario                                   | Evidence / regression guarded                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `sendsMunicipalFilters`                    | Uses native municipality/postal filters with the original textual context         |
| `refusesMissingMunicipality`               | A missing permitted municipality cannot contact the provider                      |
| `acceptsUniqueMunicipality`                | Accepts a unique municipality despite its representative postcode and low score   |
| `preservesAmbiguity`                       | Keeps distinct municipal candidates ambiguous without score selection             |
| `preservesEmptyResult`                     | An empty municipal response leaves Monaco or an unmatched context without a point |
| `qualifiesCityFilterError`                 | Only the qualified city-filter error is an ordinary no candidate                  |
| `rejectsMalformedResponse` (parameterized) | An unqualified successful body remains a technical failure                        |
| `rejectsOtherErrors` (parameterized)       | Unqualified HTTP errors cannot suppress an unresolved locality                    |

### CollectionBackendMapperTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/CollectionBackendMapperTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/CollectionBackendMapperTest.java). Family: **Unit mapping**.

Real: Generated MapStruct implementation and real generated DTOs. Controlled: None. Lifecycle: Exact explicit timestamp/null values.

| Scenario                     | Evidence / regression guarded                                   |
| ---------------------------- | --------------------------------------------------------------- |
| `preservesOffsetInstant`     | Reads the absolute completion instant with nanosecond precision |
| `writesUtcCompletion`        | Writes a completion instant as a UTC transport timestamp        |
| `preservesMissingCompletion` | Does not invent a completion instant for running work           |

### SportingObservationClientIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationClientIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationClientIntegrationTest.java). Family: **Generated HTTP adapter integration**.

Real: SportingObservationClient, MapStruct mapper, generated API, native HTTP/JSON transport. Controlled: Loopback backend responses; controlled authentication. Lifecycle: Per-method listener/transport; request bytes, statuses and call counts.

| Scenario                                        | Evidence / regression guarded                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `sendsCatalogContext`                           | Carries catalog compound context and published URL provenance unchanged            |
| `preservesPartialCalendarOutcome`               | Preserves partial calendar acceptance instead of treating HTTP 200 as full success |
| `sendsQualifiedEmptyCalendar`                   | Keeps empty current calendars explicit                                             |
| `preservesStaleOutcome`                         | Preserves a stale outcome instead of converting it into sporting success           |
| `preservesNullableDetailProposals`              | Maps omitted and explicit-null detail values without flattening presence           |
| `preservesNestedPresence` (parameterized)       | Preserves presence while mapping nested result, sets and document proposals        |
| `preservesStandingsPublication` (parameterized) | Distinguishes positively unpublished standings from a published empty table        |
| `sendsClubProposals`                            | Retains club omission and explicit withdrawal independently                        |
| `sendsLocalityEvidence`                         | Preserves empty locality evidence without inventing coordinates                    |
| `sendsImageEvidence`                            | Sends original image bytes with separate publication and observation timestamps    |
| `neverReplaysSportingWrite` (parameterized)     | Preserves refusal or uncertainty after exactly one sporting write                  |

### SportingObservationMapperTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationMapperTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationMapperTest.java). Family: **Unit mapping**.

Real: Generated mapper and real DTO presence types. Controlled: None. Lifecycle: Explicit absent/null/empty/supplied values.

| Scenario                 | Evidence / regression guarded                                               |
| ------------------------ | --------------------------------------------------------------------------- |
| `preservesMixedPresence` | Maps absent, withdrawn, empty and supplied proposals to the transport model |

### ProviderHttpClientIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderHttpClientIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderHttpClientIntegrationTest.java). Family: **External HTTP transport integration**.

Real: Production ProviderHttpClient, Apache HTTP, bounded executor/rate limiter. Controlled: Loopback provider peers only. Lifecycle: Per-method listener and workers; client try-with-resources; held responses coordinated by latches, production retry policy explicitly asserted.

| Scenario                                       | Evidence / regression guarded                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `discardsIntermediateBodies` (parameterized)   | Discards intermediate bodies without waiting for their end before following native policy |
| `readsCompleteDecodedBody`                     | Returns complete decoded bytes at the configured boundary                                 |
| `refusesDecodedOverflow`                       | Rejects decompressed overflow instead of returning truncated content                      |
| `refusesUnknownOrigin`                         | Refuses an origin outside this provider before any request                                |
| `refusesForeignRedirect`                       | Refuses a redirect to an origin outside the provider                                      |
| `boundsActiveAndPendingWork`                   | Rejects pending work after the shared provider queue fills                                |
| `boundsPermitWait`                             | Rejects a read when its provider permit cannot be obtained within the bound               |
| `boundsStatusRetries` (parameterized)          | Uses at most two additional native status attempts for a repeatable form POST             |
| `preservesNativeMethodRetries` (parameterized) | Retains native GET I/O retries without replaying a read-only POST                         |
| `boundsReadTimeout`                            | Does not retry a native socket timeout                                                    |
| `boundsRedirectCount`                          | Stops following allowed redirects at the configured native limit                          |
| `abortsOverflowImmediately`                    | Aborts overflow without draining an unbounded response to reuse its connection            |
| `returnsBoundedBadRequestBody`                 | Returns a complete HTTP 400 body at the configured byte boundary                          |
| `rejectsOversizedBadRequestBody`               | Rejects an HTTP 400 body exceeding the configured byte boundary                           |

### ProviderOriginTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderOriginTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderOriginTest.java). Family: **Unit**.

Real: ProviderOrigin authority equivalence/allowlist. Controlled: None. Lifecycle: URI values only.

| Scenario                                  | Evidence / regression guarded                                       |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `acceptsEquivalentOrigin` (parameterized) | Accepts the same origin with an omitted or explicit default port    |
| `refusesDifferentOrigin` (parameterized)  | Keeps different ports, schemes and hosts outside the allowed origin |

### LnvDiscoveryTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDiscoveryTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDiscoveryTest.java). Family: **Unit**.

Real: Native LNV published-link discovery. Controlled: None. Lifecycle: Synthetic document values.

| Scenario                                      | Evidence / regression guarded                       |
| --------------------------------------------- | --------------------------------------------------- |
| `resolvesPublishedPhaseLinks` (parameterized) | Phase links resolve against their HTML context      |
| `rejectsForeignDocumentBase`                  | A foreign document base cannot qualify a phase link |

### LnvDocumentReferencesTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDocumentReferencesTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDocumentReferencesTest.java). Family: **Unit**.

Real: LNV form/document reference parsing and scoped associations. Controlled: None. Lifecycle: Synthetic HTML and explicit associations.

| Scenario                                        | Evidence / regression guarded                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `rejectsNonObjectClientState` (parameterized)   | Rejects non-object client state as an acquisition refusal                   |
| `preservesSubmittedFormControls`                | Document postbacks retain native submitted controls without disabled fields |
| `resolvesPublishedDocumentForm` (parameterized) | The actual tab order and hidden state determine the document form request   |
| `readsPublishedPdf`                             | Reads the exact published PDF link                                          |
| `qualifiesDocumentCode`                         | Reads a document code from exact verified season and team associations      |
| `rejectsForeignAssociationSeason`               | Refuses document associations belonging to another season                   |
| `rejectsDuplicateDocumentMatch`                 | Refuses an ambiguous repeated document match                                |

### LnvHttpCachingIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvHttpCachingIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvHttpCachingIntegrationTest.java). Family: **External HTTP cache integration**.

Real: Production LNV HTTP client and Apache cache. Controlled: Loopback origin with Cache-Control/ETag/status. Lifecycle: Per-method listener and closeable client; freshness asserted through exact native requests without sleeps.

| Scenario                                    | Evidence / regression guarded                                               |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `distinguishesRevalidation` (parameterized) | Revalidation distinguishes a changed image body from cached 304 reuse       |
| `reusesImageWithoutFreshness`               | Origin-authorized cached image reuse is not a new supplier observation      |
| `readsPagesWithoutCache`                    | Ordinary pages are never cached and pin the explicit offset-zero convention |

### LnvObservationReaderTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationReaderTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationReaderTest.java). Family: **Unit**.

Real: LnvObservationReader and document/native parser. Controlled: ProviderHttpClient and Clock where applicable. Lifecycle: Fresh futures and per-read context; no HTTP/SQL evidence.

| Scenario                                         | Evidence / regression guarded                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `usesQualifiedCalendarTitle`                     | Calendar document qualification uses the admitted group's published title                 |
| `rejectsForeignDocumentContext` (parameterized)  | A redirected detail context cannot submit a document form for the admitted match          |
| `rejectsContradictoryDetailSeason`               | Refuses detail interpretation when the published season contradicts the admitted season   |
| `rejectsContradictoryDocumentSeason`             | Refuses document lookup when the published detail season contradicts the admitted season  |
| `rejectsForeignDocumentResponse` (parameterized) | Document form responses preserve admitted identity and season before returning a PDF link |
| `readsChampionshipTable`                         | A published championship table without PID uses its explicit group container              |
| `reportsPartialDetail`                           | An invalid detail schedule yields partial evidence with usable result facts               |
| `sharesIndexAcrossPools`                         | Two admitted pools share one XML read and its original completion time                    |

### LnvObservationsTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationsTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationsTest.java). Family: **Unit**.

Real: Native LNV XML/HTML observation parsing. Controlled: None. Lifecycle: Synthetic document facts and explicit contextual values.

| Scenario                                   | Evidence / regression guarded                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `resolvesDetailDocumentBase`               | Calendar detail anchors retain the HTML document base                          |
| `rejectsForeignDetailAnchor`               | A foreign detail anchor is not reconstructed as a local match URL              |
| `qualifiesChampionship` (parameterized)    | Each supported championship requires actual season evidence                    |
| `isolatesUnrelatedRosterImages`            | Unrelated ambiguous or malformed roster logos do not discard usable matches    |
| `omitsUnqualifiedCalendarClock`            | A local calendar clock without the confirmed offset-zero flag is omitted       |
| `refusesFalseEmptyCalendar`                | A title alone cannot establish a usable empty calendar                         |
| `readsGroupedStandings`                    | Official grouped columns retain source order and nonnumeric values             |
| `convertsDetailClock`                      | A confirmed offset-zero detail clock crosses the Paris date boundary           |
| `readsDetailAggregate`                     | A detail page carries its independently published aggregate correction         |
| `isolatesInvalidDetailClock`               | An invalid detail clock preserves independently published aggregate facts      |
| `isolatesCalendarSchedule` (parameterized) | Missing or malformed schedule fields preserve identified calendar participants |
| `retainsForfeitNotation` (parameterized)   | A native special or uninterpreted notation reaches F02 without invented scores |
| `preservesUnknownTime`                     | A date-only detail never becomes a midnight instant                            |
| `followsPhaseLinks`                        | Changing native phase IDs is discovered from published links                   |
| `rejectsUnavailableDetail`                 | Arbitrary successful HTML is refused even with the admitted match context      |
| `rejectsForeignDetail`                     | Published detail facts cannot qualify a different native match                 |
| `parsesCalendar`                           | Reads native match identities, local time and logo references from a calendar  |
| `rejectsBrokenStandings`                   | Broken standings are refused instead of inventing an unpublished table         |

### LnvPageTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvPageTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvPageTest.java). Family: **Unit**.

Real: LNV temporal parsing/conversion. Controlled: None. Lifecycle: Explicit clock/text values including malformed long input.

| Scenario                                        | Evidence / regression guarded                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `readsWhitespaceSeparatedClock` (parameterized) | ASCII whitespace separates a qualified UTC clock before Paris conversion           |
| `preservesDateOnly` (parameterized)             | A date without a published clock stays date-only                                   |
| `rejectsMalformedClock` (parameterized)         | Malformed separators and clocks are refused without accepting wider Unicode syntax |
| `rejectsLongMalformedClock`                     | A long whitespace run without a separator is refused without repeated rescanning   |

### AcquisitionPropertiesIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/config/AcquisitionPropertiesIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/config/AcquisitionPropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Shipped YAML, native binding and validation. Controlled: Isolated synthetic environment aliases. Lifecycle: ApplicationContextRunner closes each narrow context.

| Scenario                                 | Evidence / regression guarded                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `bindsDefaults`                          | Starts with conservative shared provider limits and no document associations  |
| `bindsEnvironmentOverrides`              | Binds deployment environment overrides through native Spring configuration    |
| `rejectsInvalidSettings` (parameterized) | Rejects invalid source boundaries or unbounded acquisition settings           |
| `allowsImmediateRefusal`                 | Allows immediate refusal without queueing, redirects or permit waiting        |
| `bindsScopedDocumentAssociations`        | Keeps verified document labels scoped by season, championship and native team |
| `rejectsUnscopedDocumentAssociation`     | Rejects an unscoped document association                                      |

### LoggingIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/config/LoggingIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/config/LoggingIntegrationTest.java). Family: **Logging integration**.

Real: Boot ECS encoder with lifecycle/passage operational logging. Controlled: Backend/provider ports. Lifecycle: Minimal Boot logging configuration and per-method captured output.

| Scenario                           | Evidence / regression guarded                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `retainsUnconfirmedPassageContext` | Retains the context of a failed passage with unconfirmed evidence and completion |
| `excludesSensitiveContext`         | Preserves a failed stage without credentials, payloads or personal references    |

### GeneratedClientIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/GeneratedClientIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/GeneratedClientIntegrationTest.java). Family: **Generated HTTP client integration**.

Real: Generated DTO/API, production transport/Jackson and observation metrics. Controlled: Loopback backend; OAuth interceptor bypassed explicitly. Lifecycle: Per-method listener/factory/meter registry; stalled responses released before cleanup.

| Scenario                                    | Evidence / regression guarded                                             |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `acceptsRequiredNull`                       | Accepts a required null and additive response properties                  |
| `observesSafeHttpMetrics`                   | Records native HTTP metrics without query values or credentials as labels |
| `rejectsUndecodableRuntime` (parameterized) | Fails decoding malformed JSON or an invalid UUID                          |
| `rejectsInvalidNestedWork` (parameterized)  | Rejects unknown enums or invalid nested dates                             |
| `acceptsNestedWork`                         | Accepts valid nested fields and additive nested response data             |
| `boundsUncertainWrite`                      | Bounds a write waiting for its response without replay                    |
| `doesNotReplayUncertainWrite`               | Does not replay a write whose response was lost                           |

### IngestionAuthenticationIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionAuthenticationIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionAuthenticationIntegrationTest.java). Family: **OAuth + generated HTTP integration**.

Real: Production ingestion configurations, native registration/cache, OAuth manager, generated API, CollectionBackendClient. Controlled: Loopback OAuth/backend peers only. Lifecycle: New narrow native context, HTTP peer, executor, clock/cache per method; release then close.

| Scenario                                       | Evidence / regression guarded                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `reusesToken`                                  | Requests the selected audience and scope then reuses the provider's 24-hour token      |
| `renewsExpiredToken`                           | Renews from actual provider expiry rather than assuming 24 hours                       |
| `refusesFailedRenewal`                         | A failed renewal sends no additional business write and makes no token retry           |
| `boundsTokenFailure`                           | Bounds a token response wait without sending a business write                          |
| `classifiesUnsentBackendWrite` (parameterized) | Classifies failed credentials before a backend write without replaying either request  |
| `doesNotReplayUnauthorizedWrite`               | Does not replay an unauthorized write; a later explicit call obtains fresh credentials |
| `preservesUncertainWrite`                      | Does not replay a write whose response was lost after authentication                   |

### IngestionPropertiesIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionPropertiesIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionPropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Shipped YAML, native ingestion binding and Bean Validation. Controlled: Host environment replaced by explicit aliases. Lifecycle: ApplicationContextRunner owns and closes the narrow configuration context.

| Scenario                                 | Evidence / regression guarded                               |
| ---------------------------------------- | ----------------------------------------------------------- |
| `rejectsAbsentAudience`                  | Refuses an absent audience environment variable             |
| `rejectsInvalidSettings` (parameterized) | Refuses invalid ingestion settings during native binding    |
| `preservesLocalDefaults`                 | Preserves the local backend URL and bounded default timeout |
| `bindsExistingEnvironmentNames`          | Binds the existing environment names to ingestion settings  |

### SportingContractIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/SportingContractIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/SportingContractIntegrationTest.java). Family: **Generated HTTP serialization integration**.

Real: Generated sporting API/DTOs, production Jackson and HTTP transport. Controlled: Loopback backend responses; controlled credentials. Lifecycle: Per-method listener/transport; asserts wire body presence and decoding.

| Scenario                                       | Evidence / regression guarded                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `serializesDatePresence` (parameterized)       | Preserves omitted, withdrawn and supplied dates on the wire              |
| `serializesCollectionPresence` (parameterized) | Preserves omitted, withdrawn, empty and supplied sets on the wire        |
| `preservesPublicationTime`                     | Serializes supplied publication time independently from observation time |
| `rejectsInvalidOutcome` (parameterized)        | Fails decoding an unknown outcome or invalid resource UUID               |
| `preservesSafeRefusal`                         | Exposes the canonical refusal instead of a successful sporting outcome   |
| `retainsRequiredNull`                          | Retains required nulls under the shared model inclusion default          |

### Exact evidence limits

- Unit adapters with mocked HTTP/client ports prove mapping or orchestration only. They establish neither provider compatibility nor socket behavior.
- Loopback HTTP suites exercise production transport and serializers against synthetic peers. They establish neither a live provider agreement nor real backend persistence.
- OpenSearch suites retain the actual pinned engine. No fake replaces analyzer, alias publication, TLS or search traversal semantics.
- Collector executable qualification requires its existing explicit disposable database/JAR/port properties. Its opt-in skips must be reported separately from passing default Failsafe runs.
- Test time bounds detect a missing completion; latches and observed SQL blocking edges establish ordering. Existing provider retry-policy assertions test production behavior; they are not suite retries.

Inventory: 46 classes, 292 named scenario methods (parameterized invocations grouped by method).

## Mobile generated consumers, Query/session and SDK boundaries

The inventory covers 75 suites and 659 authored scenarios. Each parameterized row includes all values in its adjacent source table; the label is the Jest title template, not a claim that the table expands to one runtime test. Shared real components and doubles below apply only to the scenario path actually called; rows classified as direct policy or schema-only do not invoke the suite’s available transport/provider doubles.

All ordinary suites run in the existing Jest Expo process. Actual React components, application providers/stores, generated clients, validators and Query observers remain real where listed. Native controls, SDK I/O, image codecs, storage durability and device networking are not qualified. Auth0 suites that install `NativeModules.A0Auth0` keep the Auth0 JavaScript SDK real; RevenueCat/Google Ads suites replace their public SDK calls and therefore prove application consumption, not those SDKs’ native internals.

`maintenance-settings-provider.test.tsx` is the exception: it delegates to real node-fetch and writes to the backend selected by `BLOCKOUT_ACCESS_PROVIDER_URL`, using `BLOCKOUT_ACCESS_EDITOR_ONE/TWO`. It is skipped when that URL is absent. Its setup changes maintenance and version settings, so authorized execution requires an isolated disposable backend/database. The existing [AccessSettingsConsumersIntegrationTest](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumersIntegrationTest.java) owns that loopback backend, PostgreSQL container and synthetic JWT issuer when explicitly enabled by BLOCKOUT_ACCESS_CONSUMERS_TEST=true. These five cases are real process/SQL evidence under that orchestrator, and do not qualify a native network stack.

### Scope exclusions

The root-level [app-config.test.ts](../apps/mobile/__tests__/app-config.test.ts) also remains a direct configuration/unit suite: its eight authored scenarios inspect Expo configuration with isolated environment values. It starts no native build or provider client.

The complete [React suite inventory](README.md#react-suite-inventory) owns the current component, form, screen and hook families. Component-only examples such as [Button](../apps/mobile/src/shared/components/__tests__/button.test.tsx), [Sheet](../apps/mobile/src/shared/components/__tests__/sheet.test.tsx) and [request feedback](../apps/mobile/src/shared/components/__tests__/request-feedback.test.tsx) are classified there; the sections below detail the documented integration scenarios. No visual or native result is inferred from a component suite.

### Mobile: access-contract.test.ts

Source: [apps/mobile/src/features/access/**tests**/access-contract.test.ts](../apps/mobile/src/features/access/__tests__/access-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)     | Actual proof family                             |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| accepts complete nullable groups and the maximum safe revisions          | Generated/handwritten transport integration     |
| rejects %s before Query admission (parameterized)                        | Generated transport + Query/session integration |
| preserves %s capabilities without inferring other rights (parameterized) | Generated/handwritten transport integration     |
| rejects %s instead of granting access (parameterized)                    | Generated/handwritten transport integration     |
| preserves %s in generated partial requests (parameterized)               | Generated/handwritten transport integration     |
| retains the canonical %s refusal (parameterized)                         | Generated/handwritten transport integration     |

### Mobile: access-gates.test.tsx

Source: [apps/mobile/src/features/access/**tests**/access-gates.test.tsx](../apps/mobile/src/features/access/__tests__/access-gates.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `access-gate-screen`, `+not-found`, `_layout`, `administration`, `_layout`, `onboarding`, `discovery-state`, `current-account`.
- **Controlled:** `expo-constants`; `expo-application`; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                          | Actual proof family                               |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| starts the public request while F14 initialization has not completed                          | React component/provider integration (JavaScript) |
| refuses the direct route %s after an unavailable public check (parameterized)                 | React component/provider integration (JavaScript) |
| does not rerun a complete check on foreground or reconnect                                    | React component/provider integration (JavaScript) |
| keeps legal/support/sign-in routes and back behind the %s gate (parameterized)                | React component/provider integration (JavaScript) |
| admits a current maintenance manager without personal bypass only into operations             | React component/provider integration (JavaScript) |
| displays maintenance first but refuses an outdated operator and every minimum bypass          | React component/provider integration (JavaScript) |
| refreshes maintenance and retries existing-account identification without interactive sign-in | React component/provider integration (JavaScript) |
| keeps ordinary public admission independent of an account 503                                 | React component/provider integration (JavaScript) |
| recovers from an unavailable cold check only through an explicit successful retry             | React component/provider integration (JavaScript) |
| a bypass-only account makes its explicit personal choice before ordinary access               | React component/provider integration (JavaScript) |
| keeps an unknown direct route behind the gate                                                 | React component/provider integration (JavaScript) |
| keeps the framework sitemap behind ordinary admission                                         | React component/provider integration (JavaScript) |
| refreshes only the existing account on authentication return                                  | React component/provider integration (JavaScript) |
| retries failed Auth0 restoration without clearing credentials or starting interactive sign-in | React component/provider integration (JavaScript) |

### Mobile: access-observations.test.ts

Source: [apps/mobile/src/features/access/**tests**/access-observations.test.ts](../apps/mobile/src/features/access/__tests__/access-observations.test.ts).

- **Real:** Owning handwritten modules: `access-observations`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history.

| Asserted behavior / regression if violated (parameter rows included)               | Actual proof family      |
| ---------------------------------------------------------------------------------- | ------------------------ |
| starts every process closed even after another process admitted access             | Direct policy/state unit |
| rejects a complete result older than observed %s (parameterized)                   | Direct policy/state unit |
| retains restrictions through failures and partial inactive maintenance             | Direct policy/state unit |
| a lowered partial minimum cannot admit until a sufficiently current complete check | Direct policy/state unit |
| ignores a late refusal older than a newer complete read                            | Direct policy/state unit |
| a failed retry closes a previously permissive complete check                       | Direct policy/state unit |

### Mobile: administration-entry.test.tsx

Source: [apps/mobile/src/features/access/**tests**/administration-entry.test.tsx](../apps/mobile/src/features/access/__tests__/administration-entry.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `use-current-account`, `profile-screen`, `administration-entry`, `administration-screen`, `administration`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                         | Actual proof family                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| does not infer technical commands from unrelated or missing capabilities: %j (parameterized) | React component/provider integration (JavaScript) |
| presents only the dedicated command granted by %s (parameterized)                            | React component/provider integration (JavaScript) |
| does not coerce malformed capabilities (%s) into grants (parameterized)                      | React component/provider integration (JavaScript) |
| removes a revoked command independently while retaining another current grant                | React component/provider integration (JavaScript) |
| hides retained capabilities after a refused account refresh behind an opaque read card       | React component/provider integration (JavaScript) |
| discards an account response completed after the F05 generation ends                         | React component/provider integration (JavaScript) |
| offers no commands to a guest and performs no current-account read                           | React component/provider integration (JavaScript) |
| does not restore an old grant after returning to the same account in a new F05 generation    | React component/provider integration (JavaScript) |
| recovers current command presentation only after an explicit successful retry                | React component/provider integration (JavaScript) |
| hands back navigation to the router without an account command                               | React component/provider integration (JavaScript) |
| keeps direct route admission closed with no F12 composition, even with a management grant    | React component/provider integration (JavaScript) |
| inserts the administration entry without replacing the current profile or its public links   | React component/provider integration (JavaScript) |
| offers only the delivered division destination for %s (parameterized)                        | React component/provider integration (JavaScript) |

### Mobile: application-versions-editor.test.ts

Source: [apps/mobile/src/features/access/**tests**/application-versions-editor.test.ts](../apps/mobile/src/features/access/__tests__/application-versions-editor.test.ts).

- **Real:** Owning handwritten modules: `session-generation`, `application-versions-editor`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** retained editor state discarded after each case.

| Asserted behavior / regression if violated (parameter rows included) | Actual proof family      |
| -------------------------------------------------------------------- | ------------------------ |
| does not restore a retained draft after %s (parameterized)           | Direct policy/state unit |

### Mobile: application-versions-route.test.tsx

Source: [apps/mobile/src/features/access/**tests**/application-versions-route.test.tsx](../apps/mobile/src/features/access/__tests__/application-versions-route.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `access-gate-screen`, `+not-found`, `_layout`, `administration`, `_layout`, `onboarding`, `discovery-state`, `application-versions`.
- **Controlled:** `expo-constants`; react-native-keyboard-controller upstream native test double; `expo-application`; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                 | Actual proof family                               |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| admits the current versions manager during maintenance without personal bypass or maintenance rights | React component/provider integration (JavaScript) |
| refuses version editing when only maintenance management and personal bypass are granted             | React component/provider integration (JavaScript) |
| refuses an outdated versions manager without a minimum-version exception                             | React component/provider integration (JavaScript) |
| preserves a dirty draft when departure is cancelled, and leaves only after explicit discard          | React component/provider integration (JavaScript) |
| retains the draft through protected-route removal and ignores an obsolete discard confirmation       | React component/provider integration (JavaScript) |
| keeps a resumed draft locked until its earlier pending save settles                                  | React component/provider integration (JavaScript) |
| invalidates a native confirmation when its protected route is removed                                | React component/provider integration (JavaScript) |
| keeps explicit reread required when route removal cancels a recovery read                            | React component/provider integration (JavaScript) |

### Mobile: application-versions-settings.test.tsx

Source: [apps/mobile/src/features/access/**tests**/application-versions-settings.test.tsx](../apps/mobile/src/features/access/__tests__/application-versions-settings.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `application-versions-settings-screen`, `application-versions`.
- **Controlled:** react-native-safe-area-context upstream native test double; react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                    | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| shows loading without publishing defaults, then retries a failed initial read                           | React component/provider integration (JavaScript) |
| saves independent iOS and Android edits atomically under one revision                                   | React component/provider integration (JavaScript) |
| removes a platform minimum and optional message with null while omitting the other platform             | React component/provider integration (JavaScript) |
| refuses inconsistent or malformed %s without losing the draft (%s) (parameterized)                      | React component/provider integration (JavaScript) |
| checks store acknowledgement for minimum %s → %s (required: %s) (parameterized)                         | React component/provider integration (JavaScript) |
| requires store acknowledgement before raising a minimum, and cancellation preserves the draft           | React component/provider integration (JavaScript) |
| preserves input after a confirmed %i refusal (parameterized)                                            | React component/provider integration (JavaScript) |
| rereads after %s and requires explicit resubmission without merging dirty fields (parameterized)        | React component/provider integration (JavaScript) |
| keeps dirty values and blocks writes after a newer refetch and a failed reread                          | React component/provider integration (JavaScript) |
| retains read-only input and rejects a held confirmation when permissions are %s (parameterized)         | React component/provider integration (JavaScript) |
| retains a read-only draft and rejects held confirmation after the settings endpoint refuses access      | React component/provider integration (JavaScript) |
| presents an initial settings refusal with an opaque retryable card and no editable defaults             | React component/provider integration (JavaScript) |
| keeps the production route closed without operational admission                                         | React component/provider integration (JavaScript) |
| advances only versions observations after a successful partial save and requires another complete check | React component/provider integration (JavaScript) |
| rejects invalid or older rereads without replacing the accepted cache or dirty input                    | React component/provider integration (JavaScript) |
| previews absent optional copy with the same fallback and preserves the draft on close                   | React component/provider integration (JavaScript) |
| hands the validated current-platform preview link to the existing native store action without saving    | React component/provider integration (JavaScript) |
| shows a store failure in the native preview and retires it when the preview closes                      | React component/provider integration (JavaScript) |
| ignores a late store failure from a previously closed native preview                                    | React component/provider integration (JavaScript) |
| keeps a delayed acknowledged write and older reread behind the latest public revision                   | React component/provider integration (JavaScript) |

### Mobile: installed-version.test.ts

Source: [apps/mobile/src/features/access/**tests**/installed-version.test.ts](../apps/mobile/src/features/access/__tests__/installed-version.test.ts).

- **Real:** Owning handwritten modules: `access-presentation`, `access-observations`, `installed-version`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** spies/property replacements restored.

| Asserted behavior / regression if violated (parameter rows included)    | Actual proof family      |
| ----------------------------------------------------------------------- | ------------------------ |
| compares native %s against %s as %s (parameterized)                     | Direct policy/state unit |
| rejects malformed or unsafe published version %s (parameterized)        | Direct policy/state unit |
| accepts three safe integer components including the maximum             | Direct policy/state unit |
| selects only the %s native platform threshold and store (parameterized) | Direct policy/state unit |

### Mobile: maintenance-bypass.test.tsx

Source: [apps/mobile/src/features/access/**tests**/maintenance-bypass.test.tsx](../apps/mobile/src/features/access/__tests__/maintenance-bypass.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `api-fetch`, `query-client`, `account-session-provider`, `use-profile-editing`, `use-application-access`, `use-access-admission`, `ordinary-request`, `discovery-context`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                            | Actual proof family                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| requires explicit choice for binary requests while independent identification remains unchanged | React component/provider integration (JavaScript) |
| never forwards captured credentials or intent to %s (parameterized)                             | React component/provider integration (JavaScript) |
| clears intent on observed grant loss even when the grant returns before React renders           | React component/provider integration (JavaScript) |
| does not reuse intent after a session boundary returning to %s (parameterized)                  | React component/provider integration (JavaScript) |
| clears personal choice only after a successful complete inactive check                          | React component/provider integration (JavaScript) |
| rejects a profile command when bypass is cleared during native credential preparation           | React component/provider integration (JavaScript) |
| observes an ordinary %s refusal through the caller's options (parameterized)                    | React component/provider integration (JavaScript) |
| never downgrades a captured public discovery bypass after its intent is cleared                 | React component/provider integration (JavaScript) |
| rechecks the minimum version after native credential preparation                                | React component/provider integration (JavaScript) |
| discards an old session's refusal before publishing access observations                         | React component/provider integration (JavaScript) |
| clears current personal intent after its HTTP %i refusal (parameterized)                        | React component/provider integration (JavaScript) |
| aborts the captured bypass intent when its provider is removed                                  | React component/provider integration (JavaScript) |
| cancels a profile photo conversion when its captured bypass intent ends                         | React component/provider integration (JavaScript) |

### Mobile: maintenance-problem.test.ts

Source: [apps/mobile/src/features/access/**tests**/maintenance-problem.test.ts](../apps/mobile/src/features/access/__tests__/maintenance-problem.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Owning handwritten modules: `api-fetch`, `maintenance-problem`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)              | Actual proof family                         |
| --------------------------------------------------------------------------------- | ------------------------------------------- |
| returns only the current maintenance restriction from a validated HTTP refusal    | Generated/handwritten transport integration |
| keeps %s unavailable without inventing maintenance or admission (parameterized)   | Generated/handwritten transport integration |
| does not interpret an ordinary object or non-HTTP failure as a server restriction | Direct error-policy unit                    |

### Mobile: maintenance-settings-provider.test.tsx

Source: [apps/mobile/src/features/access/**tests**/maintenance-settings-provider.test.tsx](../apps/mobile/src/features/access/__tests__/maintenance-settings-provider.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `api-fetch`, `maintenance-settings-screen`. Real HTTP requests reach the explicitly configured backend when opt-in execution is authorized. This suite does not start the provider or inspect its database, migrations or transaction implementation.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Expo native networking replaced by real node-fetch to an explicitly supplied backend; controlled response loss after the provider has returned from the write
- **Limit:** The provider URL and editor credentials are required. Skipped cases are unavailable evidence. Configured-backend behavior is separate from native networking and external-provider qualification.
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                  | Actual proof family                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------ |
| returns complete public state and publishes content only after explicit activation    | Opt-in configured backend HTTP integration |
| allows independent groups while excluding simultaneous same-group edits               | Opt-in configured backend HTTP integration |
| shares one platform revision and refuses invalid complete results atomically          | Opt-in configured backend HTTP integration |
| refuses an insecure maintenance image without changing saved settings                 | Opt-in configured backend HTTP integration |
| preserves a real conflicting draft through reread and explicit resubmission           | Opt-in configured backend HTTP integration |
| retains a committed lost-response draft and closes admission without a public refetch | Opt-in configured backend HTTP integration |

### Mobile: maintenance-settings.test.tsx

Source: [apps/mobile/src/features/access/**tests**/maintenance-settings.test.tsx](../apps/mobile/src/features/access/__tests__/maintenance-settings.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `maintenance-settings-screen`, `maintenance`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                               | Actual proof family                               |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| shows loading before any known state can be saved                                                  | React component/provider integration (JavaScript) |
| reports one failed refresh while retaining the editable maintenance draft                          | React component/provider integration (JavaScript) |
| does not publish defaults after an initial load failure                                            | React component/provider integration (JavaScript) |
| separates content preparation from explicit activation                                             | React component/provider integration (JavaScript) |
| sends the desired active state independently of dirty content                                      | React component/provider integration (JavaScript) |
| preserves a dirty draft after a newer background response                                          | React component/provider integration (JavaScript) |
| refuses blank text before sending any mutation                                                     | React component/provider integration (JavaScript) |
| refuses an invalid image URL without losing the draft                                              | React component/provider integration (JavaScript) |
| clears the optional image using explicit null                                                      | React component/provider integration (JavaScript) |
| keeps text and actions usable when preview display fails                                           | React component/provider integration (JavaScript) |
| starts a fresh draft image preview when a previously failed URL returns                            | React component/provider integration (JavaScript) |
| retains the draft after a confirmed %i refusal (parameterized)                                     | React component/provider integration (JavaScript) |
| requires reread and explicit resubmission after %s (parameterized)                                 | React component/provider integration (JavaScript) |
| keeps the production route closed until native admission is composed                               | React component/provider integration (JavaScript) |
| cancels content confirmation without sending a mutation                                            | React component/provider integration (JavaScript) |
| retains an uncertain command after its route-local draft is discarded                              | React component/provider integration (JavaScript) |
| cancels activation confirmation without changing the saved state                                   | React component/provider integration (JavaScript) |
| retains a draft through a failed permission refresh                                                | React component/provider integration (JavaScript) |
| retains a read-only draft and rejects held confirmation after the settings endpoint refuses access | React component/provider integration (JavaScript) |
| presents an initial settings refusal with an opaque retryable card and no editable defaults        | React component/provider integration (JavaScript) |
| retains a read-only draft and blocks a held %s confirmation after revocation (parameterized)       | React component/provider integration (JavaScript) |
| keeps a conflicting draft blocked through a failed settings reread                                 | React component/provider integration (JavaScript) |
| rechecks live authority after delayed credentials for %s before React renders (parameterized)      | React component/provider integration (JavaScript) |
| keeps a delayed acknowledged write and older reread behind the latest public revision              | React component/provider integration (JavaScript) |

### Mobile: store-action.test.tsx

Source: [apps/mobile/src/features/access/**tests**/store-action.test.tsx](../apps/mobile/src/features/access/__tests__/store-action.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `store-action`, `theme-provider`.
- **Controlled:** `expo-linking`
- **Isolation/cleanup:** RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)         | Actual proof family                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| keeps the action available after a failed native open and retries explicitly | React component/provider integration (JavaScript) |

### Mobile: account-age-retry.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/account-age-retry.test.tsx](../apps/mobile/src/features/accounts/__tests__/account-age-retry.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `profile-screen`, `account-session-provider`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket); `expo-image-picker`; `expo-image-manipulator`; `expo-file-system`
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                    | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| keeps profile editing and current administration access usable while age is unknown                     | React component/provider integration (JavaScript) |
| does not offer an age retry when reliable evidence is already available                                 | React component/provider integration (JavaScript) |
| retries the existing POST with valid credentials while preserving the username and prepared photo draft | React component/provider integration (JavaScript) |
| keeps an explicit retry and editable draft after %s evidence (parameterized)                            | React component/provider integration (JavaScript) |
| discards late %s from an old generation after A returns to the same account (parameterized)             | React component/provider integration (JavaScript) |
| does not expose targeted retry through refused profile admission                                        | React component/provider integration (JavaScript) |
| preserves confirmed photo and provider evidence when the %s response arrives last (parameterized)       | React component/provider integration (JavaScript) |

### Mobile: account-session-provider.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/account-session-provider.test.tsx](../apps/mobile/src/features/accounts/__tests__/account-session-provider.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                  | Actual proof family                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| finishes local initialization before mounting application consumers or restoring credentials          | React component/provider integration (JavaScript) |
| retains guest access after initialization failures and replaces that navigation on successful retry   | React component/provider integration (JavaScript) |
| distinguishes native restoration and authenticated identity from an unavailable business account      | React component/provider integration (JavaScript) |
| preserves public editing and discards an old account read across A to guest to %s (parameterized)     | React component/provider integration (JavaScript) |
| preserves the account context when native credential retrieval fails transiently                      | React component/provider integration (JavaScript) |
| returns native credentials without inferring a business account                                       | React component/provider integration (JavaScript) |
| leaves public access available when native authentication is not configured                           | React component/provider integration (JavaScript) |
| exposes the SDK context to ordinary app descendants                                                   | React component/provider integration (JavaScript) |
| retries SDK restoration explicitly after a network failure without clearing credentials or logging in | React component/provider integration (JavaScript) |
| leaves a second restoration failure visible until another explicit retry                              | React component/provider integration (JavaScript) |
| invalidates private work immediately even when native credential clearing is still pending            | React component/provider integration (JavaScript) |
| keeps a newer local sign-out pending when an older hosted login completes                             | React component/provider integration (JavaScript) |
| suppresses same-turn native login duplicates and captures the successful business generation          | React component/provider integration (JavaScript) |
| suppresses same-turn local logout duplicates without releasing the pending operation                  | React component/provider integration (JavaScript) |

### Mobile: native-session.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/native-session.test.tsx](../apps/mobile/src/features/accounts/__tests__/native-session.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                         | Actual proof family                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| restores and renews through the SDK without replaying an uncertain mutation                  | React component/provider integration (JavaScript) |
| keeps %s recoverable without clearing the session or demanding another login (parameterized) | React component/provider integration (JavaScript) |
| requires sign-in and invalidates private work after confirmed %s (parameterized)             | React component/provider integration (JavaScript) |
| invalidates immediately and ends locally when browser logout is %s (parameterized)           | React component/provider integration (JavaScript) |
| surfaces a failed local clear without restoring invalidated private work                     | React component/provider integration (JavaScript) |
| clears credentials locally without requiring browser logout                                  | React component/provider integration (JavaScript) |
| does not retry a native storage failure after successful browser logout                      | React component/provider integration (JavaScript) |

### Mobile: prepare-profile-photo.test.ts

Source: [apps/mobile/src/features/accounts/**tests**/prepare-profile-photo.test.ts](../apps/mobile/src/features/accounts/__tests__/prepare-profile-photo.test.ts).

- **Real:** Owning handwritten modules: `api-fetch`, `session-generation`, `prepare-profile-photo`.
- **Controlled:** `expo-image-manipulator`; `expo-file-system`
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

| Asserted behavior / regression if violated (parameter rows included)                        | Actual proof family                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| adapts a large cropped source once and checks the prepared PNG instead of the original size | Adapter orchestration with controlled SDK/storage |
| does not enlarge small squares                                                              | Adapter orchestration with controlled SDK/storage |
| rejects a prepared output of %i bytes (parameterized)                                       | Adapter orchestration with controlled SDK/storage |
| discards preparation completed after an A to guest to A transition                          | Adapter orchestration with controlled SDK/storage |
| refuses a non-square crop %i x %i (parameterized)                                           | Adapter orchestration with controlled SDK/storage |

### Mobile: profile-form.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/profile-form.test.tsx](../apps/mobile/src/features/accounts/__tests__/profile-form.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `profile-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket); `expo-image-picker`; `expo-image-manipulator`; `expo-file-system`
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                      | Actual proof family                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| keeps the profile draft and session until departure is explicitly confirmed                               | React component/provider integration (JavaScript) |
| refreshes the profile without changing a dirty draft or replaying a save                                  | React component/provider integration (JavaScript) |
| shows freshly read profile values when there is no local edit                                             | React component/provider integration (JavaScript) |
| defers clean profile updates until native photo selection has settled                                     | React component/provider integration (JavaScript) |
| reports an explicit failed refresh while keeping the profile and dirty input                              | React component/provider integration (JavaScript) |
| presents an initial account refusal %s with opaque copy and owner-controlled retry (parameterized)        | React component/provider integration (JavaScript) |
| keeps a refused profile draft read-only through a failed recheck until a successful account read          | React component/provider integration (JavaScript) |
| refuses an unsent profile save when its account read is denied during credential retrieval                | React component/provider integration (JavaScript) |
| announces the initial profile read without exposing profile commands                                      | React component/provider integration (JavaScript) |
| keeps the first photo read separate from native refresh progress                                          | React component/provider integration (JavaScript) |
| preserves the active save and suspends refresh and guest departure                                        | React component/provider integration (JavaScript) |
| uses the accepted profile result and clears the draft before guest departure                              | React component/provider integration (JavaScript) |
| refreshes the displayed remote photo while preserving a %s draft (parameterized)                          | React component/provider integration (JavaScript) |
| removes a refused remote photo until a successful photo read without treating failure as an empty profile | React component/provider integration (JavaScript) |
| sends one atomic multipart save with JSON metadata and no omitted photo                                   | React component/provider integration (JavaScript) |
| retains a dirty draft on background refetch and whole-save username refusal                               | React component/provider integration (JavaScript) |
| preserves the draft when native crop is cancelled or permission is refused                                | React component/provider integration (JavaScript) |
| rereads only the original account after an uncertain save and requires explicit resubmission              | React component/provider integration (JavaScript) |
| does not replay while the original account reread is unavailable                                          | React component/provider integration (JavaScript) |
| submits prepared replacement then explicit removal without a username edit                                | React component/provider integration (JavaScript) |
| sends only the current dirty username with photo replacement: $username (parameterized)                   | React component/provider integration (JavaScript) |
| retains the previous prepared choice and username when another preparation fails                          | React component/provider integration (JavaScript) |
| rejects delayed %s results after returning to the same account (parameterized)                            | React component/provider integration (JavaScript) |
| cancels an initial photo read before refreshing the accepted replacement                                  | React component/provider integration (JavaScript) |
| deletes a prepared profile draft on %s (parameterized)                                                    | React component/provider integration (JavaScript) |
| deletes the replaced profile copy while preserving the new draft                                          | React component/provider integration (JavaScript) |
| keeps a sent profile file until its upload settles after sign-out                                         | React component/provider integration (JavaScript) |

### Mobile: session-generation.test.ts

Source: [apps/mobile/src/features/accounts/**tests**/session-generation.test.ts](../apps/mobile/src/features/accounts/__tests__/session-generation.test.ts).

- **Real:** Owning handwritten modules: `session-generation`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history.

| Asserted behavior / regression if violated (parameter rows included)                | Actual proof family      |
| ----------------------------------------------------------------------------------- | ------------------------ |
| keeps the generation when establishing or refreshing the same account               | Direct policy/state unit |
| rejects old account results after switching to another account                      | Direct policy/state unit |
| discards a delayed result across A to guest to A even when work cannot be cancelled | Direct policy/state unit |
| notifies active consumers of lifecycle changes and supports unsubscription          | Direct policy/state unit |

### Mobile: sign-in.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/sign-in.test.tsx](../apps/mobile/src/features/accounts/__tests__/sign-in.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `use-current-account`, `sign-in-screen`, `profile-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                      | Actual proof family                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| allows guest continuation without opening Auth0 or establishing an account                                | React component/provider integration (JavaScript) |
| establishes explicitly after successful hosted login without replaying a protected action                 | React component/provider integration (JavaScript) |
| publishes established identity without mounting a current-account reader                                  | React component/provider integration (JavaScript) |
| offers explicit login when stored DPoP credentials cannot serve the Bearer configuration                  | React component/provider integration (JavaScript) |
| keeps guest access after native login outcome %s (parameterized)                                          | React component/provider integration (JavaScript) |
| keeps an explicit login failure in the toast when native credential persistence fails                     | React component/provider integration (JavaScript) |
| retries missing initial email explicitly without asking for another valid login                           | React component/provider integration (JavaScript) |
| never bootstraps an absent account during restoration or a profile read retry                             | React component/provider integration (JavaScript) |
| renders the local editable profile after ordinary restoration                                             | React component/provider integration (JavaScript) |
| enters guest mode from an authenticated %s screen without retaining private account state (parameterized) | React component/provider integration (JavaScript) |
| does not announce guest mode when native clearing fails on %s (parameterized)                             | React component/provider integration (JavaScript) |
| does not navigate from an obsolete guest handoff on %s (parameterized)                                    | React component/provider integration (JavaScript) |
| does not admit login or profile navigation through a controlled F12 refusal                               | React component/provider integration (JavaScript) |
| requires an explicit retry when interrupted login finishes %s (parameterized)                             | React component/provider integration (JavaScript) |
| allows a new login after admission withdrawal and completed local sign-out                                | React component/provider integration (JavaScript) |
| preserves guest access when F14 initialization fails before restoration                                   | React component/provider integration (JavaScript) |
| rejects a late establishment response after local session invalidation                                    | React component/provider integration (JavaScript) |
| discards a credential failure from an obsolete establishment session                                      | React component/provider integration (JavaScript) |
| suspends account reads throughout native credential clearing                                              | React component/provider integration (JavaScript) |

### Mobile: advertising-eligibility.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/advertising-eligibility.test.ts](../apps/mobile/src/features/advertising/__tests__/advertising-eligibility.test.ts).

- **Real:** Owning handwritten modules: `accounts`, `advertising-eligibility`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

| Asserted behavior / regression if violated (parameter rows included)                                  | Actual proof family      |
| ----------------------------------------------------------------------------------------------------- | ------------------------ |
| lets an admitted guest prepare choices and serve ads without any account entitlement read             | Direct policy/state unit |
| suppresses advertising and unnecessary choice preparation for current $label Pro (parameterized)      | Direct policy/state unit |
| allows independent privacy preparation but no ads when signed-in native rights are %s (parameterized) | Direct policy/state unit |
| does not infer a guest or free account while F05 is %s (parameterized)                                | Direct policy/state unit |
| permits the explicitly authorized %s mode for current SDK-inactive rights (parameterized)             | Direct policy/state unit |
| rejects $label (parameterized)                                                                        | Direct policy/state unit |
| rejects A's obsolete %s rights after switching directly to B (parameterized)                          | Direct policy/state unit |
| reassesses A → guest → A without inheriting A's former %s rights (parameterized)                      | Direct policy/state unit |
| rejects obsolete native-choice preparation after %s even with current inactive rights (parameterized) | Direct policy/state unit |
| requires current choices when a guest becomes an established account within the same generation       | Direct policy/state unit |
| rechecks changed native rights before presentation without retaining a former permission              | Direct policy/state unit |

### Mobile: age-declaration.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/age-declaration.test.ts](../apps/mobile/src/features/advertising/__tests__/age-declaration.test.ts).

- **Real:** Owning handwritten modules: `age-declaration`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored.

| Asserted behavior / regression if violated (parameter rows included)                        | Actual proof family                                   |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| persists only the category/date for explicit age %s (parameterized)                         | Real storage adapter/serialization; in-memory storage |
| rejects invalid age %s without replacing the declaration (parameterized)                    | Real storage adapter/serialization; in-memory storage |
| uses child protection without synthesizing a declaration from %s (parameterized)            | Real storage adapter/serialization; in-memory storage |
| renews a minor at the calendar anniversary on %s without aging the category (parameterized) | Direct age/date policy unit                           |
| uses the last February day for a leap-day minor anniversary                                 | Direct age/date policy unit                           |
| never annually reprompts adults and rejects a future declaration date                       | Direct age/date policy unit                           |
| propagates storage failures without fictional confirmation or replacement                   | Real storage adapter/serialization; in-memory storage |

### Mobile: age-entry.test.tsx

Source: [apps/mobile/src/features/advertising/**tests**/age-entry.test.tsx](../apps/mobile/src/features/advertising/__tests__/age-entry.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `current-account`, `pro`, `pro-session`, `age-declaration-provider`, `age-declaration`, `_layout`, `age-declaration`, `index`, `onboarding`, `sign-in`, `discovery-state`, `access-gate-screen`.
- **Controlled:** `expo-constants`; Sentry SDK entry/capture double; `expo-application`; official AsyncStorage Jest in-memory double; installation initialization outside this scenario; RevenueCat public SDK operations replaced by controlled doubles; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                             | Actual proof family                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| persists the first explicit age once and suppresses a concurrent different age without success   | React component/provider integration (JavaScript) |
| keeps a remounted age form busy while installation storage survives a session change             | React component/provider integration (JavaScript) |
| guards ordinary home after guest selection even when discovery was skipped                       | React component/provider integration (JavaScript) |
| keeps back/restart unconfirmed and preserves completed discovery                                 | React component/provider integration (JavaScript) |
| leaves independent %s available without a declaration (parameterized)                            | React component/provider integration (JavaScript) |
| preserves the F12 gate for %s (parameterized)                                                    | React component/provider integration (JavaScript) |
| reuses the form for annual minor renewal and preserves storage when interrupted                  | React component/provider integration (JavaScript) |
| persists confirmation across a later launch without annual adult prompts or discovery replay     | React component/provider integration (JavaScript) |
| offers an explicit storage-read retry without declaring a default age                            | React component/provider integration (JavaScript) |
| avoids prompting known active Pro without transferring that exemption to a guest                 | React component/provider integration (JavaScript) |
| keeps one installation declaration through account replacement, local logout and tree recreation | React component/provider integration (JavaScript) |
| retains the unconfirmed choice across a live reduced-motion change                               | React component/provider integration (JavaScript) |
| guards a signed-in free account’s home independently of its account identity                     | React component/provider integration (JavaScript) |
| keeps public legal navigation available while local age storage is pending                       | React component/provider integration (JavaScript) |
| ignores an obsolete installation read after a new tree loads the current declaration             | React component/provider integration (JavaScript) |

### Mobile: age-form.test.tsx

Source: [apps/mobile/src/features/advertising/**tests**/age-form.test.tsx](../apps/mobile/src/features/advertising/__tests__/age-form.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `theme-provider`, `age-form`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                          | Actual proof family                               |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| starts without a declared age despite the native thumb position                               | React component/provider integration (JavaScript) |
| requires confirmation after a precise plus/minus choice, including explicit zero              | React component/provider integration (JavaScript) |
| treats releasing the thumb at zero as explicit selection and displays 100+ at the upper bound | React component/provider integration (JavaScript) |
| keeps the editable choice after rejected persistence and allows explicit retry                | React component/provider integration (JavaScript) |
| cancels an edited correction on unmount and starts a fresh neutral choice when reopened       | React component/provider integration (JavaScript) |

### Mobile: interstitial-lifecycle.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/interstitial-lifecycle.test.ts](../apps/mobile/src/features/advertising/__tests__/interstitial-lifecycle.test.ts).

- **Real:** Owning handwritten modules: `interstitial-lifecycle`, `sporting-ad-transition`.
- **Controlled:** Google Mobile Ads SDK factory/events/ad instance double; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; fake timers returned to real timers.

| Asserted behavior / regression if violated (parameter rows included)                                       | Actual proof family                                   |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| preloads one instance with current request options and resets only on OPENED                               | Real lifecycle/transition composition; controlled SDK |
| releases once on %s before destroy and ignores retired events (parameterized)                              | Real lifecycle/transition composition; controlled SDK |
| waits for the next eligible sporting action after no-fill without treating it as an incident               | Real lifecycle/transition composition; controlled SDK |
| uses LOADED freshness at %i ms and never displays an expired replacement late (parameterized)              | Real lifecycle/transition composition; controlled SDK |
| settles %s invalidation before destruction and preserves the count (parameterized)                         | Real lifecycle/transition composition; controlled SDK |
| rechecks authorization before show and discards incompatible session and mode preparation                  | Real lifecycle/transition composition; controlled SDK |
| does not preload after dismissal when current authorization has been withdrawn                             | Real lifecycle/transition composition; controlled SDK |
| keeps destination errors separate from ad failure after dismissal                                          | Real lifecycle/transition composition; controlled SDK |
| allows restart to abandon a callback-free hang without a watchdog or replay                                | Real lifecycle/transition composition; controlled SDK |
| releases content after %s preparation failure and waits for another eligible action (parameterized)        | Real lifecycle/transition composition; controlled SDK |
| ignores obsolete OPENED and abandons the destination after %s before provider invalidation (parameterized) | Real lifecycle/transition composition; controlled SDK |

### Mobile: sporting-ad-transitions.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/sporting-ad-transitions.test.ts](../apps/mobile/src/features/advertising/__tests__/sporting-ad-transitions.test.ts).

- **Real:** Owning handwritten modules: `interstitial-lifecycle`, `sporting-ad-transition`.
- **Controlled:** Google Mobile Ads SDK factory/events/ad instance double; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario doubles reset before each case.

| Asserted behavior / regression if violated (parameter rows included)                                 | Actual proof family                                   |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| shares the first nine actions and the tenth opportunity across every sporting kind                   | Real lifecycle/transition composition; controlled SDK |
| caps missing and loading opportunities at ten without waiting or showing on late load                | Real lifecycle/transition composition; controlled SDK |
| counts a repeated pending action once and refuses a different concurrent destination                 | Real lifecycle/transition composition; controlled SDK |
| leaves %s outside the sporting count and ad opportunity (parameterized)                              | Real lifecycle/transition composition; controlled SDK |
| excludes involuntary sporting openings                                                               | Real lifecycle/transition composition; controlled SDK |
| keeps excluded $kind navigation independent of a pending sporting ad (parameterized)                 | Real lifecycle/transition composition; controlled SDK |
| adds no debt for %s rights and preserves prior opportunities through rights changes (parameterized)  | Real lifecycle/transition composition; controlled SDK |
| still abandons an obsolete excluded destination without touching advertising                         | Real lifecycle/transition composition; controlled SDK |
| counts free actions without authorized choices and retains the threshold when eligibility changes    | Real lifecycle/transition composition; controlled SDK |
| retains memory across backgrounding and starts a fresh runtime at zero without replay                | Real lifecycle/transition composition; controlled SDK |
| reports destination %s separately from advertising failure (parameterized)                           | Real lifecycle/transition composition; controlled SDK |
| deduplicates the accepted action while its asynchronous destination is opening                       | Real lifecycle/transition composition; controlled SDK |
| abandons an obsolete asynchronous opening without blocking or clearing the new session's destination | Real lifecycle/transition composition; controlled SDK |

### Mobile: close-season.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/close-season.test.tsx](../apps/mobile/src/features/collection/__tests__/close-season.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. Owning handwritten modules: `close-season-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)                                         | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| requires the exact displayed label and sends the current revision once                                       | React component/provider integration (JavaScript) |
| retains the exact draft after %s, background refresh and route removal until explicit reread (parameterized) | React component/provider integration (JavaScript) |
| rereads an uncertain accepted closure without repeating the write                                            | React component/provider integration (JavaScript) |
| cancels through ordinary back without changing the season                                                    | React component/provider integration (JavaScript) |
| retains entered text while current collection permission is unavailable                                      | React component/provider integration (JavaScript) |
| retains an incorrect draft through a background revision change and refuses to submit it                     | React component/provider integration (JavaScript) |
| retains the draft after a definite refusal and can explicitly submit again                                   | React component/provider integration (JavaScript) |
| does not unlock uncertain closure when its explicit current-state read fails                                 | React component/provider integration (JavaScript) |

### Mobile: collection-contract.test.ts

Source: [apps/mobile/src/features/collection/**tests**/collection-contract.test.ts](../apps/mobile/src/features/collection/__tests__/collection-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)                | Actual proof family                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| accepts explicit nullable evidence and additive fields through the generated client | Generated/handwritten transport integration |
| rejects %s before accepting collection state (parameterized)                        | Generated/handwritten transport integration |
| retains the shared conflict problem without treating it as collection state         | Generated/handwritten transport integration |

### Mobile: collection-dashboard.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/collection-dashboard.test.tsx](../apps/mobile/src/features/collection/__tests__/collection-dashboard.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. Owning handwritten modules: `collection-dashboard-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)                                          | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| separates competition seasons from the two seasonless controls                                                | React component/provider integration (JavaScript) |
| refreshes only reads and retains uncertain integration and absent measurements while paused                   | React component/provider integration (JavaScript) |
| distinguishes accepted pending intent from a confirmed running cycle (%s) (parameterized)                     | React component/provider integration (JavaScript) |
| pauses only the selected control and explicitly resumes before relaunch                                       | React component/provider integration (JavaScript) |
| requires explicit successful reread after %s and retains the scope across removal (parameterized)             | React component/provider integration (JavaScript) |
| shows partial acquisition separately from failed integration and a previous success                           | React component/provider integration (JavaScript) |
| refuses a held confirmation after current permission withdrawal                                               | React component/provider integration (JavaScript) |
| refuses a confirmed collection request when its %s read is denied during credential retrieval (parameterized) | React component/provider integration (JavaScript) |
| ignores an old-session command response without presenting a new success                                      | React component/provider integration (JavaScript) |
| keeps a closed season navigable with no collection command                                                    | React component/provider integration (JavaScript) |
| commands the %s family without a season query or setting (parameterized)                                      | React component/provider integration (JavaScript) |
| retains running evidence while pause cancels an unstarted request                                             | React component/provider integration (JavaScript) |
| retains earlier rows and retries the failed next results page                                                 | React component/provider integration (JavaScript) |
| rejects a malformed command acknowledgement and keeps the uncertain scope locked after a failed reread        | React component/provider integration (JavaScript) |
| invalidates a held native confirmation when its screen is removed                                             | React component/provider integration (JavaScript) |
| retains an uncertain %s command through A → B → A navigation (parameterized)                                  | React component/provider integration (JavaScript) |
| keeps a newer running read when an older accepted pending acknowledgement arrives                             | React component/provider integration (JavaScript) |
| keeps completion freshness already read at the same editing revision as a delayed pause acknowledgement       | React component/provider integration (JavaScript) |
| disables pull-to-refresh while a collection command is awaiting acknowledgement                               | React component/provider integration (JavaScript) |

### Mobile: preparation-editors.test.ts

Source: [apps/mobile/src/features/collection/**tests**/preparation-editors.test.ts](../apps/mobile/src/features/collection/__tests__/preparation-editors.test.ts).

- **Real:** Owning handwritten modules: `session-generation`, `preparation-editors`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** retained editor state discarded after each case.

| Asserted behavior / regression if violated (parameter rows included) | Actual proof family      |
| -------------------------------------------------------------------- | ------------------------ |
| does not restore source or provider drafts after %s (parameterized)  | Direct policy/state unit |

### Mobile: preparation-routes.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/preparation-routes.test.tsx](../apps/mobile/src/features/collection/__tests__/preparation-routes.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `discovery-state`, `_layout`, `administration`, `_layout`, `collection`, `[seasonId]`, `[provider]`, `[provider]`, `[family]`, `closure`, `[sourceId]`, `+not-found`, `access-gate-screen`.
- **Controlled:** `expo-constants`; react-native-keyboard-controller upstream native test double; `expo-application`; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                                | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| retains the same-session %s draft and required reread when a permission failure interrupts recovery (parameterized) | React component/provider integration (JavaScript) |
| opens preparation from the administration entry during maintenance with collection permission alone                 | React component/provider integration (JavaScript) |
| keeps a resumed candidate locked while its original save remains pending                                            | React component/provider integration (JavaScript) |
| retains the exact failed launch selection when admission removes and later restores its provider route              | React component/provider integration (JavaScript) |
| navigates through seasonal provider controls to separate source preparation                                         | React component/provider integration (JavaScript) |
| retains a typed closure draft across protected-route removal and cancels through native back without a write        | React component/provider integration (JavaScript) |
| preserves uncertain closure after discarding its text and reopening before acknowledgement                          | React component/provider integration (JavaScript) |
| refuses a collection deep link with unrelated rights %j (parameterized)                                             | React component/provider integration (JavaScript) |
| keeps collection operations closed to an outdated client even with the collection grant                             | React component/provider integration (JavaScript) |
| does not send a prepared command when a newer minimum blocks the client during credential retrieval                 | React component/provider integration (JavaScript) |

### Mobile: source-preparation.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/source-preparation.test.tsx](../apps/mobile/src/features/collection/__tests__/source-preparation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `query-client`, `theme-provider`, `account-session-provider`, `current-account`, `collection-dashboard-screen`, `season-preparation-screen`, `provider-sources-screen`, `source-preparation-screen`, `source-children-screen`, `use-application-access`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                              | Actual proof family                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| cancels the %s draft only after native discard confirmation (parameterized)                       | React component/provider integration (JavaScript) |
| lists canonical seasons in the production collection overview                                     | React component/provider integration (JavaScript) |
| opens provider controls without loading unused source configuration                               | React component/provider integration (JavaScript) |
| announces pending collection navigation without inventing a season destination                    | React component/provider integration (JavaScript) |
| shows an honest empty season list and recovers an initial read failure explicitly                 | React component/provider integration (JavaScript) |
| requires the dedicated collection grant: %j (parameterized)                                       | React component/provider integration (JavaScript) |
| shows missing source coverage without inventing seasonal evidence or mapping readiness            | React component/provider integration (JavaScript) |
| saves an inline candidate and clears old qualification before another explicit validation         | React component/provider integration (JavaScript) |
| preserves qualified feedback when saving an %s candidate (parameterized)                          | React component/provider integration (JavaScript) |
| preserves dirty input through a background refetch and requires an explicit reread                | React component/provider integration (JavaScript) |
| keeps the candidate after a confirmed %i refusal (parameterized)                                  | React component/provider integration (JavaScript) |
| rereads before explicit candidate resubmission after %s (parameterized)                           | React component/provider integration (JavaScript) |
| keeps an uncertain candidate blocked when reread fails                                            | React component/provider integration (JavaScript) |
| keeps 202 pending distinct from qualification and only rereads on demand                          | React component/provider integration (JavaScript) |
| confirms only missing seasonal attribution with the exact canonical season                        | React component/provider integration (JavaScript) |
| never offers confirmation to override invalid evidence                                            | React component/provider integration (JavaScript) |
| keeps %s sources read-only (parameterized)                                                        | React component/provider integration (JavaScript) |
| preserves the launch selection after %s without replay (parameterized)                            | React component/provider integration (JavaScript) |
| rereads a failed launch without discarding selections before a new explicit launch                | React component/provider integration (JavaScript) |
| rejects credential-bearing candidate input locally without losing it or sending a write           | React component/provider integration (JavaScript) |
| adds only an unqualified candidate for the explicit provider and current season revision          | React component/provider integration (JavaScript) |
| keeps a manual draft read-only when the reread establishes terminal season closure                | React component/provider integration (JavaScript) |
| launches an initial-import-locked qualified binding unchanged                                     | React component/provider integration (JavaScript) |
| reads bounded direct children and their next page without exposing mapping or an invented total   | React component/provider integration (JavaScript) |
| retries the failed next child page instead of only refreshing already loaded children             | React component/provider integration (JavaScript) |
| retains the manual supported-source draft after a duplicate conflict                              | React component/provider integration (JavaScript) |
| blocks a held confirmation after grant revocation while retaining a read-only draft               | React component/provider integration (JavaScript) |
| rejects a source mutation arriving after the original F05 session ended                           | React component/provider integration (JavaScript) |
| preserves a newer source read when an older accepted candidate response arrives later             | React component/provider integration (JavaScript) |
| keeps every provider blocked when an acknowledged source invalidates a season whose refresh fails | React component/provider integration (JavaScript) |
| preserves an edited source URL when pull-to-refresh reads a newer source revision                 | React component/provider integration (JavaScript) |
| hides retained source groups when the current catalog read is refused                             | React component/provider integration (JavaScript) |
| explains missing collection permission without leaving a disabled catalog in loading              | React component/provider integration (JavaScript) |
| retains a source draft but disables its commands after the current source read is refused         | React component/provider integration (JavaScript) |
| keeps refused season navigation hidden through a failed reread until a successful owner retry     | React component/provider integration (JavaScript) |

### Mobile: contribution-context.test.ts

Source: [apps/mobile/src/features/contributions/**tests**/contribution-context.test.ts](../apps/mobile/src/features/contributions/__tests__/contribution-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `session-generation`, `query-client`, `contribution-keys`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; fake timers returned to real timers.

| Asserted behavior / regression if violated (parameter rows included)                          | Actual proof family                             |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| separates account, session, match, version and exact filters in private keys                  | Direct request/context policy                   |
| uses the infinite query page parameter without splitting the traversal key                    | Generated transport + Query/session integration |
| rejects late callbacks through A → guest → %s without relying on cancellation (parameterized) | Generated transport + Query/session integration |
| refuses a command captured before a same-account return before sending it                     | Generated/handwritten transport integration     |

### Mobile: contribution-contract.test.ts

Source: [apps/mobile/src/features/contributions/**tests**/contribution-contract.test.ts](../apps/mobile/src/features/contributions/__tests__/contribution-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)                                | Actual proof family                             |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| keeps the %s vocabulary finite (parameterized)                                                      | Generated schema validation only                |
| validates required command fields with the generated mobile schema (parameterized)                  | Generated schema validation only                |
| admits erased attribution and hidden dateless private sporting context through the generated client | Generated/handwritten transport integration     |
| validates a JSON body once before Query accepts it                                                  | Generated transport + Query/session integration |
| rejects %s before admitting private data into Query (parameterized)                                 | Generated transport + Query/session integration |
| accepts twenty items, the maximum page and a full JavaScript-safe report count                      | Generated/handwritten transport integration     |
| rejects an erased report reason represented as %s (parameterized)                                   | Generated/handwritten transport integration     |
| accepts optional genuine schedule/result without deriving public viewability                        | Generated schema validation only                |
| grants moderation only through literal true in the additive account projection (parameterized)      | Generated schema validation only                |
| keeps a shared conflict as an HTTP error instead of successful contribution data                    | Generated/handwritten transport integration     |
| preserves an opaque owner revision and nullable-independent quota context                           | Generated/handwritten transport integration     |
| accepts the public %s stream projection without private attribution (parameterized)                 | Generated/handwritten transport integration     |

### Mobile: discovery-access.test.ts

Source: [apps/mobile/src/features/discovery/**tests**/discovery-access.test.ts](../apps/mobile/src/features/discovery/__tests__/discovery-access.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `discovery-context`, `session-generation`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)        | Actual proof family                             |
| --------------------------------------------------------------------------- | ----------------------------------------------- |
| starts public discovery without reading credentials or entitlement state    | Generated/handwritten transport integration     |
| preserves explicit bypass refusal %i without a public retry (parameterized) | Generated/handwritten transport integration     |
| rejects an old-session bypass completion before cache admission             | Generated transport + Query/session integration |
| rejects a late completion after the owner cancels bypass intent             | Generated/handwritten transport integration     |
| rejects cancelled bypass intent after the response body has completed       | Generated transport + Query/session integration |

### Mobile: discovery-contract.test.ts

Source: [apps/mobile/src/features/discovery/**tests**/discovery-contract.test.ts](../apps/mobile/src/features/discovery/__tests__/discovery-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`, `discovery-context`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)               | Actual proof family                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| admits additive fields while preserving absent optional values                     | Generated/handwritten transport integration     |
| rejects invalid known fields before Query admission: %j (parameterized)            | Generated transport + Query/session integration |
| rejects unknown sporting enums in generated responses                              | Generated/handwritten transport integration     |
| encodes repeated UUID examples in their selected order                             | Generated/handwritten transport integration     |
| sends 200 Unicode characters without rewriting them: %s (parameterized)            | Generated/handwritten transport integration     |
| rejects over-limit Unicode input (parameterized)                                   | Direct request/context policy                   |
| rejects invalid parameter combinations: %j (parameterized)                         | Direct request/context policy                   |
| keeps normalized search context separate from pagination                           | Direct request/context policy                   |
| preserves non-whitespace control or format character %j in the key (parameterized) | Direct request/context policy                   |
| folds Unicode whitespace without changing the submitted text                       | Direct request/context policy                   |

### Mobile: discovery-queries.test.ts

Source: [apps/mobile/src/features/discovery/**tests**/discovery-queries.test.ts](../apps/mobile/src/features/discovery/__tests__/discovery-queries.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `discovery-queries`, `session-generation`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; global Query online/focus flags reset; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                | Actual proof family                             |
| ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| uses the returned cursor as pageParam inside one native infinite-query entry        | Generated transport + Query/session integration |
| isolates type, normalized text, exact filters, session and deliberate bypass intent | Direct request/context policy                   |
| rejects invalid known %s fields before successful cache admission (parameterized)   | Generated transport + Query/session integration |
| attempts an offline read once and rejects an old-session completion                 | Generated transport + Query/session integration |

### Mobile: search-screen.test.tsx

Source: [apps/mobile/src/features/discovery/**tests**/search-screen.test.tsx](../apps/mobile/src/features/discovery/__tests__/search-screen.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `search-screen`, `query-client`, `theme-provider`, `account-session-provider`, `use-application-access`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); `../../../shared/api/binary-image-preview`
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                      | Actual proof family                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| allows all three public tabs for %s without waiting for Pro (parameterized)                               | React component/provider integration (JavaScript) |
| keeps distinct namesakes and presents only available public context without logo reads                    | React component/provider integration (JavaScript) |
| clears the shared query through the approved search action without fetching empty text                    | React component/provider integration (JavaScript) |
| accepts 200 Unicode code points and rejects longer input without truncation, counter or limit hint        | React component/provider integration (JavaScript) |
| distinguishes initial waiting, retryable failure and established no matches while retaining text          | React component/provider integration (JavaScript) |
| keeps clearing available without pull-to-refresh through replacement reads and preserves the selected tab | React component/provider integration (JavaScript) |
| cancels superseded text and tab requests and never shows an older result as the new search                | React component/provider integration (JavaScript) |
| does not replay a failed read on focus, reconnect or a visited-tab return                                 | React component/provider integration (JavaScript) |
| leaves empty and whitespace-only text unqueried until the examples owner is delivered                     | React component/provider integration (JavaScript) |
| does not replay a logo read after status %i when returning to its tab (parameterized)                     | React component/provider integration (JavaScript) |
| retries native rendering after a successful logo reread with identical bytes                              | React component/provider integration (JavaScript) |
| retains the draft and selected tab when an %s search is read again (parameterized)                        | React component/provider integration (JavaScript) |
| retries only the failed continuation and keeps one row per resource                                       | React component/provider integration (JavaScript) |
| retains loaded pages after a failed background read and accepts the next traversal: %s (parameterized)    | React component/provider integration (JavaScript) |
| cancels pending pagination before a background read and rejects its late response                         | React component/provider integration (JavaScript) |
| replaces retained search results after a current access or visibility refusal (%s) (parameterized)        | React component/provider integration (JavaScript) |

### Mobile: follow-action.test.tsx

Source: [apps/mobile/src/features/following/**tests**/follow-action.test.tsx](../apps/mobile/src/features/following/__tests__/follow-action.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `button`, `query-client`, `theme-provider`, `use-application-access`, `account-session-provider`, `follow-button`, `[teamId]`, `[poolId]`, `following-keys`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                              | Actual proof family                               |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| shares the requested value and busy state across tabs, ignores repeated taps and keeps another target usable      | React component/provider integration (JavaScript) |
| invites a guest without retaining a command to replay after authentication                                        | React component/provider integration (JavaScript) |
| suspends the action after profile retrieval fails while public content remains usable                             | React component/provider integration (JavaScript) |
| composes the %s route with its exact target and sporting season (parameterized)                                   | React component/provider integration (JavaScript) |
| distinguishes a failed initial member read from false and offers an explicit read retry                           | React component/provider integration (JavaScript) |
| rereads a temporarily hidden target when its public page is reopened after restoration                            | React component/provider integration (JavaScript) |
| does not resurrect a superseded failure when the successful second control unmounts                               | React component/provider integration (JavaScript) |
| keeps the confirmed member state when returning from an explicit maintenance bypass                               | React component/provider integration (JavaScript) |
| retires an obsolete mutation refusal %s after a current read on another reopened control (parameterized)          | React component/provider integration (JavaScript) |
| keeps a newer current read refusal %s when an earlier saved write response arrives late (parameterized)           | React component/provider integration (JavaScript) |
| keeps refusal %s after the settled command is retired and its initiating control leaves (parameterized)           | React component/provider integration (JavaScript) |
| applies authoritative success after the initiating control unmounts                                               | React component/provider integration (JavaScript) |
| resets affected retained selections and invalidates options/count without touching another owner                  | React component/provider integration (JavaScript) |
| cancels old list traversal and reloads only visible first pages, keeping write success when that read fails       | React component/provider integration (JavaScript) |
| preserves a confirmed write when the subsequent profile read fails                                                | React component/provider integration (JavaScript) |
| keeps the prior state after a definite refusal of following=%s and repeats only on explicit press (parameterized) | React component/provider integration (JavaScript) |
| observes current state once after losing a write response without announcing a confirmed write                    | React component/provider integration (JavaScript) |
| shares an uncertain-write observation with an explicit member reread and cancels both through Query               | React component/provider integration (JavaScript) |
| retains an uncertain follow across route disposal and cache expiry until a deliberate same-command retry          | React component/provider integration (JavaScript) |
| rejects late completion after switching to %s (parameterized)                                                     | React component/provider integration (JavaScript) |
| suspends the canonical confirmed relation when its maintenance bypass is cleared                                  | React component/provider integration (JavaScript) |

### Mobile: following-context.test.ts

Source: [apps/mobile/src/features/following/**tests**/following-context.test.ts](../apps/mobile/src/features/following/__tests__/following-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `accounts`, `query-client`, `following-keys`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; fake timers returned to real timers.

| Asserted behavior / regression if violated (parameter rows included)     | Actual proof family                             |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| leaves guests and unavailable profiles without a private context         | Direct request/context policy                   |
| detaches account and generation without consulting entitlements          | Direct request/context policy                   |
| distinguishes target type, identity, owner and same-account sessions     | Direct request/context policy                   |
| freezes list and calendar selections with all response inputs            | Direct request/context policy                   |
| keeps public counts account-independent and separates explicit bypass    | Direct request/context policy                   |
| rejects obsolete reads across A → %s (parameterized)                     | Generated transport + Query/session integration |
| rejects late mutation success after A → guest → %s (parameterized)       | Generated transport + Query/session integration |
| rejects erased or retired context before sending another private request | Generated/handwritten transport integration     |
| preserves an established identity when profile retrieval is unavailable  | Generated/handwritten transport integration     |

### Mobile: following-contract.test.ts

Source: [apps/mobile/src/features/following/**tests**/following-contract.test.ts](../apps/mobile/src/features/following/__tests__/following-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)          | Actual proof family                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------- |
| reads and replaces complete boolean state: %s (parameterized)                 | Generated/handwritten transport integration     |
| refuses invalid state before consumer success: %j (parameterized)             | Generated/handwritten transport integration     |
| rejects incomplete or additive mutation requests: %j (parameterized)          | Generated schema validation only                |
| validates a successful JSON body exactly once                                 | Generated transport + Query/session integration |
| reuses sporting season, pool summaries and calendar while preserving omission | Generated/handwritten transport integration     |
| reads exact public counts: %s (parameterized)                                 | Generated/handwritten transport integration     |
| rejects invalid counts without coercion: %j (parameterized)                   | Generated/handwritten transport integration     |
| rejects invalid pages before caching: %j (parameterized)                      | Generated transport + Query/session integration |
| accepts twenty %s items and the maximum continuation (parameterized)          | Generated/handwritten transport integration     |
| rejects unsupported request pages: %j (parameterized)                         | Generated schema validation only                |
| rejects invalid list request shapes: %j (parameterized)                       | Generated schema validation only                |
| rejects invalid calendar request shapes: %j (parameterized)                   | Generated schema validation only                |
| keeps HTTP %s as a safe error rather than false state (parameterized)         | Generated/handwritten transport integration     |
| rejects malformed personal calendars before success: %j (parameterized)       | Generated/handwritten transport integration     |
| rejects malformed options without inventing a default: %j (parameterized)     | Generated/handwritten transport integration     |

### Mobile: notification-context.test.ts

Source: [apps/mobile/src/features/notifications/**tests**/notification-context.test.ts](../apps/mobile/src/features/notifications/__tests__/notification-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `accounts`, `query-client`, `notification-keys`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                      | Actual proof family                             |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| requires a usable original owner and keeps account and generation in private keys         | Direct request/context policy                   |
| uses one native infinite-query entry with cursor in pageParam                             | Generated transport + Query/session integration |
| removes obsolete inbox/summary/detail across A → $label (parameterized)                   | Generated transport + Query/session integration |
| rejects obsolete callbacks without a cancellation signal after A → $label (parameterized) | Generated/handwritten transport integration     |
| refuses old prepared work before sending even after the same account returns              | Generated/handwritten transport integration     |

### Mobile: notification-contract.test.ts

Source: [apps/mobile/src/features/notifications/**tests**/notification-contract.test.ts](../apps/mobile/src/features/notifications/__tests__/notification-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                             | Actual proof family                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| admits the finite %s family with additive fields and precise original values (parameterized)     | Generated/handwritten transport integration     |
| validates a twenty-entry page once at F13 before cache admission and preserves end absence       | Generated transport + Query/session integration |
| rejects malformed page data before Query success: %j (parameterized)                             | Generated transport + Query/session integration |
| consumes the authored int64 count %s (parameterized)                                             | Generated/handwritten transport integration     |
| rejects malformed summary fields: %j (parameterized)                                             | Generated/handwritten transport integration     |
| rejects unsupported read intent: %j (parameterized)                                              | Generated schema validation only                |
| rejects incomplete or extra registration fields: %j (parameterized)                              | Generated schema validation only                |
| sends true-only intent and keeps an opaque continuation unmodified                               | Generated/handwritten transport integration     |
| rejects invalid list parameters: %j (parameterized)                                              | Generated schema validation only                |
| returns association identities for %s without requiring or echoing a destination (parameterized) | Generated/handwritten transport integration     |
| consumes 204 without invoking JSON parsing                                                       | Generated/handwritten transport integration     |

### Mobile: discovery-navigation.test.tsx

Source: [apps/mobile/src/features/onboarding/**tests**/discovery-navigation.test.tsx](../apps/mobile/src/features/onboarding/__tests__/discovery-navigation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `sign-in`, `current-account`, `discovery-state`, `access-gate-screen`.
- **Controlled:** Sentry SDK entry/capture double; `expo-application`; official AsyncStorage Jest in-memory double; installation initialization outside this scenario; RevenueCat public SDK operations replaced by controlled doubles; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                               | Actual proof family                               |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| presents common discovery before ordinary access, then keeps sign-out and foreground independent   | React component/provider integration (JavaScript) |
| keeps completed discovery and ordinary guest/support access after %s sign-in (parameterized)       | React component/provider integration (JavaScript) |
| keeps %s behind current F12 blocking (parameterized)                                               | React component/provider integration (JavaScript) |
| preserves a completed installation’s deep link while its local flag is being read                  | React component/provider integration (JavaScript) |
| keeps the root loading gate during an explicit installation-read retry                             | React component/provider integration (JavaScript) |
| suppresses discovery under %s (parameterized)                                                      | React component/provider integration (JavaScript) |
| leaves completed discovery unchanged after restart and a later V2 release                          | React component/provider integration (JavaScript) |
| keeps the public store action and its error available while installation initialization is pending | React component/provider integration (JavaScript) |

### Mobile: discovery-screen.test.tsx

Source: [apps/mobile/src/features/onboarding/**tests**/discovery-screen.test.tsx](../apps/mobile/src/features/onboarding/__tests__/discovery-screen.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `theme-provider`, `request-feedback`, `discovery-provider`, `discovery-state`, `discovery-screen`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                    | Actual proof family                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| skips explicitly and retains completion after restart                                   | React component/provider integration (JavaScript) |
| shows the five common steps and conditional Pro help without a restoration action       | React component/provider integration (JavaScript) |
| keeps interruption and back navigation incomplete                                       | React component/provider integration (JavaScript) |
| waits for persistence and retains the journey on write failure before an explicit retry | React component/provider integration (JavaScript) |
| offers explicit recovery when the installation flag cannot be read                      | React component/provider integration (JavaScript) |
| ignores a previous mount's unfinished read after the installation is completed          | React component/provider integration (JavaScript) |
| preserves an acknowledged installation write when the submitting tree is removed        | React component/provider integration (JavaScript) |
| dispatches explicit completion once even when its tree leaves in the same event         | React component/provider integration (JavaScript) |

### Mobile: discovery-state.test.ts

Source: [apps/mobile/src/features/onboarding/**tests**/discovery-state.test.ts](../apps/mobile/src/features/onboarding/__tests__/discovery-state.test.ts).

- **Real:** Owning handwritten modules: `discovery-state`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored.

| Asserted behavior / regression if violated (parameter rows included)                             | Actual proof family                                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| leaves interrupted discovery incomplete even after V1 completion and V2 initialization           | Real storage adapter/serialization; in-memory storage |
| retains explicit completion across repeated launches without changing other installation choices | Real storage adapter/serialization; in-memory storage |
| does not report completion after a failed write and permits explicit retry                       | Real storage adapter/serialization; in-memory storage |
| propagates a failed read instead of assuming discovery is complete                               | Real storage adapter/serialization; in-memory storage |

### Mobile: initialization-root.test.tsx

Source: [apps/mobile/src/features/onboarding/**tests**/initialization-root.test.tsx](../apps/mobile/src/features/onboarding/__tests__/initialization-root.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `account-session-provider`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles; selected router/Stack navigation boundary (see declared mock); Sentry SDK entry/capture double; official AsyncStorage Jest in-memory double; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** scenario doubles reset before each case; official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                       | Actual proof family                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| waits for %s before admitting routes and SDK restoration (parameterized)                   | React component/provider integration (JavaScript) |
| preserves guest access after rejected %s and initializes on explicit retry (parameterized) | React component/provider integration (JavaScript) |
| restores the ordinary SDK identity on subsequent launches without clearing it again        | React component/provider integration (JavaScript) |

### Mobile: initialize-v2-installation.test.ts

Source: [apps/mobile/src/features/onboarding/**tests**/initialize-v2-installation.test.ts](../apps/mobile/src/features/onboarding/__tests__/initialize-v2-installation.test.ts).

- **Real:** Owning handwritten modules: `initialize-v2-installation`.
- **Controlled:** official AsyncStorage Jest in-memory double; Auth0 client/credential-manager double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored.

| Asserted behavior / regression if violated (parameter rows included)           | Actual proof family                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| clears native credentials before completing V2 initialization                  | Adapter orchestration with controlled SDK/storage |
| preserves normal credentials after completed V2 initialization                 | Adapter orchestration with controlled SDK/storage |
| waits for clearing before persisting completion across repeated mount attempts | Adapter orchestration with controlled SDK/storage |
| propagates a failed marker read without clearing credentials                   | Adapter orchestration with controlled SDK/storage |
| leaves initialization incomplete when native clearing rejects                  | Adapter orchestration with controlled SDK/storage |
| retries safely after interruption between clearing and marker persistence      | Adapter orchestration with controlled SDK/storage |

### Mobile: pro-appearance.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-appearance.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-appearance.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `account-session-provider`, `theme-provider`, `tokens`, `index`.
- **Controlled:** selected router/Stack navigation boundary (see declared mock); `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double; installation initialization outside this scenario; official AsyncStorage Jest in-memory double; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                      | Actual proof family                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| projects current paid and gifted SDK-active rights without changing neutral context in %s (parameterized) | React component/provider integration (JavaScript) |
| keeps unknown account and unavailable SDK state neutral                                                   | React component/provider integration (JavaScript) |
| removes the previous accent at F05 %s before native logout settles (parameterized)                        | React component/provider integration (JavaScript) |
| clears gold during reassociation and keeps a failed current association neutral                           | React component/provider integration (JavaScript) |
| rejects previous-session gold through A → guest → A, including a late active read                         | React component/provider integration (JavaScript) |
| retains SDK-supplied cached active gold during failure, then removes it on reliable rights loss           | React component/provider integration (JavaScript) |
| follows live system appearance without resetting the mounted route or draft or restoring old gold         | React component/provider integration (JavaScript) |

### Mobile: pro-entry.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-entry.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-entry.test.tsx).

- **Real:** TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`, `profile-screen`, `sign-in-invitation-screen`, `query-client`, `theme-provider`, `pro-entry`, `pro-profile-entry`, `pro-provider`.
- **Controlled:** react-native-keyboard-controller upstream native test double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; real Router context/focus with controlled navigation commands; Sentry SDK entry/capture double
- **Limit:** Navigation assertions establish requested commands; the separate profile-navigation suite proves route departure. SDK UI doubles do not establish native paywall or customer-center presentation.
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                | Actual proof family                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| places a distinct Pro action before Privacy in the existing admitted profile        | React component/provider integration (JavaScript) |
| keeps Pro and its direct invitation behind ordinary F12 admission                   | React component/provider integration (JavaScript) |
| requests dismissal of the price-free invitation without consulting native offers    | React component/provider integration (JavaScript) |
| replaces the invitation with ordinary sign-in, without any continuation parameter   | React component/provider integration (JavaScript) |
| removes the guest presentation immediately when its F05 generation changes          | React component/provider integration (JavaScript) |
| requires a new explicit press after ordinary sign-in before requesting presentation | React component/provider integration (JavaScript) |

### Mobile: pro-offering.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-offering.test.ts](../apps/mobile/src/features/pro/__tests__/pro-offering.test.ts).

- **Real:** Owning handwritten modules: `pro-offering`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history.

| Asserted behavior / regression if violated (parameter rows included)                           | Actual proof family                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| selects only the configured V2 offering and preserves its native localized products            | Adapter orchestration with controlled SDK/storage |
| allows a new explicit purchase after cancellation or definite failure only for inactive rights | Direct purchase-policy unit                       |
| distinguishes missing configuration or offer from failed retrieval without a current fallback  | Adapter orchestration with controlled SDK/storage |
| does not encourage purchase for $status / $operation (parameterized)                           | Direct purchase-policy unit                       |

### Mobile: pro-presentation.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-presentation.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-presentation.test.tsx).

- **Real:** TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`, `query-client`, `theme-provider`, `pro-provider`, `pro-profile-entry`, `pro-presentation-screen`.
- **Controlled:** `expo-constants`; real Router context/focus with controlled navigation commands; RevenueCat public SDK operations replaced by controlled doubles; Paywall/native management component callbacks controlled by a React test component; Sentry SDK entry/capture double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Limit:** Navigation assertions establish requested commands; the separate profile-navigation suite proves route departure. SDK UI doubles do not establish native paywall or customer-center presentation.
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                         | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| passes the explicit V2 offering to the native host and requests dismissal once                               | React component/provider integration (JavaScript) |
| refuses a repeated native initiation and shows confirmed payment without claiming inactive rights are active | React component/provider integration (JavaScript) |
| routes %s rights to native management without looking up an offer (parameterized)                            | React component/provider integration (JavaScript) |
| removes old-session native content and rejects old purchase and dismissal callbacks                          | React component/provider integration (JavaScript) |
| prepares only the identified F10 Custom Action with close-before-navigation and no attached payload          | React component/provider integration (JavaScript) |
| keeps an %s offer on the profile with honest feedback and no fallback (parameterized)                        | React component/provider integration (JavaScript) |
| keeps management independently reachable and leaves absent F10 integration unbound                           | React component/provider integration (JavaScript) |
| rejects a late offering response after the opening session changes                                           | React component/provider integration (JavaScript) |
| presents native outcome %s without retrying payment (parameterized)                                          | React component/provider integration (JavaScript) |
| announces only current SDK-active ad-free activation from the completion callback                            | React component/provider integration (JavaScript) |
| explicitly retries a failed offer from the profile and then opens the official component                     | React component/provider integration (JavaScript) |
| does not reopen a cached paywall when a new explicit offering read fails                                     | React component/provider integration (JavaScript) |
| keeps a successfully empty offer visible when the next explicit read fails                                   | React component/provider integration (JavaScript) |
| allows B's explicit entry while A's abandoned offering read is still pending                                 | React component/provider integration (JavaScript) |

### Mobile: pro-profile-navigation.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-profile-navigation.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-profile-navigation.test.tsx).

- **Real:** Expo Router Stack/Link, actual route focus, Query client, Auth0 JavaScript SDK, account/Pro providers and ProProfileEntry.
- **Controlled:** Auth0 native bridge, installation initialization, RevenueCat public SDK I/O, Expo configuration and Sentry capture. A deferred offering read holds the native SDK boundary.
- **Limit/cleanup:** The route must remain /sporting after the held offer resolves. This proves JavaScript navigation/focus, not device gestures or RevenueCat compatibility. Unmount before clearing the client/restoring native doubles and environment; release the held read in finally.

| Asserted behavior / regression if violated (parameter rows included)                             | Actual proof family                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| keeps navigation usable during offering lookup and abandons the opening when profile loses focus | React component/provider integration (JavaScript) |

### Mobile: pro-purchase.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-purchase.test.ts](../apps/mobile/src/features/pro/__tests__/pro-purchase.test.ts).

- **Real:** Owning handwritten modules: `pro-session`, `pro-operations`.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario doubles reset before each case.

| Asserted behavior / regression if violated (parameter rows included)                                      | Actual proof family                                |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| maps native error %s to %s without inferring entitlement (parameterized)                                  | Direct SDK-error mapping unit                      |
| refuses duplicate starts and keeps a lost response uncertain after closure and verification               | Real application owners; controlled SDK operations |
| allows an explicit new purchase after documented SDK failure %s (parameterized)                           | Real application owners; controlled SDK operations |
| keeps confirmed payment separate from activation when verification is unavailable                         | Real application owners; controlled SDK operations |
| accepts the SDK completion's active entitlement immediately and preserves gifts on cancellation           | Real application owners; controlled SDK operations |
| rejects old starts and completions across A → guest → A and restarts from native state                    | Real application owners; controlled SDK operations |
| allows a new explicit acquisition after %s was recognized as paid active and then expired (parameterized) | Real application owners; controlled SDK operations |
| does not resolve %s from an independent gift that later expires (parameterized)                           | Real application owners; controlled SDK operations |

### Mobile: pro-refresh.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-refresh.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-refresh.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                       | Actual proof family                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| publishes newly read rights after %s (parameterized)                                                       | React component/provider integration (JavaScript) |
| removes native subscriptions when the provider unmounts                                                    | React component/provider integration (JavaScript) |
| rejects a detached read and callbacks after provider remount into the same business account                | React component/provider integration (JavaScript) |
| reads operation completion without waiting for an earlier read and rejects its late result                 | React component/provider integration (JavaScript) |
| keeps current verification busy when an older read fails                                                   | React component/provider integration (JavaScript) |
| treats an old listener payload as a signal to read B rather than publish A's rights                        | React component/provider integration (JavaScript) |
| reads SDK signals without waiting for an earlier read when current state becomes $expected (parameterized) | React component/provider integration (JavaScript) |
| ignores events during association and reads once after the current login settles                           | React component/provider integration (JavaScript) |
| clears local rights before native logout settles, without waiting for RevenueCat                           | React component/provider integration (JavaScript) |

### Mobile: pro-session.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-session.test.ts](../apps/mobile/src/features/pro/__tests__/pro-session.test.ts).

- **Real:** Owning handwritten modules: `accounts`, `pro-session`.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

| Asserted behavior / regression if violated (parameter rows included)                                 | Actual proof family                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| waits for a usable UUID before configuring once and reading current information                      | Real application owners; controlled SDK operations |
| preserves current login-supplied active rights if the following ordinary read fails                  | Real application owners; controlled SDK operations |
| finishes configuration before logging out when its account is erased                                 | Real application owners; controlled SDK operations |
| settles configuration before applying the latest target %s, skipping obsolete guests (parameterized) | Real application owners; controlled SDK operations |
| clears immediately on accepted erasure and waits for login before native logout                      | Real application owners; controlled SDK operations |
| waits for logout before login and skips an intermediate known account                                | Real application owners; controlled SDK operations |
| leaves a failed current association unavailable until explicit retry                                 | Real application owners; controlled SDK operations |
| rejects an old read across A → guest → %s (parameterized)                                            | Real application owners; controlled SDK operations |

### Mobile: pro-state.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-state.test.ts](../apps/mobile/src/features/pro/__tests__/pro-state.test.ts).

- **Real:** Owning handwritten modules: `accounts`, `pro-state`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

| Asserted behavior / regression if violated (parameter rows included)                             | Actual proof family      |
| ------------------------------------------------------------------------------------------------ | ------------------------ |
| gives guests no former entitlement or operation presentation                                     | Direct policy/state unit |
| requires usable-account establishment before consuming native state                              | Direct policy/state unit |
| does not publish rights while authentication is %s (parameterized)                               | Direct policy/state unit |
| keeps association %s distinct from inactivity (parameterized)                                    | Direct policy/state unit |
| waits for association when there is no evidence for this session                                 | Direct policy/state unit |
| keeps missing or failed native reads unavailable after an operation marked %s (parameterized)    | Direct policy/state unit |
| preserves SDK-active $label without recalculating dates or inferring paid origin (parameterized) | Direct policy/state unit |
| uses the active map rather than historical rights, other entitlements or subscription products   | Direct policy/state unit |
| preserves independent active rights when the operation is %s (parameterized)                     | Direct policy/state unit |
| does not invent Pro activation from an operation marked %s (parameterized)                       | Direct policy/state unit |
| rejects a late read and operation across logout then account %s (parameterized)                  | Direct policy/state unit |
| discards prior rights immediately on a direct account switch                                     | Direct policy/state unit |

### Mobile: pro-verification.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-verification.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-verification.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                          | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| does not turn an initial read failure or a failed retry into inactivity                                       | React component/provider integration (JavaScript) |
| keeps failed association unavailable, with explicit retry and independent support                             | React component/provider integration (JavaScript) |
| preserves SDK-active $label through failed verification and ordinary cancellation (parameterized)             | React component/provider integration (JavaScript) |
| accepts an SDK-inactive result without reconstructing historical rights                                       | React component/provider integration (JavaScript) |
| keeps %s operation feedback separate from active rights and never repeats a transaction (parameterized)       | React component/provider integration (JavaScript) |
| preserves known rights without a persistent error block after a definite purchase failure                     | React component/provider integration (JavaScript) |
| toasts a failed explicit verification from %s while preserving its uncertain business outcome (parameterized) | React component/provider integration (JavaScript) |

### Mobile: consultation-context.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/consultation-context.test.ts](../apps/mobile/src/features/sporting/__tests__/consultation-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `consultation-queries`, `session-generation`, `maintenance-bypass`, `query-client`, `api-fetch`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                       | Actual proof family                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| starts an ordinary public read with no account, credentials or entitlement dependency      | Generated transport + Query/session integration |
| keeps the current %s selection when an old response completes (parameterized)              | Generated transport + Query/session integration |
| rejects an old public-session completion even without native cancellation                  | Generated transport + Query/session integration |
| preserves refusal %i without a public retry or successful empty value (parameterized)      | Generated transport + Query/session integration |
| obtains credentials only for captured explicit bypass and lets F12 prepare each request    | Generated transport + Query/session integration |
| shares one in-flight read across consumers of the same F12 bypass intent                   | Generated transport + Query/session integration |
| rejects revoked bypass while credentials are pending                                       | Generated transport + Query/session integration |
| keeps a newer successful representation when cancelled credential work later refuses       | Generated transport + Query/session integration |
| rejects a late bypass body after intent ends and keeps ordinary context separate           | Generated transport + Query/session integration |
| keeps each calendar selector, category and grouping zone in its generated context          | Direct request/context policy                   |
| starts a fresh current read instead of deduplicating on the old %s promise (parameterized) | Generated transport + Query/session integration |
| rejects incoherent calendar selection before transport: %j (parameterized)                 | Direct request/context policy                   |

### Mobile: consultation-contract.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/consultation-contract.test.ts](../apps/mobile/src/features/sporting/__tests__/consultation-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`, `consultation-queries`, `session-generation`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                   | Actual proof family                             |
| -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| accepts additive public fields and preserves unknown contacts without source fallbacks | Generated/handwritten transport integration     |
| rejects malformed known club fields before Query admission: %j (parameterized)         | Generated transport + Query/session integration |
| preserves %s, date precision and exact observation time (parameterized)                | Generated/handwritten transport integration     |
| preserves known instants, explicit empty lists and nonnumeric special results          | Generated/handwritten transport integration     |
| rejects invalid known match values: %j (parameterized)                                 | Generated/handwritten transport integration     |
| accepts the required nullable gradient: %j (parameterized)                             | Generated/handwritten transport integration     |
| rejects missing or incomplete gradients: %j (parameterized)                            | Generated/handwritten transport integration     |
| keeps the %s document action and exact contributed version (parameterized)             | Generated/handwritten transport integration     |
| rejects an unknown document kind                                                       | Generated/handwritten transport integration     |
| preserves %s standings without fabricating positions or statistics (parameterized)     | Generated/handwritten transport integration     |
| rejects invalid standings availability: %j (parameterized)                             | Generated/handwritten transport integration     |
| bypasses JSON parsing for generated %s delivery (parameterized)                        | Generated/handwritten transport integration     |

### Mobile: sporting-pages.test.tsx

Source: [apps/mobile/src/features/sporting/**tests**/sporting-pages.test.tsx](../apps/mobile/src/features/sporting/__tests__/sporting-pages.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `query-client`, `theme-provider`, `account-session-provider`, `use-application-access`, `club-screen`, `team-screen`, `pool-screen`, `match-screen`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                      | Actual proof family                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| shares the newest/selected club season between teams and both calendar entries                            | React component/provider integration (JavaScript) |
| retains a valid season through failed retrieval and falls back only after successful disappearance        | React component/provider integration (JavaScript) |
| does not replace the selected season with a delayed former team response                                  | React component/provider integration (JavaScript) |
| keeps a clubless professional team and one follow action across distinct phase tabs                       | React component/provider integration (JavaScript) |
| opens exact club and pool identities without substituting a namesake                                      | React component/provider integration (JavaScript) |
| keeps the pool season and phase independent of later standings and map content                            | React component/provider integration (JavaScript) |
| presents unavailable and failed initial reads with opaque copy (%s) (parameterized)                       | React component/provider integration (JavaScript) |
| keeps match identities and independent missing sections without a zero score or guessed venue             | React component/provider integration (JavaScript) |
| opens only effective safe contacts and labels the club municipality separately                            | React component/provider integration (JavaScript) |
| preserves the %s result, published zero and special notation independently of absent sets (parameterized) | React component/provider integration (JavaScript) |
| retains exact published set points and separates the match venue from a club municipality                 | React component/provider integration (JavaScript) |
| keeps missing or unusable contacts inert                                                                  | React component/provider integration (JavaScript) |
| reports a refused external opening while keeping club information usable                                  | React component/provider integration (JavaScript) |
| hides retained club teams when their parent becomes unavailable                                           | React component/provider integration (JavaScript) |
| distinguishes an empty club season from a failed team read                                                | React component/provider integration (JavaScript) |
| suppresses a retained team after a current visibility refusal                                             | React component/provider integration (JavaScript) |
| keeps a team readable when its own logo fails                                                             | React component/provider integration (JavaScript) |
| retains a usable logo through a failed refresh and clears it after a current refusal                      | React component/provider integration (JavaScript) |
| shows a new valid logo after decoding the previous blob failed                                            | React component/provider integration (JavaScript) |
| retains the club teams when returning to a visited tab without an implicit reread                         | React component/provider integration (JavaScript) |
| shows the known match competition independently of a generic pool name                                    | React component/provider integration (JavaScript) |
| rereads common club information on a fresh opening while retaining the same QueryClient                   | React component/provider integration (JavaScript) |
| retries a previous common read failure on a fresh resource opening                                        | React component/provider integration (JavaScript) |
| does not resurrect a forbidden club after a later %s failure (parameterized)                              | React component/provider integration (JavaScript) |
| refreshes the active club team tab only and preserves the selected season                                 | React component/provider integration (JavaScript) |
| omits pull-to-refresh from a club calendar placeholder with no rechargeable content                       | React component/provider integration (JavaScript) |

### Mobile: sporting-resource-queries.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/sporting-resource-queries.test.ts](../apps/mobile/src/features/sporting/__tests__/sporting-resource-queries.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `consultation-queries`, `session-generation`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; global Query online/focus flags reset; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                   | Actual proof family                             |
| -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| keeps automatic and effective logo selections in distinct generated query entries      | Generated transport + Query/session integration |
| rejects an invalid %s representation before successful cache admission (parameterized) | Generated transport + Query/session integration |
| attempts an offline public read once without replaying on reconnect                    | Generated transport + Query/session integration |
| accepts an owner date without inventing a missing source time zone                     | Generated transport + Query/session integration |

### Mobile: sporting-time-inputs.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/sporting-time-inputs.test.ts](../apps/mobile/src/features/sporting/__tests__/sporting-time-inputs.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`, `session-generation`, `consultation-queries`, `sporting-time`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)                 | Actual proof family                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| keeps captured calendar days and continuation inputs while display uses the new zone | Generated transport + Query/session integration |

### Mobile: sporting-time-presentation.test.tsx

Source: [apps/mobile/src/features/sporting/**tests**/sporting-time-presentation.test.tsx](../apps/mobile/src/features/sporting/__tests__/sporting-time-presentation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `query-client`, `theme-provider`, `account-session-provider`, `use-application-access`, `match-summary`, `match-screen`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                           | Actual proof family                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| renders a readable unchanged date and meaningful unknown-time label                            | React component/provider integration (JavaScript) |
| updates retained match detail to the current phone zone on foreground return                   | React component/provider integration (JavaScript) |
| uses the rendering day when an initial match response crosses midnight                         | React component/provider integration (JavaScript) |
| keeps the summary pool heading informational instead of inventing a navigation control         | React component/provider integration (JavaScript) |
| announces both accepted scores on their team links when set detail is absent                   | React component/provider integration (JavaScript) |
| does not introduce an empty score section on an upcoming match without accepted result or sets | React component/provider integration (JavaScript) |

### Mobile: classification.test.tsx

Source: [apps/mobile/src/features/sporting-administration/**tests**/classification.test.tsx](../apps/mobile/src/features/sporting-administration/__tests__/classification.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `_layout`, `[id]`, `index`, `[id]`, `classification-selection`, `classification-selection-screen`, `presentation-screen`, `new`, `administration-screen`, `current-account`, `entry`, `discovery-state`, `query-client`, `theme-provider`, `use-application-access`, `account-session-provider`, `classification-screen`, `divisions-screen`.
- **Controlled:** Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; react-native-safe-area-context upstream native test double; react-native-keyboard-controller upstream native test double; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                       | Actual proof family                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| announces the pending division catalogue without inventing editable rows                                   | React component/provider integration (JavaScript) |
| submits a complete pool override after confirmation and excludes inactive choices                          | React component/provider integration (JavaScript) |
| refreshes classification data without replacing dirty choices or accepting a newer editing baseline        | React component/provider integration (JavaScript) |
| refreshes an empty division catalogue without changing its search or activity filter                       | React component/provider integration (JavaScript) |
| removes the complete pack default with explicit null                                                       | React component/provider integration (JavaScript) |
| retains dirty choices and displays conflicting scopes without applying a subset                            | React component/provider integration (JavaScript) |
| requires a successful current-state read after an uncertain write and preserves the draft                  | React component/provider integration (JavaScript) |
| uses an independent explicit activity command with the division revision                                   | React component/provider integration (JavaScript) |
| does not grant classification reads or writes to a lifecycle-only operator                                 | React component/provider integration (JavaScript) |
| refuses an incomplete override without opening confirmation or writing                                     | React component/provider integration (JavaScript) |
| keeps a failed recovery read blocking and never retries the uncertain write                                | React component/provider integration (JavaScript) |
| reconciles uncertain deactivation before offering explicit reactivation                                    | React component/provider integration (JavaScript) |
| retains a classification draft and uncertainty through actual protected-route removal                      | React component/provider integration (JavaScript) |
| admits the divisions administration destination for the lifecycle grant alone                              | React component/provider integration (JavaScript) |
| invalidates a previously loaded club team list after accepted %s (parameterized)                           | React component/provider integration (JavaScript) |
| distinguishes a stale revision and uses the reread revision only on explicit resubmission                  | React component/provider integration (JavaScript) |
| reauthorizes a held native confirmation after the current classification grant is revoked                  | React component/provider integration (JavaScript) |
| shows current activity on reentry for an operator with classification permission only                      | React component/provider integration (JavaScript) |
| filters division names within the selected activity catalogue without exposing lifecycle commands on cards | React component/provider integration (JavaScript) |
| clears the division search without resetting the selected activity catalogue                               | React component/provider integration (JavaScript) |
| opens division creation from the catalogue for a lifecycle-only operator                                   | React component/provider integration (JavaScript) |
| discards a held classification confirmation when its protected route is removed                            | React component/provider integration (JavaScript) |
| keeps classification choices but disables editing after a current resource refusal                         | React component/provider integration (JavaScript) |
| keeps an open selector's known choices visible and read-only after its grant is withdrawn                  | React component/provider integration (JavaScript) |
| keeps a refused division selector explicit when its authority is $authority (parameterized)                | React component/provider integration (JavaScript) |
| retains an empty division selector and reports an ordinary refresh failure through a toast                 | React component/provider integration (JavaScript) |
| keeps an open format selector unavailable through a refused then failed classification reread              | React component/provider integration (JavaScript) |
| refuses a held save confirmation after its current classification read is refused                          | React component/provider integration (JavaScript) |

### Mobile: prepare-sporting-logo.test.ts

Source: [apps/mobile/src/features/sporting-administration/**tests**/prepare-sporting-logo.test.ts](../apps/mobile/src/features/sporting-administration/__tests__/prepare-sporting-logo.test.ts).

- **Real:** Owning handwritten modules: `prepare-sporting-logo`.
- **Controlled:** `expo-file-system`; `expo-image-manipulator`
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history.

| Asserted behavior / regression if violated (parameter rows included)              | Actual proof family                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------- |
| preserves an admissible JPEG instead of refusing its larger lossless PNG encoding | Adapter orchestration with controlled SDK/storage |

### Mobile: presentation.test.tsx

Source: [apps/mobile/src/features/sporting-administration/**tests**/presentation.test.tsx](../apps/mobile/src/features/sporting-administration/__tests__/presentation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `_layout`, `[id]`, `entry`, `current-account`, `access-gate-screen`, `query-client`, `theme-provider`, `use-application-access`, `account-session-provider`, `discovery-state`, `presentation-screen`.
- **Controlled:** react-native-safe-area-context upstream native test double; react-native-keyboard-controller upstream native test double; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); `expo-image-picker`; `expo-image-manipulator`; `expo-file-system`; official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                            | Actual proof family                               |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| saves independent names and a nonsquare logo in one generated multipart PATCH                                   | React component/provider integration (JavaScript) |
| restores automatic artwork and clears only the selected name customization atomically                           | React component/provider integration (JavaScript) |
| edits pool names with complete JSON and no logo or contacts                                                     | React component/provider integration (JavaScript) |
| saves club presentation without a short-name field                                                              | React component/provider integration (JavaScript) |
| validates and saves division colors, gradient and name without touching activity                                | React component/provider integration (JavaScript) |
| preserves dirty fields after %s and requires a successful read before explicit retry (parameterized)            | React component/provider integration (JavaScript) |
| keeps a dirty draft and the editing revision during background refetch                                          | React component/provider integration (JavaScript) |
| refreshes the displayed logo, retaining technical failures but removing refused artwork until a successful read | React component/provider integration (JavaScript) |
| retains input and shows the invalid-image field refusal                                                         | React component/provider integration (JavaScript) |
| does not admit another action's permission %j (parameterized)                                                   | React component/provider integration (JavaScript) |
| retains a read-only draft when the current action grant is withdrawn                                            | React component/provider integration (JavaScript) |
| ignores a held native selection after the session is invalidated                                                | React component/provider integration (JavaScript) |
| opens the delivered administration entry for a presentation-only account during maintenance                     | React component/provider integration (JavaScript) |
| keeps a presentation-only original-target editor admitted during maintenance                                    | React component/provider integration (JavaScript) |
| enters the real protected route with only the presentation grant and confirms dirty departure                   | React component/provider integration (JavaScript) |
| retains the draft and uncertain outcome when a failed permission refresh removes the actual route               | React component/provider integration (JavaScript) |
| keeps an outstanding save busy across protected-route removal and records its later uncertainty                 | React component/provider integration (JavaScript) |
| rejects an invalid generated response before it replaces the accepted cache or dirty draft                      | React component/provider integration (JavaScript) |
| rejects a delayed save result after the session has ended                                                       | React component/provider integration (JavaScript) |
| creates an active division through the existing atomic presentation form with the lifecycle grant alone         | React component/provider integration (JavaScript) |
| rereads divisions after an uncertain creation and keeps the draft while identifying an existing name            | React component/provider integration (JavaScript) |
| keeps lifecycle independent at the end of the division editor for a lifecycle-only operator                     | React component/provider integration (JavaScript) |
| preserves unsaved presentation values while an independent activity response advances the division revision     | React component/provider integration (JavaScript) |
| restores automatic division paint without sending a separate color or lifecycle command                         | React component/provider integration (JavaScript) |
| preserves an empty invalid gradient stop when another stop changes                                              | React component/provider integration (JavaScript) |
| deletes a removed logo copy after the picker loan was released                                                  | React component/provider integration (JavaScript) |
| keeps a sent logo until upload settlement after session invalidation                                            | React component/provider integration (JavaScript) |
| deletes a prepared logo completed after its form unmounts                                                       | React component/provider integration (JavaScript) |
| ignores the retained %s confirmation after protected-route removal and readmission (parameterized)              | React component/provider integration (JavaScript) |
| releases only the replaced logo copy while the new draft remains usable                                         | React component/provider integration (JavaScript) |
| shares one raw division list across creation and navigation and refreshes it after creation                     | React component/provider integration (JavaScript) |
| keeps the shared division read authorized when creation loses its separate lifecycle grant                      | React component/provider integration (JavaScript) |
| keeps an uncertain save blocked after explicitly discarding its draft and opening a fresh editor                | React component/provider integration (JavaScript) |
| executes a confirmed division activity once when the native callback is delivered twice                         | React component/provider integration (JavaScript) |
| preserves a different opaque revision read during a delayed accepted presentation save                          | React component/provider integration (JavaScript) |
| retains a replacement division draft when the abandoned creation succeeds later                                 | React component/provider integration (JavaScript) |

### Mobile: sporting-contract.test.ts

Source: [apps/mobile/src/features/sporting-administration/**tests**/sporting-contract.test.ts](../apps/mobile/src/features/sporting-administration/__tests__/sporting-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)             | Actual proof family                             |
| -------------------------------------------------------------------------------- | ----------------------------------------------- |
| preserves a division gradient with %s (parameterized)                            | Generated/handwritten transport integration     |
| rejects a division response with %s (parameterized)                              | Generated/handwritten transport integration     |
| preserves %s short-name presence in a generated response (parameterized)         | Generated/handwritten transport integration     |
| retains %s in the generated replacement request (parameterized)                  | Generated/handwritten transport integration     |
| rejects an omitted required nullable name in a generated response                | Generated/handwritten transport integration     |
| accepts additive sporting response fields before Query admission                 | Generated transport + Query/session integration |
| rejects a sporting %s before Query admission (parameterized)                     | Generated transport + Query/session integration |
| preserves a safe sporting refusal without caching a successful table             | Generated transport + Query/session integration |
| selects automatic team artwork independently through the generated binary client | Generated/handwritten transport integration     |

### Mobile: support-generated.test.ts

Source: [apps/mobile/src/features/support/**tests**/support-generated.test.ts](../apps/mobile/src/features/support/__tests__/support-generated.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)                         | Actual proof family                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| rejects Unicode whitespace-only %s at the generated request boundary (parameterized)         | Generated schema validation only            |
| enforces the approved UTF-16 boundary for %s (parameterized)                                 | Generated schema validation only            |
| sends JSON metadata and %i repeated image parts through the generated client (parameterized) | Generated/handwritten transport integration |
| rejects a malformed success before resolving (parameterized)                                 | Generated/handwritten transport integration |

### Mobile: api-fetch.test.ts

Source: [apps/mobile/src/shared/api/**tests**/api-fetch.test.ts](../apps/mobile/src/shared/api/__tests__/api-fetch.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `api-fetch`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

| Asserted behavior / regression if violated (parameter rows included)           | Actual proof family                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------- |
| classifies mutation uncertainty for %s (parameterized)                         | Direct error-policy unit                        |
| validates the generated response exactly once and accepts additive nested data | Generated/handwritten transport integration     |
| rejects %s before Query success (parameterized)                                | Generated transport + Query/session integration |
| rejects malformed JSON %s (parameterized)                                      | Generated/handwritten transport integration     |
| requires a success schema for JSON                                             | Generated/handwritten transport integration     |
| preserves an empty notification list                                           | Generated/handwritten transport integration     |
| rejects a forbidden null notification cursor                                   | Generated/handwritten transport integration     |
| rejects $invalidField through the generated consumer (parameterized)           | Generated/handwritten transport integration     |
| parses errors through the problem profile without validating them as success   | Generated/handwritten transport integration     |
| keeps malformed error body %p out of safe errors (parameterized)               | Generated/handwritten transport integration     |
| handles the generated 204 mutation without JSON or replay                      | Generated/handwritten transport integration     |
| rejects an unexpected 204 for a generated JSON mutation without replay         | Generated/handwritten transport integration     |
| rejects an unexpected 204 for a generated binary request                       | Generated/handwritten transport integration     |
| returns binary content only for a declared binary request                      | Generated/handwritten transport integration     |
| rejects non-JSON when the generated consumer requires JSON                     | Generated/handwritten transport integration     |
| refuses unsafe backend reference %s (parameterized)                            | Generated/handwritten transport integration     |
| resolves a backend URI reference on the configured origin                      | Generated/handwritten transport integration     |
| preserves caller cancellation without replay                                   | Generated/handwritten transport integration     |
| rejects cancellation after the body completes before admitting a response      | Generated/handwritten transport integration     |
| rejects an invalid timeout of %s before sending (parameterized)                | Generated/handwritten transport integration     |
| bounds an uncertain write without replay                                       | Generated/handwritten transport integration     |

### Mobile: image-field-examples.test.tsx

Source: [apps/mobile/src/development/**tests**/image-field-examples.test.tsx](../apps/mobile/src/development/__tests__/image-field-examples.test.tsx).

- **Real:** ImageFieldExamplesScreen, theme/feedback, image selection, prepared-preview state and owned-image disposal.
- **Controlled:** Expo image-picker and File read/delete I/O; Sentry capture. The native byte read is a controlled promise.
- **Limit/cleanup:** The example retains its preview after releasing the picker copy and forwards a data URI to the native image renderer. Jest does not decode native pixels or read/delete actual files. RNTL unmount cleanup disposes the mounted tree.

| Asserted behavior / regression if violated (parameter rows included)              | Actual proof family                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------- |
| keeps the demonstration preview in memory after its picker cache copy is released | React component/provider integration (JavaScript) |

### Mobile: image-field.test.tsx

Source: [apps/mobile/src/shared/components/**tests**/image-field.test.tsx](../apps/mobile/src/shared/components/__tests__/image-field.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `theme-provider`, `image-field`, `use-image-selection` and owned-image disposal. The local controlled owner only forwards the public value and selection contract.
- **Controlled:** Expo image-picker and File I/O; Sentry capture. Native selection results, file existence and deletion are controlled.
- **Limit:** Caller validation is supplied as a public error, not reimplemented in the test. Image source/event assertions do not decode native pixels or prove filesystem behavior.
- **Isolation/cleanup:** scenario doubles reset before each case; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)                                    | Actual proof family                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| keeps image selection explicit after validation instead of promising a retry                            | React component/provider integration (JavaScript) |
| loans native image copies without imposing cropping and releases them after acceptance                  | React component/provider integration (JavaScript) |
| forwards caller-owned native cropping for $operation (parameterized)                                    | React component/provider integration (JavaScript) |
| opens one native picker when selection is requested twice before a render                               | React component/provider integration (JavaScript) |
| respects the caller's selection admission and allows a later explicit attempt                           | React component/provider integration (JavaScript) |
| preserves the existing image when native selection is cancelled                                         | React component/provider integration (JavaScript) |
| keeps selection usable after native refusal/failure %s without disclosing provider text (parameterized) | React component/provider integration (JavaScript) |
| opens a full-screen preview and closes it without changing caller values                                | React component/provider integration (JavaScript) |
| replaces a specific image and delegates automatic-logo restoration meaning                              | React component/provider integration (JavaScript) |
| prioritizes multiple additions over native cropping but allows cropping a single replacement            | React component/provider integration (JavaScript) |
| preserves the controlled image when its owner supplies a validation error                               | React component/provider integration (JavaScript) |
| blocks reselection during owner preparation and recovers safely from rejection                          | React component/provider integration (JavaScript) |
| prevents all image actions when the caller disables the field                                           | React component/provider integration (JavaScript) |
| ignores a native selection returned after the field unmounts                                            | React component/provider integration (JavaScript) |
| shows accepted caller values and removes them only when the owner updates                               | React component/provider integration (JavaScript) |
| keeps preview dismissal available when native image decoding fails                                      | React component/provider integration (JavaScript) |
| starts a new preview attempt when an image URI returns or the viewer reopens                            | React component/provider integration (JavaScript) |
| retains the caller's image choice after an empty-field validation error                                 | React component/provider integration (JavaScript) |
| preserves a borrowed or non-cache picker source: %s (parameterized)                                     | React component/provider integration (JavaScript) |
| releases every delivered cache copy after preparation settles even if the field unmounted               | React component/provider integration (JavaScript) |

### Mobile: sentry-native.test.ts

Source: [apps/mobile/src/shared/observability/**tests**/sentry-native.test.ts](../apps/mobile/src/shared/observability/__tests__/sentry-native.test.ts).

- **Real:** initializeSentry, real Sentry SDK initialization/scope/filter/flush path. Owning handwritten modules: `sentry`.
- **Controlled:** Sentry native bridge only; Sentry import-time maintenance timer controlled; SDK remains real
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown; real Sentry client closed and scope breadcrumbs cleared.

| Asserted behavior / regression if violated (parameter rows included)                  | Actual proof family                    |
| ------------------------------------------------------------------------------------- | -------------------------------------- |
| keeps release capture disabled and discards breadcrumbs before native synchronization | Real JS SDK → controlled native bridge |

### Mobile: sentry.test.ts

Source: [apps/mobile/src/shared/observability/**tests**/sentry.test.ts](../apps/mobile/src/shared/observability/__tests__/sentry.test.ts).

- **Real:** initializeSentry and its configured sanitization callbacks, invoked directly. Owning handwritten modules: `sentry`.
- **Controlled:** Sentry SDK entry/capture double
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown.

| Asserted behavior / regression if violated (parameter rows included)                 | Actual proof family        |
| ------------------------------------------------------------------------------------ | -------------------------- |
| excludes advertising choices, location and private support data from diagnostics     | Direct adapter/filter unit |
| retains only finite Pro operation context while stripping raw provider diagnostics   | Direct adapter/filter unit |
| keeps safe error context for %s (parameterized)                                      | Direct adapter/filter unit |
| keeps reporting disabled with development=$development and dsn=$dsn (parameterized)  | Direct adapter/filter unit |
| rejects a bundle reference not normalized by the SDK: %s (parameterized)             | Direct adapter/filter unit |
| bounds native capture while preserving SDK-owned crash initialization                | Direct adapter/filter unit |
| drops a free-form message without an exception                                       | Direct adapter/filter unit |
| removes attachments carried outside the JavaScript event                             | Direct adapter/filter unit |
| replaces free-form exception names and mechanisms without losing failure coordinates | Direct adapter/filter unit |

### Mobile: query-client.test.ts

Source: [apps/mobile/src/shared/query/**tests**/query-client.test.ts](../apps/mobile/src/shared/query/__tests__/query-client.test.ts).

- **Real:** TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** fresh Query client per case; Query client cleared in teardown; fake timers returned to real timers; global Query online/focus flags reset.

| Asserted behavior / regression if violated (parameter rows included)               | Actual proof family                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| fails an offline read without queueing it, then allows an explicit retry           | Real TanStack Query observer integration |
| does not replay a failed write (online: %s) (parameterized)                        | Real TanStack Query observer integration |
| keeps stale data without an implicit %s refresh (parameterized)                    | Real TanStack Query observer integration |
| retains data and its timestamp after a failed refresh (online: %s) (parameterized) | Real TanStack Query observer integration |
| allows a feature-approved focus refresh only after its chosen freshness expires    | Real TanStack Query observer integration |
| does not implicitly retry or refresh a remounted %s query (parameterized)          | Real TanStack Query observer integration |

### Mobile: query-root.test.tsx

Source: [apps/mobile/src/shared/query/**tests**/query-root.test.tsx](../apps/mobile/src/shared/query/__tests__/query-root.test.tsx).

- **Real:** TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `account-session-provider`, `query-client`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles; selected router/Stack navigation boundary (see declared mock); Sentry SDK entry/capture double; Auth0 native bridge only; SDK provider/hooks/error classes remain real; official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

| Asserted behavior / regression if violated (parameter rows included)      | Actual proof family                               |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| scopes the route cache to the lifetime of one root                        | React component/provider integration (JavaScript) |
| removes private cache at local invalidation even when remote logout fails | React component/provider integration (JavaScript) |

### Mobile: session-isolation.test.ts

Source: [apps/mobile/src/shared/query/**tests**/session-isolation.test.ts](../apps/mobile/src/shared/query/__tests__/session-isolation.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `session-generation`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers.

| Asserted behavior / regression if violated (parameter rows included)                              | Actual proof family                             |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| removes old private queries across A → guest → %s despite late network completion (parameterized) | Generated transport + Query/session integration |
| rejects a late %s result even when the caller supplied no cancellation signal (parameterized)     | Generated/handwritten transport integration     |
| rejects a request prepared by an old session before sending it                                    | Generated/handwritten transport integration     |
| checks the session after reading the body (session changed: %s) (parameterized)                   | Generated/handwritten transport integration     |
