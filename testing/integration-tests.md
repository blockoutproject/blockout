# Integration scenario inventory

This navigation reference describes suite boundaries, controlled I/O and lifecycle limits. Executable tests own method names, parameter rows and assertions; the owning specifications define acceptance. Exact runs, counts and revision-scoped qualifications belong to their existing delivery evidence. No synchronized method catalogue or generated inventory is required.

The [canonical patterns](README.md) own setup, naming and lifecycle conventions. This inventory audits the current handwritten integration boundaries, including correctly classified unit scenarios inside the collector and mobile boundary families. Parameterized inputs and regression assertions remain in the linked executable source. A listed boundary is not a claim that its tests ran or that provider/native qualification passed.

## Process, scheduling configuration and diagnostics

### AccessSettingsConsumerProcessIntegrationTest

[Source](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumerProcessIntegrationTest.java). Real: operating-system process tree, `ProcessHandle` and the consumer fixture's cleanup. Controlled: a shell with an idle child replaces npm/Jest; no Spring, PostgreSQL or HTTP. The child's `sleep` keeps it alive until termination and is not an assertion delay. Cleanup forcibly terminates both processes in `finally` and clears the intentional interrupt.

### SearchProjectionConfigurationIntegrationTest

[Source](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionConfigurationIntegrationTest.java). Real: minimal Spring web/non-web contexts, production projection configuration, native scheduler registration, property validation and Micrometer registry. Controlled: `ProjectSearch` execution. Each runner closes its scheduler/context; no database, search engine or execution-timing claim.

### SearchDiagnosticsIntegrationTest

[Source](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchDiagnosticsIntegrationTest.java). Real: Boot ECS logging setup/encoder, captured log output, Micrometer meters, handwritten scheduler/writer. Controlled: task execution, `ProjectSearch`, OpenSearch client or transport failures carrying synthetic private strings. The narrow non-web Boot context owns only logging; each case owns its registry/doubles. These are logging/metric integration proofs, not live engine, SQL or scheduler-concurrency proofs.

## HTTP, generated server contracts and serialization

### `AccessContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/AccessContractJsonTest.java).

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

### `AccessContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/AccessContractWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `AccessContractWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `AdministrationSettingsWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/AdministrationSettingsWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `AdministrationSettingsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `AccessSettingsExceptionHandler`, `AccessApiMapperImpl`, `UpdateAccessSettings`, `ReadAccessConfiguration`.

**Controlled:** Mockito: `CurrentAccount`, `ActionAuthorization`, `AccessSettingsStore`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `MaintenanceAdmissionWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `MaintenanceAdmissionWebMvcTest.Probe`; Mockito: `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `AccountAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountAccessWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `AccountsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `AccountExceptionHandler`, `ReadAccount`, `AccountApiMapperImpl`, `AccountRequest`.

**Controlled:** Mockito: `AccountStore`, `EstablishAccount`, `ChangeAccountProfile`, `ProfilePhotoPreparation`, `CurrentPermissions`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `AccountProfileWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/accounts/api/AccountProfileWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `AccountsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `AccountExceptionHandler`, `ReadAccount`, `AccountApiMapperImpl`, `AccountRequest`, `ChangeAccountProfile`, `ProfilePhotoProcessor`.

**Controlled:** Mockito: `AccountStore`, `EstablishAccount`, `CurrentPermissions`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `CollectionContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/CollectionContractWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectorOperationsController`, `HttpConfiguration`, `SecurityConfiguration`, `CollectionApiMapperImpl`, `CollectionExceptionHandler`.

**Controlled:** Mockito: `ObserveCollectionSource`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptSourceValidation`, `AdmitCollectionCycle`, `RecordCollectionResults`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `CollectionControlWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/CollectionControlWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionControlsController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `CollectionApiMapperImpl`.

**Controlled:** Mockito: `AccountAccess`, `ChangeCollectionControls`, `ReadCollectionConfiguration`, `CloseCollectionSeason`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `CollectionResultsWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/CollectionResultsWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionResultsController`, `CollectorOperationsController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `CollectionApiMapperImpl`, `CollectionExceptionHandler`.

**Controlled:** Mockito: `ObserveCollectionSource`, `RecordCollectionResults`, `ReadCollectionConfiguration`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptSourceValidation`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SourcePreparationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/collection/api/SourcePreparationWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionSourcesController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `CollectionApiMapperImpl`, `CollectionExceptionHandler`, `IngestionBodyLimitAdvice`.

**Controlled:** Mockito: `PrepareCollectionSources`, `ReadCollectionConfiguration`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `HealthEndpointIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/HealthEndpointIntegrationTest.java).

**Real:** Native Boot Actuator health aggregation, readiness state, production security chains and MVC HTTP mapping.

**Controlled:** Controlled database `HealthIndicator`; ordinary `MaintenanceAdmission` outside operational routes.

**Limit/cleanup:** No JDBC/SQL proof; `HealthIntegrationTest` owns actual PostgreSQL health. Restores readiness after each scenario.

### `LoggingIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/LoggingIntegrationTest.java).

**Real:** Boot logging initialization, shipped structured ECS console encoder, SLF4J/MDC emission.

**Controlled:** Synthetic sensitive fields and exceptions; no external log exporter.

**Limit/cleanup:** Console schema/redaction only; no ingestion/export delivery qualification.

### `SecurityPropertiesIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/SecurityPropertiesIntegrationTest.java).

**Real:** Native Spring property binder and Bean Validation for `SecurityProperties`; shipped YAML configuration.

**Controlled:** Explicit synthetic environment/properties; host secrets excluded.

**Limit/cleanup:** Configuration binding/startup refusal only; no HTTP/database/provider.

### `SecurityWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/config/SecurityWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`.

**Controlled:** test-only adapter endpoint(s) `SecurityWebMvcTest.BoundaryAdapter`; loopback synthetic JWKS authority; actual signature decoding runs.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `ContributionAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionAccessWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `CurrentAccount`, `CurrentPermissions`, `ActionAuthorization`, `MaintenanceAdmission`, `ContributionRequest`.

**Controlled:** test-only adapter endpoint(s) `ContributionAccessWebMvcTest.AccessAdapter`; Mockito: `AccountAccess`, `PermissionStore`, `AccessSettingsStore`, `PlatformTransactionManager`; loopback synthetic JWKS authority; actual signature decoding runs.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `ContributionContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionContractJsonTest.java).

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** Mockito generated interface target solely for native executable-constraint metadata validation.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

### `ContributionContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionContractWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `ContributionContractWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `ContributionSubmissionWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionSubmissionWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `ContributionsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `ContributionExceptionHandler`, `ContributionRequest`, `CurrentAccount`, `MaintenanceAdmission`, `ActionAuthorization`, `CurrentPermissions`, `ContributionApiMapperImpl`, `SubmitModeratedContribution`.

**Controlled:** Mockito: `SubmitContribution`, `ReadOwnContributions`, `AccountAccess`, `AccessSettingsStore`, `PermissionStore`, `PlatformTransactionManager`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `FollowAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowAccessWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `FollowingRequest`, `ContractEnumBinding`, `CurrentAccount`, `MaintenanceAdmission`, `ActionAuthorization`, `CurrentPermissions`.

**Controlled:** production FollowingController with mocked application ports and real generated mappers; Mockito: `AccountAccess`, `AccessSettingsStore`, `PermissionStore`, `PlatformTransactionManager`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `FollowStateWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowStateWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `FollowingController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `FollowingExceptionHandler`, `FollowingRequest`, `CurrentAccount`, `MaintenanceAdmission`, `ActionAuthorization`, `CurrentPermissions`.

**Controlled:** Mockito: `FollowState`, `AccountAccess`, `AccessSettingsStore`, `PermissionStore`, `PlatformTransactionManager`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `FollowingContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowingContractJsonTest.java).

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

### `FollowingContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/following/api/FollowingContractWebMvcTest.java).

**Real: FollowingController, generated interface/DTOs, production MapStruct mappers, Spring MVC validation/enum binding and real HTTP argument binding. Controlled:** production FollowingController with mocked application ports and real generated mappers; Mockito: `CurrentAccount`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `LegacyApplicationStatusUnavailableWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusUnavailableWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `LegacyApplicationStatusController`, `HttpConfiguration`, `SecurityConfiguration`, `LegacyApplicationStatusMapperImpl`.

**Controlled:** .

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `LegacyApplicationStatusWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `LegacyApplicationStatusController`, `HttpConfiguration`, `SecurityConfiguration`, `LegacyApplicationStatusMapperImpl`.

**Controlled:** Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `LegacyRetirementPropertiesIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/legacy/infrastructure/LegacyRetirementPropertiesIntegrationTest.java).

**Real:** Native Spring property binder and Bean Validation for `LegacyRetirementProperties`.

**Controlled:** Explicit synthetic environment/properties; host secrets excluded.

**Limit/cleanup:** Configuration binding/startup refusal only; no HTTP/database/provider.

### `NotificationContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractJsonTest.java).

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

### `NotificationContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`, `NotificationRequest`.

**Controlled:** test-only adapter endpoint(s) `NotificationContractWebMvcTest.Adapter`; Mockito: `CurrentAccount`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `NotificationsWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationsWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `NotificationsController`, `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `NotificationRequest`, `NotificationApiMapperImpl`, `ConsultationApiMapperImpl`, `NotificationExceptionHandler`.

**Controlled:** Mockito: `CurrentAccount`, `AccountAccess`, `MaintenanceAdmission`, `ReadInbox`, `MarkNotificationRead`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `NotificationAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationAccessWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SecurityConfiguration`, `HttpConfiguration`, `ApiExceptionHandler`, `CurrentAccount`, `AccountAccess`, `NotificationRequest`.

**Controlled:** test-only adapter endpoint(s) `NotificationAccessWebMvcTest.Adapter`; Mockito: `AccountStore`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal; loopback synthetic JWKS authority; actual signature decoding runs.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `NotificationRetentionConfigurationIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/notifications/infrastructure/NotificationRetentionConfigurationIntegrationTest.java).

**Real:** Native config data, scheduled-annotation processor, shipped `NotificationRetentionConfiguration`, CronTrigger calculation.

**Controlled:** `TaskScheduler` and `PurgeNotifications`; host environment/system properties removed.

**Limit/cleanup:** Registration/callback/UTC trigger calculation only; no wall-clock execution or SQL purge.

### `DiscoveryAccessWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryAccessWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `DiscoveryController`, `SecurityConfiguration`, `HttpConfiguration`, `ContractEnumBinding`, `ApiExceptionHandler`, `CurrentPermissions`, `ActionAuthorization`, `MaintenanceAdmission`, `DiscoveryRequest`, `DiscoveryApiMapperImpl`, `ConsultationApiMapperImpl`.

**Controlled:** Mockito: `AccountAccess`, `PermissionStore`, `AccessSettingsStore`, `PlatformTransactionManager`, `ReadSearch`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `DiscoveryContractWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryContractWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ContractEnumBinding`, `ApiExceptionHandler`, `DiscoveryRequest`.

**Controlled:** test-only adapter endpoint(s) `DiscoveryContractWebMvcTest.Adapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `DiscoveryWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `DiscoveryController`, `DiscoveryRequest`, `ContractEnumBinding`, `DiscoveryApiMapperImpl`, `ConsultationApiMapperImpl`, `DiscoveryExceptionHandler`, `ApiExceptionHandler`.

**Controlled:** Mockito: `ReadSearch`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `ContractBoundaryWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/shared/http/ContractBoundaryWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `ContractBoundaryWebMvcTest.BindingAdapter`, `ContractBoundaryWebMvcTest.AccountAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `ContractPresenceWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/shared/http/ContractPresenceWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `ContractPresenceWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `HttpErrorOwnershipWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/shared/http/HttpErrorOwnershipWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `CollectionResultsController`, `SportingClassificationController`, `HttpConfiguration`, `CollectionApiMapperImpl`, `SportingAdministrationMapperImpl`.

**Controlled:** Mockito: `CurrentAccount`, `ReadCollectionConfiguration`, `ReadSportingConfiguration`, `ChangeSportingClassification`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `ConsultationContractJsonTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/ConsultationContractJsonTest.java).

**Real:** Jackson with production `HttpConfiguration`, generated DTOs/enums and native Bean Validation; real `ConsultationApiMapper`.

**Controlled:** None; concrete synthetic DTOs.

**Limit/cleanup:** No MVC dispatch, persistence or automatic outbound validation. Explicit response validation is called by the test.

### `DivisionAdministrationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/DivisionAdministrationWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `DivisionAdministrationController`, `SportingPresentationValidator`, `ValidateSportingImage`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `SportingAdministrationMapperImpl`, `SportingExceptionHandler`.

**Controlled:** Mockito: `CurrentPermissions`, `ChangeDivisionLifecycle`, `ReadSportingConfiguration`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SportingClassificationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingClassificationWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SportingClassificationController`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `SportingAdministrationMapperImpl`, `SportingExceptionHandler`.

**Controlled:** Mockito: `ChangeSportingClassification`, `ReadSportingConfiguration`, `AccountAccess`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SportingIngestionWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingIngestionWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SportingIngestionController`, `ValidateSportingImage`, `HttpConfiguration`, `SecurityConfiguration`, `ApiExceptionHandler`, `CollectionExceptionHandler`, `SportingExceptionHandler`, `SportingObservationMapperImpl`, `SportingPresentationMapperImpl`, `SportingObservationValidator`, `SportingPresentationValidator`, `IngestionBodyLimitAdvice`.

**Controlled:** Mockito: `AcceptMatchObservation`, `AcceptCalendar`, `AcceptCatalog`, `AcceptStandings`, `AcceptClubDetails`, `AcceptClubLocality`, `AcceptSourceImage`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SportingObservationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingObservationWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`, `SportingObservationMapperImpl`.

**Controlled:** test-only adapter endpoint(s) `SportingObservationWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SportingPresentationMultipartIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingPresentationMultipartIntegrationTest.java).

**Real:** Loopback HTTP, native servlet multipart PATCH parser, production presentation controller, generated binding, validators and mappers.

**Controlled:** Mockito: `CurrentPermissions`, `CurrentAccount`, `ReadSportingConfiguration`, `ChangeSportingPresentation`, `ChangeClubContacts`; permissive test security.

**Limit/cleanup:** Servlet parsing and size enforcement only; no committed presentation effects or production authorization.

### `SportingPresentationWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingPresentationWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `SportingPresentationController`, `SportingPresentationValidator`, `ValidateSportingImage`, `HttpConfiguration`, `SecurityConfiguration`, `CurrentAccount`, `SportingAdministrationMapperImpl`, `SportingPresentationMapperImpl`, `SportingObservationMapperImpl`, `SportingExceptionHandler`.

**Controlled:** Mockito: `CurrentPermissions`, `AccountAccess`, `ChangeSportingPresentation`, `ReadSportingConfiguration`, `ChangeClubContacts`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SportingResourcesWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingResourcesWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `ConsultationController`, `HttpConfiguration`, `ContractEnumBinding`, `SecurityConfiguration`, `ConsultationApiMapperImpl`, `SportingExceptionHandler`, `ApiExceptionHandler`.

**Controlled:** Mockito: `ReadSportingResources`, `MaintenanceAdmission`; Spring Security prevalidated JWT principal.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SupportGeneratedWebMvcTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/api/SupportGeneratedWebMvcTest.java).

**Real:** MVC dispatcher, Jackson/Bean Validation, generated DTO/interface mappings; `HttpConfiguration`, `ApiExceptionHandler`.

**Controlled:** test-only adapter endpoint(s) `SupportGeneratedWebMvcTest.BindingAdapter`; security filters disabled.

**Limit/cleanup:** No database/commit/servlet socket/provider proof.

### `SupportMultipartIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/api/SupportMultipartIntegrationTest.java).

**Real:** Loopback HTTP, native embedded servlet multipart parser, generated support binding, `HttpConfiguration`, error translation.

**Controlled:** Test-only generated support adapter and permissive test security; synthetic image and JSON bytes.

**Limit/cleanup:** Exact servlet file/request size proof; no support delivery, production authentication or provider.

### `SupportConfigurationDiagnosticsIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/infrastructure/SupportConfigurationDiagnosticsIntegrationTest.java).

**Real:** SpringApplication startup, native support property binding/validation, shipped logging/failure diagnostics.

**Controlled:** Synthetic invalid destination configuration.

**Limit/cleanup:** Startup diagnostic redaction only; no GitHub/Discord request.

### `SupportPropertiesIntegrationTest`

[Source](../apps/backend/src/test/java/com/blockout/backend/support/infrastructure/SupportPropertiesIntegrationTest.java).

**Real:** Native Spring property binder and Bean Validation for `SupportProperties and MultipartProperties`; shipped YAML configuration.

**Controlled:** Explicit synthetic environment/properties; host secrets excluded.

**Limit/cleanup:** Configuration binding/startup refusal only; no HTTP/database/provider.

## PostgreSQL, JPA, transactions and concurrency

All 48 Spring/PostgreSQL suites use the context-owned container and native property registrar in `PostgresTestConfiguration`, directly or through `ContributionScenario`. Each class closes its context with `@DirtiesContext(AFTER_CLASS)`, so datasource pools and application consumers close before PostgreSQL. Scenario fixtures reset the class's disposable data; explicit transactions, lock observations and failure hooks retain their local cleanup. `DatabaseConfigurationIntegrationTest` is the direct startup/role runner exception: JUnit owns its container, and every manually started application context closes explicitly before that container.

The inventory includes unchanged suites to distinguish retained SQL evidence from reclassified tests. `SearchTraversalIntegrationTest` and `SearchProjectionIntegrationTest` integrate both PostgreSQL and the disposable TLS OpenSearch engine; they are inventoried with external clients because that owner maintains their engine lifecycle. Pure HTTP/MVC/JSON suites belong to the HTTP inventory.

### AccountMaintenanceAdmissionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/api/AccountMaintenanceAdmissionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/api/AccountMaintenanceAdmissionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc controller/security/admission chain. Controlled/absent boundaries: PrincipalReader returns synthetic evidence; jwt() supplies a validated principal; admission spy observes real transaction boundaries.

### MaintenanceAdmissionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/api/MaintenanceAdmissionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `MaintenanceAdmission`; MockMvc controller/security/admission chain. Controlled/absent boundaries: jwt() supplies validated principals; real JWT decoding belongs to the security boundary suite.

### AccessSettingsConsumersIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumersIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumersIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AccountStore`; embedded HTTP server, generated mobile client/form components via the existing Jest runner, real JWT decoder with loopback JWKS. Controlled/absent boundaries: native credential I/O; local synthetic JWT issuer; opt-in BLOCKOUT_ACCESS_CONSUMERS_TEST=true, no Auth0 or store runtime.

### AccessSettingsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `UpdateAccessSettings`, `ReadAccessConfiguration`, `AccessSettingsStore`, `AccountStore`. Controlled/absent boundaries: none.

### PermissionPersistenceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/access/infrastructure/PermissionPersistenceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/PermissionPersistenceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AccountStore`, `AccountAccess`, `CurrentPermissions`, `ActionAuthorization`, `SportingStore`. Controlled/absent boundaries: none.

### ChangeAccountProfileIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/application/ChangeAccountProfileIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/application/ChangeAccountProfileIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeAccountProfile`, `AccountStore`, `ReadAccount`, `EstablishAccount`; MockMvc multipart handling for the photo transaction scenario. Controlled/absent boundaries: PrincipalReader and MaintenanceAdmission; photo spy executes real ImageIO and checks transaction absence.

### EstablishAccountIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/application/EstablishAccountIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/application/EstablishAccountIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `EstablishAccount`, `ChangeAccountProfile`; real AccountStore spy delegates all SQL operations. Controlled/absent boundaries: PrincipalReader synthetic provider evidence; spy inserts controlled competing commits.

### AccountEstablishmentJpaTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/AccountEstablishmentJpaTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/AccountEstablishmentJpaTest.java). Classification: **JPA slice / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AccountStore`, `AccountAccess`. Controlled/absent boundaries: none.

### SourcePreparationMaintenanceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/api/SourcePreparationMaintenanceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/api/SourcePreparationMaintenanceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc controller/security/admission chain. Controlled/absent boundaries: jwt() supplies validated principals; no provider execution.

### CollectionOperationalEvidenceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/application/CollectionOperationalEvidenceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/application/CollectionOperationalEvidenceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `RecordCollectionResults`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `ObserveCollectionSource`, `CollectionStore`, `ChangeCollectionSeasons`, `ReadSportingData`, `ReadSportingAcquisition`, `ApplicationEventPublisher`. Controlled/absent boundaries: none.

### ClubAcquisitionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/ClubAcquisitionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/ClubAcquisitionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `AdmitCollectionCycle`, `ReadCollectionWork`, `RecordCollectionResults`, `RegisterCollectorRuntime`, `ChangeClubContacts`, `RestrictClubContacts`, `AcceptClubDetails`, `ReadSportingConfiguration`, `AcceptClubLocality`, `ReadSportingData`, `AccountStore`, `ChangeCollectionSeasons`. Controlled/absent boundaries: `Clock`.

### CollectionAdmissionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionAdmissionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionAdmissionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `RegisterCollectorRuntime`, `CollectorRuntimeAccess`, `ReadCollectionWork`, `AdmitCollectionCycle`, `CollectionCycleAccess`, `ChangeCollectionSeasons`. Controlled/absent boundaries: `Clock`; real-delegating instrumentation: `CollectionStore`.

### CollectionControlIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionControlIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionControlIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `ReadCollectionSeasons`, `RegisterCollectorRuntime`, `AdmitCollectionCycle`, `ReadCollectionWork`, `RecordCollectionResults`, `CollectionStore`, `com.blockout.backend.collection.application.service.ChangeCollectionControls`, `ReadCollectionConfiguration`, `ReadSportingData`, `ReadSportingAcquisition`, `CloseCollectionSeason`. Controlled/absent boundaries: none.

### CollectionResultIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionResultIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/CollectionResultIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `RegisterCollectorRuntime`, `ReadCollectionWork`, `AdmitCollectionCycle`, `RecordCollectionResults`, `CollectionStore`, `ChangeCollectionSeasons`. Controlled/absent boundaries: `Clock`.

### SourcePreparationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/SourcePreparationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/collection/infrastructure/persistence/SourcePreparationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `PrepareCollectionSources`, `AcceptSourceValidation`, `ReadCollectionConfiguration`, `ObserveCollectionSource`, `ChangeCollectionSeasons`, `ReadCollectionSeasons`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AdmitCollectionCycle`. Controlled/absent boundaries: `Clock`; real-delegating instrumentation: `CollectionStore`.

### DatabaseConfigurationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/config/DatabaseConfigurationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/config/DatabaseConfigurationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; production application startup, actual Liquibase and JDBC role permissions. Controlled/absent boundaries: synthetic StartupFixture entity only; isolated per-scenario schemas.

### HealthIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/config/HealthIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/config/HealthIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; embedded HTTP server, actual Actuator readiness and disposable DB pause. Controlled/absent boundaries: none; only its own container is paused, never an external DB.

### ContributionAnnouncementsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `Probe`, `SportingProjectionChanges`, `ProcessDueMatch`, `com.blockout.backend.sporting.application.service.MatchContributionAccess`, `com.blockout.backend.notifications.application.AnnouncementRecipients`, `AnnounceContribution`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`; actual publication/result/F07 producers and after-commit event listeners. Controlled/absent boundaries: clock; instance-owned recording/failing after-commit listener; controlled SQL uniqueness failure.

### ContributionAttributionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAttributionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAttributionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

### ContributionSportingLocksIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionSportingLocksIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionSportingLocksIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeDivisionLifecycle`, `ProcessDueLinkAnnouncements.ProcessDueMatch`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

### ReadOwnContributionsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

### SubmitContributionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitContributionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitContributionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

### SubmitModeratedContributionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitModeratedContributionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/application/SubmitModeratedContributionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `SubmitModeratedContribution`, `ChangeAttributionAfterCommit`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`; moderated command and post-commit attribution reads. Controlled/absent boundaries: clock; instance-owned listener performs explicit competing account mutation after commit.

### ContributionPersistenceJpaTest

Source: [apps/backend/src/test/java/com/blockout/backend/contributions/infrastructure/ContributionPersistenceJpaTest.java](../apps/backend/src/test/java/com/blockout/backend/contributions/infrastructure/ContributionPersistenceJpaTest.java). Classification: **JPA slice / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ContributionStore`, `ContributionPersistenceMapper`. Controlled/absent boundaries: none.

### FollowRelationsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/following/infrastructure/FollowRelationsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/following/infrastructure/FollowRelationsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `FollowState`, `FollowStore`, `ReadFollowEligibility`, `AccountAccess`. Controlled/absent boundaries: `PrincipalReader`.

### LegacyApplicationStatusIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc legacy controller and current settings persistence. Controlled/absent boundaries: no provider, native V1 application or deployed client.

### LegacyApplicationStatusUnavailableIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusUnavailableIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/legacy/api/LegacyApplicationStatusUnavailableIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; MockMvc legacy controller and malformed stored-state response. Controlled/absent boundaries: no provider, native V1 application or deployed client.

### AnnouncementAudienceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementAudienceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementAudienceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ProcessDueLinkAnnouncements.ProcessDueMatch`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

### AnnouncementTransactionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementTransactionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementTransactionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ProcessResultAnnouncement`, `NotificationStore`, `AccountAccess`. Controlled/absent boundaries: none.

### LinkAnnouncementIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`. Controlled/absent boundaries: `Clock`.

### MarkNotificationReadIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/MarkNotificationReadIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/MarkNotificationReadIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `MarkNotificationRead`, `ReadInbox`, `AccountAccess`. Controlled/absent boundaries: `Clock`.

### PurgeNotificationsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `NotificationRetentionConfiguration`, `PurgeNotifications`, `ReadInbox`, `MarkNotificationRead`, `NotificationStore`; real retention entry point, bulk-delete commit/rollback and read/create races. Controlled/absent boundaries: clock; instance-owned Hibernate observer injects one controlled SQL failure or observes a lock attempt.

### ReadInboxIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/ReadInboxIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/ReadInboxIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ReadInbox`, `ReadSportingResources`; real repeatable-read projection and bounded SQL queries. Controlled/absent boundaries: clock; instance-owned Hibernate statement observer performs explicit concurrent committed changes.

### RecipientSnapshotIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/notifications/application/RecipientSnapshotIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/notifications/application/RecipientSnapshotIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`, `SubmitContribution`, `ReadOwnContributions`, `ContributionStore`, `FollowState`, `ProcessDueLinkAnnouncements`; real SQL audience union with independent follow commits. Controlled/absent boundaries: clock; instance-owned Hibernate statement observer coordinates the interleaving without changing SQL.

### ProjectSearchTransactionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/ProjectSearchTransactionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/ProjectSearchTransactionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ProjectSearch`; ProjectSearch Spring proxy, actual transaction manager and SQL connection. Controlled/absent boundaries: SearchProjectionWriter; no engine; proves rejection before writer effects only.

### SearchCurrentDataIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/SearchCurrentDataIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/SearchCurrentDataIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `HydrateSearch`, `ConsultationStore`; real ReadSportingResources spy, current SQL hydration and Hibernate statement counts for one versus a full bounded native batch of distinct candidates. Controlled/absent boundaries: synthetic stale engine candidates; engine retrieval not exercised.

### CurrentRestrictionsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/CurrentRestrictionsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/CurrentRestrictionsIntegrationTest.java). Classification: **cross-owner application/infrastructure integration / Failsafe**.

Real components: admitted F01 cycles and lifecycle, F02 calendar/catalog/division commands, F03 HTTP resource and calendar reads, F06 desired-state follows and HTTP lists/options/personal calendar, migrated PostgreSQL and F04 `ProjectSearch` with the production TLS OpenSearch matching/writer adapters. Controlled boundaries: fixed clock, synthetic source facts and test JWT principal; projection execution is explicitly delayed while actual committed handoff scopes are recorded. No sporting, follow, hydration or projection owner is mocked. Provider, native UI and scheduler timing are outside these cases.

### CurrentPresentationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/CurrentPresentationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/CurrentPresentationIntegrationTest.java). Classification: **cross-owner application/infrastructure integration / Failsafe**.

Real components: admitted F01 calendar/club/geocoding scopes; F02 source, manual presentation, contact restriction, locality and image services; F03 public JSON/binary adapters; F04 current-input expansion, native TLS engine matching and projection. Controlled boundaries: fixed clock, synthetic source/geocoding/image inputs, exact technical alias/optional-club SQL associations and synthetic authorization of the existing private F11 operation. Catch-up consumes actual after-commit identity scopes. No live provider, manual rights handling, native rendering or backup restoration is certified.

### ResultAnnouncementIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `SportingObservationMapper`. Controlled/absent boundaries: none.

### SportingPresentationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `com.blockout.backend.access.application.CurrentPermissions`, `ReadSportingData`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AccountStore`, `ChangeDivisionLifecycle`, `ReadSportingConfiguration`, `AcceptSourceImage`, `ChangeClubContacts`, `RestrictClubContacts`, `AcceptClubDetails`, `AcceptClubLocality`, `ChangeSportingPresentation`. Controlled/absent boundaries: none.

### SportingProjectionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingProjectionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingProjectionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `AcceptCalendar`, `AcceptMatchObservation`, `AcceptCatalog`, `ReadSportingData`, `ReadSportingAcquisition`, `SportingProjectionChanges`. Controlled/absent boundaries: none.

### MatchSummaryIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/MatchSummaryIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/MatchSummaryIntegrationTest.java). Classification: **application/persistence integration / Failsafe**.

Real components: migrated PostgreSQL, Hibernate statistics, transaction management, `ReadSportingResources`, `ReadMatchCalendar` and sporting persistence ports/adapters. Controlled/absent boundaries: fixture sporting observations; no supplier or native rendering.

### SportingResourcesIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingResourcesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingResourcesIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ReadSportingResources`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `ChangeClubContacts`, `RestrictClubContacts`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`. Controlled/absent boundaries: none.

### SportingVisibilityIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingVisibilityIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingVisibilityIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `ReadCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptCalendar`, `AcceptMatchObservation`, `AcceptCatalog`, `ReadSportingData`, `ReadSportingAcquisition`, `AcceptStandings`, `CloseCollectionSeason`, `RecordCollectionResults`, `ChangeCollectionControls`. Controlled/absent boundaries: none.

### TransitionLogoIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/TransitionLogoIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/TransitionLogoIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `com.blockout.backend.access.application.CurrentPermissions`, `SportingStore`, `ChangeSportingPresentation`, `ReadSportingConfiguration`, `ReadSportingData`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AccountStore`. Controlled/absent boundaries: none.

### CalendarAcceptanceIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/CalendarAcceptanceIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/CalendarAcceptanceIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptCalendar`, `ValidateSportingImage`, `AcceptMatchObservation`, `AcceptCatalog`. Controlled/absent boundaries: none.

### ClassificationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ClassificationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ClassificationIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeSportingClassification`, `ReadSportingConfiguration`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AccountStore`, `SportingStore`. Controlled/absent boundaries: none.

### DivisionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/DivisionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/DivisionIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `com.blockout.backend.access.application.CurrentPermissions`, `ChangeDivisionLifecycle`, `ReadSportingConfiguration`, `ChangeSportingClassification`, `ReadSportingAcquisition`, `ChangeCollectionSeasons`, `AccountStore`. Controlled/absent boundaries: none.

### MatchDetailsAndStandingsIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/application/service/MatchDetailsAndStandingsIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/application/service/MatchDetailsAndStandingsIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `AdmitCollectionCycle`, `RegisterCollectorRuntime`, `ReadCollectionWork`, `AcceptCalendar`, `AcceptMatchObservation`, `AcceptStandings`, `SportingStore`, `SportingObservationMapper`. Controlled/absent boundaries: none.

### SportingIdentityIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/sporting/infrastructure/SportingIdentityIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/sporting/infrastructure/SportingIdentityIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real components: PostgreSQL, Liquibase, JDBC/Hibernate, real transaction management; `ChangeCollectionSeasons`, `EstablishMatchIdentity`, `ReadSportingData`, `ReadSportingAcquisition`. Controlled/absent boundaries: none; real-delegating instrumentation: `JpaSportingStore`.

Inventory total: **47 suites, 484 test methods**; parameterized invocations are retained in source and counted by the runner, not expanded into duplicate rows.

## External clients and collector

### Auth0ConfigurationIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0ConfigurationIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0ConfigurationIntegrationTest.java). Family: **External OAuth HTTP integration**.

Real: Auth0Configuration, native OAuth manager/token client, Auth0 SDK, native HTTP. Controlled: Loopback identity/resource responses; synthetic registration. Lifecycle: Per-method pool, validator, worker and peer cleanup; latches hold timeout response.

### Auth0PrincipalClientTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PrincipalClientTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PrincipalClientTest.java). Family: **Unit SDK adapter**.

Real: Auth0PrincipalClient, real SDK encoding/decoding and validator. Controlled: OkHttp native response interceptor; no sockets. Lifecycle: Per-method SDK pool/dispatcher/validator closes; exact paths/body/privacy assertions.

### Auth0PropertiesIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PropertiesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/accounts/infrastructure/Auth0PropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Native Auth0 configuration binding and validation. Controlled: Synthetic properties. Lifecycle: ApplicationContextRunner; no provider request.

### DiscoveryExamplesIntegrationTest

Source: [DiscoveryExamplesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/api/DiscoveryExamplesIntegrationTest.java). Classification: **application/infrastructure integration / Failsafe**.

Real: generated Spring MVC routes, current PostgreSQL visibility owners, migrations and disposable TLS OpenSearch. Controlled: synthetic sporting records and local index contents. Each scenario resets its SQL/index data; the test context owns container cleanup. Native Set binding collapses duplicate example identities and Spring ignores unbound query parameters; these are accepted input normalization, not access decisions.

### SearchTraversalIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/application/SearchTraversalIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/application/SearchTraversalIntegrationTest.java). Family: **HTTP/MVC + PostgreSQL + native search integration**.

Real: Generated MVC boundary, owner SQL hydration, real OpenSearch traversal. Controlled: Disposable engine credentials/CA only. Lifecycle: Context-owned engine; SQL + mapped generation reset each method; class context closes before native resources outlive it.

### OpenSearchClientIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchClientIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchClientIntegrationTest.java). Family: **Native search integration**.

Real: Pinned OpenSearch 3.9.0, official client, TLS, security, actual JSON/index/alias semantics. Controlled: Disposable credentials and certificate authority; no external engine. Lifecycle: One instance-owned container per class; isolated index names; explicit refresh; transport/container/files close.

### OpenSearchEngineTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchEngineTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchEngineTest.java). Family: **Unit SDK adapter**.

Real: OpenSearchEngine and real request/response values. Controlled: Official OpenSearch client collaborator. Lifecycle: Fresh mocks; no engine semantic evidence claimed.

### OpenSearchPropertiesIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchPropertiesIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/OpenSearchPropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Shipped YAML, native OpenSearch connection/index property binding and validation. Controlled: Synthetic settings; no engine/client started. Lifecycle: ApplicationContextRunner closes each context.

### SearchMatchingIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchMatchingIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchMatchingIntegrationTest.java). Family: **Native search integration**.

Real: Pinned OpenSearch analyzers/mappings and production OpenSearchEngine. Controlled: Disposable local credentials/CA only. Lifecycle: One class engine; fresh empty mapped index per method and deletion afterwards; explicit refresh.

### SearchProjectionIntegrationTest

Source: [apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionIntegrationTest.java](../apps/backend/src/test/java/com/blockout/backend/search/infrastructure/SearchProjectionIntegrationTest.java). Family: **HTTP/MVC + PostgreSQL + native search integration**.

Real: Migrated PostgreSQL, real owner services/commit callbacks, scheduler, OpenSearch projection/alias writes and generated HTTP reads with F03 summaries. Controlled: Native client spies assert SQL independence or inject selected failures while other operations stay real; a latch holds projection work during current-city HTTP checks. Lifecycle: Context-owned engine and scheduler; class context closed; SQL reset and drained scheduler before each method; explicit transactions/joins.

### CollectorApplicationSmokeTest

Source: [apps/collector/src/test/java/com/blockout/collector/CollectorApplicationSmokeTest.java](../apps/collector/src/test/java/com/blockout/collector/CollectorApplicationSmokeTest.java). Family: **Startup smoke**.

Real: CollectorApplication component graph, native configuration binding. Controlled: CollectorStartup bean; all provider traffic suppressed. Lifecycle: Context shutdown owns pools; method has no mutable domain fixture.

### AcquisitionSchedulerIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerIntegrationTest.java). Family: **Executor integration**.

Real: AcquisitionScheduler, CollectorLifecycle, bounded ThreadPoolTaskExecutor. Controlled: TaskScheduler timer and application/backend ports. Lifecycle: Latch proves worker occupied before submission; release/shutdown in finally.

### AcquisitionSchedulerTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/AcquisitionSchedulerTest.java). Family: **Unit**.

Real: AcquisitionScheduler, native Trigger evaluation; selected CollectorLifecycle. Controlled: Timer and application/backend ports; fixed time; synchronous executor. Lifecycle: Fresh JUnit instance; no thread or remote proof.

### CollectPassageTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectPassageTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectPassageTest.java). Family: **Unit**.

Real: CollectPassage, immutable observations, selected readers/mappers. Controlled: Application backend ports and provider readers. Lifecycle: Nested scenarios use fresh JUnit fixture; no SQL or provider proof.

### CollectionOperationalEvidenceTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectionOperationalEvidenceTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectionOperationalEvidenceTest.java). Family: **Unit**.

Real: CollectionOperationalEvidence and selected CollectPassage. Controlled: Backend/provider ports; captured logs. Lifecycle: Fresh JUnit fixture; log capture is scoped to each method.

### CollectorContextIdentityIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorContextIdentityIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorContextIdentityIntegrationTest.java). Family: **Executable HTTP + PostgreSQL**.

Real: Generated HTTP clients, real backend security/services/repositories, migrated PostgreSQL commits. Controlled: Synthetic provider observations, local JWT signing peer. Lifecycle: Opt-in disposable runtime/database; SQL fixture before each method; transport after each; process after class.

### CollectorLifecycleIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleIntegrationTest.java). Family: **HTTP client integration**.

Real: CollectorLifecycle, CollectorStartup, generated client, native HTTP decoding. Controlled: Loopback backend responses; scheduler boundary. Lifecycle: Per-method listener/transport closes; no actual backend commit evidence.

### CollectorLifecycleTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorLifecycleTest.java). Family: **Unit**.

Real: CollectorLifecycle. Controlled: CollectionBackend port. Lifecycle: Fresh JUnit instance; microsecond precision checks do not substitute for SQL timestamp evidence.

### CollectorPartialSuccessIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPartialSuccessIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPartialSuccessIntegrationTest.java). Family: **Executable HTTP + PostgreSQL**.

Real: CollectPassage, generated HTTP, backend transactions, migrated PostgreSQL constraints. Controlled: Provider resource readers/discovery; synthetic parsed facts. Lifecycle: Opt-in disposable runtime and reset SQL; committed SQL queried independently; no test transaction.

### CollectorPresentationBoundaryIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPresentationBoundaryIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorPresentationBoundaryIntegrationTest.java). Family: **Executable HTTP + PostgreSQL**.

Real: CollectPassage, generated clients, backend presentation transactions and multipart transport. Controlled: Provider readers, geocoder/club sheets, loopback image/JWT peers. Lifecycle: Opt-in runtime, reset SQL and scenario images; actual commit visibility checked via JDBC.

### CollectorSportingBoundaryIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorSportingBoundaryIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CollectorSportingBoundaryIntegrationTest.java). Family: **Executable HTTP + PostgreSQL concurrency**.

Real: CollectorLifecycle/CollectPassage, generated HTTP, backend security, row locks and transactions. Controlled: Provider reader and local JWT signing; response-loss interceptor invokes real request. Lifecycle: Opt-in runtime; PostgreSQL blocking edges observed with bounded Awaitility, manual blocker commits/rollbacks and bounded Future joins.

### CurrentEntryOperationalEvidenceIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/CurrentEntryOperationalEvidenceIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/CurrentEntryOperationalEvidenceIntegrationTest.java). Family: **Logging integration**.

Real: Native discovery parsers/orchestration and Boot ECS console encoder. Controlled: ProviderPages and CollectionBackend ports; fixed Clock. Lifecycle: Minimal configuration-only Boot context; per-method objects/captured logs, no provider evidence.

### DiscoverSeasonSourcesTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/DiscoverSeasonSourcesTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/DiscoverSeasonSourcesTest.java). Family: **Unit**.

Real: DiscoverSeasonSources with native FFVB/LNV parsers. Controlled: ProviderPages and backend/lifecycle ports. Lifecycle: Fresh data and completed/failed futures; no HTTP proof.

### QualifySourceTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/QualifySourceTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/QualifySourceTest.java). Family: **Unit**.

Real: QualifySource and native context qualification. Controlled: ProviderPages and backend/lifecycle ports. Lifecycle: Fresh completed futures; no provider proof.

### SportingObservationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/application/SportingObservationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/application/SportingObservationTest.java). Family: **Unit**.

Real: Immutable SportingObservation invariants. Controlled: None. Lifecycle: Local values only.

### FfvbClubSheetTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbClubSheetTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbClubSheetTest.java). Family: **Unit**.

Real: Native FFVB club-sheet interpreter and request decision. Controlled: ProviderHttpClient port. Lifecycle: Synthetic HTML; no live lookup.

### FfvbDiscoveryTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbDiscoveryTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbDiscoveryTest.java). Family: **Unit**.

Real: Native FFVB document discovery/parser. Controlled: None. Lifecycle: Inline/classpath synthetic HTML.

### FfvbObservationReaderIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationReaderIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationReaderIntegrationTest.java). Family: **HTTP reader integration**.

Real: FfvbObservationReader, actual bounded HTTP transport and parser. Controlled: Loopback provider responses; controlled Clock. Lifecycle: Per-method listener/client closes; real network serialization and reread count.

### FfvbObservationsTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationsTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ffvb/FfvbObservationsTest.java). Family: **Unit**.

Real: FFVB HTML/CSV parsing and observation values. Controlled: None. Lifecycle: Synthetic resources with exact presence/identity cases.

### IgnMunicipalityTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/ign/IgnMunicipalityTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/ign/IgnMunicipalityTest.java). Family: **Unit**.

Real: IGN request/filter and response interpretation. Controlled: ProviderHttpClient port. Lifecycle: Synthetic JSON; no IGN network request.

### CollectionBackendMapperTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/CollectionBackendMapperTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/CollectionBackendMapperTest.java). Family: **Unit mapping**.

Real: Generated MapStruct implementation and real generated DTOs. Controlled: None. Lifecycle: Exact explicit timestamp/null values.

### SportingObservationClientIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationClientIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationClientIntegrationTest.java). Family: **Generated HTTP adapter integration**.

Real: SportingObservationClient, MapStruct mapper, generated API, native HTTP/JSON transport. Controlled: Loopback backend responses; controlled authentication. Lifecycle: Per-method listener/transport; request bytes, statuses and call counts.

### SportingObservationMapperTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationMapperTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/backend/SportingObservationMapperTest.java). Family: **Unit mapping**.

Real: Generated mapper and real DTO presence types. Controlled: None. Lifecycle: Explicit absent/null/empty/supplied values.

### ProviderHttpClientIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderHttpClientIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderHttpClientIntegrationTest.java). Family: **External HTTP transport integration**.

Real: Production synchronous ProviderHttpClient, Apache connection pool and rate limiter. Controlled: Loopback provider peers only. Lifecycle: Per-method listeners/callers; client try-with-resources; held responses coordinated by latches. Preserve native lease waits, actual-exchange pacing, retry/cache/origin and decoded-size boundaries.

### ProviderOriginTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderOriginTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/infrastructure/provider/ProviderOriginTest.java). Family: **Unit**.

Real: ProviderOrigin authority equivalence/allowlist. Controlled: None. Lifecycle: URI values only.

### LnvDiscoveryTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDiscoveryTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDiscoveryTest.java). Family: **Unit**.

Real: Native LNV published-link discovery. Controlled: None. Lifecycle: Synthetic document values.

### LnvDocumentReferencesTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDocumentReferencesTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvDocumentReferencesTest.java). Family: **Unit**.

Real: LNV form/document reference parsing and scoped associations. Controlled: None. Lifecycle: Synthetic HTML and explicit associations.

### LnvHttpCachingIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvHttpCachingIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvHttpCachingIntegrationTest.java). Family: **External HTTP cache integration**.

Real: Production LNV HTTP client and Apache cache. Controlled: Loopback origin with Cache-Control/ETag/status. Lifecycle: Per-method listener and closeable client; freshness asserted through exact native requests without sleeps.

### LnvObservationReaderTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationReaderTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationReaderTest.java). Family: **Unit**.

Real: LnvObservationReader and document/native parser. Controlled: ProviderHttpClient and Clock where applicable. Lifecycle: Fresh futures and per-read context; no HTTP/SQL evidence.

### LnvObservationsTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationsTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvObservationsTest.java). Family: **Unit**.

Real: Native LNV XML/HTML observation parsing. Controlled: None. Lifecycle: Synthetic document facts and explicit contextual values.

### LnvPageTest

Source: [apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvPageTest.java](../apps/collector/src/test/java/com/blockout/collector/acquisition/lnv/LnvPageTest.java). Family: **Unit**.

Real: LNV temporal parsing/conversion. Controlled: None. Lifecycle: Explicit clock/text values including malformed long input.

### AcquisitionPropertiesIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/config/AcquisitionPropertiesIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/config/AcquisitionPropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Shipped YAML, native binding and validation. Controlled: Isolated synthetic environment aliases. Lifecycle: ApplicationContextRunner closes each narrow context.

### LoggingIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/config/LoggingIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/config/LoggingIntegrationTest.java). Family: **Logging integration**.

Real: Boot ECS encoder with lifecycle/passage operational logging. Controlled: Backend/provider ports. Lifecycle: Minimal Boot logging configuration and per-method captured output.

### GeneratedClientIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/GeneratedClientIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/GeneratedClientIntegrationTest.java). Family: **Generated HTTP client integration**.

Real: Generated DTO/API, production transport/Jackson and observation metrics. Controlled: Loopback backend; OAuth interceptor bypassed explicitly. Lifecycle: Per-method listener/factory/meter registry; stalled responses released before cleanup.

### IngestionAuthenticationIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionAuthenticationIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionAuthenticationIntegrationTest.java). Family: **OAuth + generated HTTP integration**.

Real: Production ingestion configurations, native registration/cache, OAuth manager, generated API, CollectionBackendClient. Controlled: Loopback OAuth/backend peers only. Lifecycle: New narrow native context, HTTP peer, executor, clock/cache per method; release then close.

### IngestionPropertiesIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionPropertiesIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/IngestionPropertiesIntegrationTest.java). Family: **Configuration integration**.

Real: Shipped YAML, native ingestion binding and Bean Validation. Controlled: Host environment replaced by explicit aliases. Lifecycle: ApplicationContextRunner owns and closes the narrow configuration context.

### SportingContractIntegrationTest

Source: [apps/collector/src/test/java/com/blockout/collector/ingestion/SportingContractIntegrationTest.java](../apps/collector/src/test/java/com/blockout/collector/ingestion/SportingContractIntegrationTest.java). Family: **Generated HTTP serialization integration**.

Real: Generated sporting API/DTOs, production Jackson and HTTP transport. Controlled: Loopback backend responses; controlled credentials. Lifecycle: Per-method listener/transport; asserts wire body presence and decoding.

### Exact evidence limits

- Unit adapters with mocked HTTP/client ports prove mapping or orchestration only. They establish neither provider compatibility nor socket behavior.
- Loopback HTTP suites exercise production transport and serializers against synthetic peers. They establish neither a live provider agreement nor real backend persistence.
- OpenSearch suites retain the actual pinned engine. No fake replaces analyzer, alias publication, TLS or search traversal semantics.
- Collector executable qualification requires its existing explicit disposable database/JAR/port properties. Its opt-in skips must be reported separately from passing default Failsafe runs.
- Test time bounds detect a missing completion; latches and observed SQL blocking edges establish ordering. Existing provider retry-policy assertions test production behavior; they are not suite retries.

## Mobile generated consumers, Query/session and SDK boundaries

Shared real components and doubles below apply only to the executed boundary. Direct policy/schema cases do not invoke available transport or provider doubles. Parameter values and assertions live in source.

All ordinary suites run in the existing Jest Expo process. Actual React components, application providers/stores, generated clients, validators and Query observers remain real where listed. Native controls, SDK I/O, image codecs, storage durability and device networking are not qualified. Auth0 suites that install `NativeModules.A0Auth0` keep the Auth0 JavaScript SDK real; RevenueCat/Google Ads suites replace their public SDK calls and therefore prove application consumption, not those SDKs’ native internals.

`maintenance-settings-provider.test.tsx` is the exception: it delegates to real node-fetch and writes to the backend selected by `BLOCKOUT_ACCESS_PROVIDER_URL`, using `BLOCKOUT_ACCESS_EDITOR_ONE/TWO`. It is skipped when that URL is absent. Its setup changes maintenance and version settings, so authorized execution requires an isolated disposable backend/database. The existing [AccessSettingsConsumersIntegrationTest](../apps/backend/src/test/java/com/blockout/backend/access/infrastructure/AccessSettingsConsumersIntegrationTest.java) owns that loopback backend, PostgreSQL container and synthetic JWT issuer when explicitly enabled by BLOCKOUT_ACCESS_CONSUMERS_TEST=true. The opt-in cases supply process/SQL evidence only under that orchestrator, and do not qualify a native network stack.

### Scope exclusions

The root-level [app-config.test.ts](../apps/mobile/__tests__/app-config.test.ts) also remains a direct configuration/unit suite: its eight authored scenarios inspect Expo configuration with isolated environment values. It starts no native build or provider client.

The complete [React suite inventory](README.md#react-suite-inventory) owns the current component, form, screen and hook families. Component-only examples such as [Button](../apps/mobile/src/shared/components/__tests__/button.test.tsx), [Sheet](../apps/mobile/src/shared/components/__tests__/sheet.test.tsx) and [request feedback](../apps/mobile/src/shared/components/__tests__/request-feedback.test.tsx) are classified there; the sections below detail the documented integration scenarios. No visual or native result is inferred from a component suite.

### Mobile: access-contract.test.ts

Source: [apps/mobile/src/features/access/**tests**/access-contract.test.ts](../apps/mobile/src/features/access/__tests__/access-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: access-gates.test.tsx

Source: [apps/mobile/src/features/access/**tests**/access-gates.test.tsx](../apps/mobile/src/features/access/__tests__/access-gates.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `access-gate-screen`, `+not-found`, `_layout`, `administration`, `_layout`, `onboarding`, `discovery-state`, `current-account`.
- **Controlled:** `expo-constants`; `expo-application`; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: administration-entry.test.tsx

Source: [apps/mobile/src/features/access/**tests**/administration-entry.test.tsx](../apps/mobile/src/features/access/__tests__/administration-entry.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `use-current-account`, `profile-screen`, `administration-entry`, `administration-screen`, `administration`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: application-versions-route.test.tsx

Source: [apps/mobile/src/features/access/**tests**/application-versions-route.test.tsx](../apps/mobile/src/features/access/__tests__/application-versions-route.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `access-gate-screen`, `+not-found`, `_layout`, `administration`, `_layout`, `onboarding`, `discovery-state`, `application-versions`.
- **Controlled:** `expo-constants`; react-native-keyboard-controller upstream native test double; `expo-application`; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

### Mobile: application-versions-settings.test.tsx

Source: [apps/mobile/src/features/access/**tests**/application-versions-settings.test.tsx](../apps/mobile/src/features/access/__tests__/application-versions-settings.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `application-versions-settings-screen`, `application-versions`.
- **Controlled:** react-native-safe-area-context upstream native test double; react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: installed-version.test.ts

Source: [apps/mobile/src/features/access/**tests**/installed-version.test.ts](../apps/mobile/src/features/access/__tests__/installed-version.test.ts).

- **Real:** Owning handwritten modules: `access-presentation`, `access-observations`, `installed-version`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** spies/property replacements restored.

### Mobile: maintenance-bypass.test.tsx

Source: [apps/mobile/src/features/access/**tests**/maintenance-bypass.test.tsx](../apps/mobile/src/features/access/__tests__/maintenance-bypass.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `api-fetch`, `query-client`, `account-session-provider`, `use-profile-editing`, `use-application-access`, `use-access-admission`, `ordinary-request`, `discovery-context`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: maintenance-problem.test.ts

The unused decoder and its mirror tests are retired. The real [transport suite](../apps/mobile/src/shared/api/__tests__/api-fetch.test.ts) owns complete access-read invalidation on ordinary refusals.

### Mobile: maintenance-settings-provider.test.tsx

Source: [apps/mobile/src/features/access/**tests**/maintenance-settings-provider.test.tsx](../apps/mobile/src/features/access/__tests__/maintenance-settings-provider.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `api-fetch`, `maintenance-settings-screen`. Real HTTP requests reach the explicitly configured backend when opt-in execution is authorized. This suite does not start the provider or inspect its database, migrations or transaction implementation.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Expo native networking replaced by real node-fetch to an explicitly supplied backend; controlled response loss after the provider has returned from the write
- **Limit:** The provider URL and editor credentials are required. Skipped cases are unavailable evidence. Configured-backend behavior is separate from native networking and external-provider qualification.
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: maintenance-settings.test.tsx

Source: [apps/mobile/src/features/access/**tests**/maintenance-settings.test.tsx](../apps/mobile/src/features/access/__tests__/maintenance-settings.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `maintenance-settings-screen`, `maintenance`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

### Mobile: store-action.test.tsx

Source: [apps/mobile/src/features/access/**tests**/store-action.test.tsx](../apps/mobile/src/features/access/__tests__/store-action.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `store-action`, `theme-provider`.
- **Controlled:** `expo-linking`
- **Isolation/cleanup:** RNTL unmount cleanup owns mounted component effects.

### Mobile: account-age-retry.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/account-age-retry.test.tsx](../apps/mobile/src/features/accounts/__tests__/account-age-retry.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `profile-screen`, `account-session-provider`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket); `expo-image-picker`; `expo-image-manipulator`; `expo-file-system`
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

### Mobile: account-session-provider.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/account-session-provider.test.tsx](../apps/mobile/src/features/accounts/__tests__/account-session-provider.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: native-session.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/native-session.test.tsx](../apps/mobile/src/features/accounts/__tests__/native-session.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

### Mobile: prepare-profile-photo.test.ts

Source: [apps/mobile/src/features/accounts/**tests**/prepare-profile-photo.test.ts](../apps/mobile/src/features/accounts/__tests__/prepare-profile-photo.test.ts).

- **Real:** Owning handwritten modules: `api-fetch`, `account-session-provider`, `prepare-profile-photo`.
- **Controlled:** `expo-image-manipulator`; `expo-file-system`
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

### Mobile: profile-form.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/profile-form.test.tsx](../apps/mobile/src/features/accounts/__tests__/profile-form.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `profile-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket); `expo-image-picker`; `expo-image-manipulator`; `expo-file-system`
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

### Mobile: sign-in.test.tsx

Source: [apps/mobile/src/features/accounts/**tests**/sign-in.test.tsx](../apps/mobile/src/features/accounts/__tests__/sign-in.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `use-application-access`, `query-client`, `theme-provider`, `account-session-provider`, `use-current-account`, `sign-in-screen`, `profile-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

### Mobile: advertising-eligibility.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/advertising-eligibility.test.ts](../apps/mobile/src/features/advertising/__tests__/advertising-eligibility.test.ts).

- **Real:** Owning handwritten modules: `accounts`, `advertising-eligibility`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

### Mobile: age-declaration.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/age-declaration.test.ts](../apps/mobile/src/features/advertising/__tests__/age-declaration.test.ts).

- **Real:** Owning handwritten modules: `age-declaration`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored.

### Mobile: age-entry.test.tsx

Source: [apps/mobile/src/features/advertising/**tests**/age-entry.test.tsx](../apps/mobile/src/features/advertising/__tests__/age-entry.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `current-account`, `pro`, `pro-session`, `age-declaration-provider`, `age-declaration`, `_layout`, `age-declaration`, `index`, `onboarding`, `sign-in`, `discovery-state`, `access-gate-screen`.
- **Controlled:** `expo-constants`; Sentry SDK entry/capture double; `expo-application`; official AsyncStorage Jest in-memory double; installation initialization outside this scenario; RevenueCat public SDK operations replaced by controlled doubles; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: age-form.test.tsx

Source: [apps/mobile/src/features/advertising/**tests**/age-form.test.tsx](../apps/mobile/src/features/advertising/__tests__/age-form.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `theme-provider`, `age-form`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history; RNTL unmount cleanup owns mounted component effects.

### Mobile: interstitial-lifecycle.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/interstitial-lifecycle.test.ts](../apps/mobile/src/features/advertising/__tests__/interstitial-lifecycle.test.ts).

- **Real:** Owning handwritten modules: `interstitial-lifecycle`, `sporting-ad-transition`.
- **Controlled:** Google Mobile Ads SDK factory/events/ad instance double; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; fake timers returned to real timers.

### Mobile: sporting-ad-transitions.test.ts

Source: [apps/mobile/src/features/advertising/**tests**/sporting-ad-transitions.test.ts](../apps/mobile/src/features/advertising/__tests__/sporting-ad-transitions.test.ts).

- **Real:** Owning handwritten modules: `interstitial-lifecycle`, `sporting-ad-transition`.
- **Controlled:** Google Mobile Ads SDK factory/events/ad instance double; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario doubles reset before each case.

### Mobile: close-season.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/close-season.test.tsx](../apps/mobile/src/features/collection/__tests__/close-season.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. Owning handwritten modules: `close-season-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown.

### Mobile: collection-contract.test.ts

Source: [apps/mobile/src/features/collection/**tests**/collection-contract.test.ts](../apps/mobile/src/features/collection/__tests__/collection-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown.

### Mobile: collection-dashboard.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/collection-dashboard.test.tsx](../apps/mobile/src/features/collection/__tests__/collection-dashboard.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. Owning handwritten modules: `collection-dashboard-screen`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown.

### Mobile: preparation-routes.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/preparation-routes.test.tsx](../apps/mobile/src/features/collection/__tests__/preparation-routes.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `discovery-state`, `_layout`, `administration`, `_layout`, `collection`, `[seasonId]`, `[provider]`, `[provider]`, `[family]`, `closure`, `[sourceId]`, `+not-found`, `access-gate-screen`.
- **Controlled:** `expo-constants`; react-native-keyboard-controller upstream native test double; `expo-application`; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: source-preparation.test.tsx

Source: [apps/mobile/src/features/collection/**tests**/source-preparation.test.tsx](../apps/mobile/src/features/collection/__tests__/source-preparation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `query-client`, `theme-provider`, `account-session-provider`, `current-account`, `collection-dashboard-screen`, `season-preparation-screen`, `provider-sources-screen`, `source-preparation-screen`, `source-children-screen`, `use-application-access`.
- **Controlled:** react-native-keyboard-controller upstream native test double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: contribution-context.test.ts

Source: [apps/mobile/src/features/contributions/**tests**/contribution-context.test.ts](../apps/mobile/src/features/contributions/__tests__/contribution-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `account-session-provider`, `query-client`, `contribution-keys`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; fake timers returned to real timers.

### Mobile: contribution-contract.test.ts

Source: [apps/mobile/src/features/contributions/**tests**/contribution-contract.test.ts](../apps/mobile/src/features/contributions/__tests__/contribution-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

### Mobile: discovery-access.test.ts

Source: [apps/mobile/src/features/discovery/**tests**/discovery-access.test.ts](../apps/mobile/src/features/discovery/__tests__/discovery-access.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `discovery-context`, `account-session-provider`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: discovery-contract.test.ts

Source: [apps/mobile/src/features/discovery/**tests**/discovery-contract.test.ts](../apps/mobile/src/features/discovery/__tests__/discovery-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`, `discovery-context`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

### Mobile: discovery-queries.test.ts

Source: [apps/mobile/src/features/discovery/**tests**/discovery-queries.test.ts](../apps/mobile/src/features/discovery/__tests__/discovery-queries.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `discovery-queries`, `account-session-provider`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; global Query online/focus flags reset; scenario-local resources also use finally where declared.

### Mobile: search-screen.test.tsx

Source: [apps/mobile/src/features/discovery/**tests**/search-screen.test.tsx](../apps/mobile/src/features/discovery/__tests__/search-screen.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `search-screen`, `query-client`, `theme-provider`, `account-session-provider`, `use-application-access`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); `../../../shared/api/binary-image-preview`
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: follow-action.test.tsx

Source: [apps/mobile/src/features/following/**tests**/follow-action.test.tsx](../apps/mobile/src/features/following/__tests__/follow-action.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `button`, `query-client`, `theme-provider`, `use-application-access`, `account-session-provider`, `follow-button`, `[teamId]`, `[poolId]`, `following-keys`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

### Mobile: following-context.test.ts

Source: [apps/mobile/src/features/following/**tests**/following-context.test.ts](../apps/mobile/src/features/following/__tests__/following-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `accounts`, `query-client`, `following-keys`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; environment restored by the declared teardown; fake timers returned to real timers.

### Mobile: following-contract.test.ts

Source: [apps/mobile/src/features/following/**tests**/following-contract.test.ts](../apps/mobile/src/features/following/__tests__/following-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

### Mobile: notification-context.test.ts

Source: [apps/mobile/src/features/notifications/**tests**/notification-context.test.ts](../apps/mobile/src/features/notifications/__tests__/notification-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `accounts`, `query-client`, `notification-keys`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; scenario-local resources also use finally where declared.

### Mobile: notification-contract.test.ts

Source: [apps/mobile/src/features/notifications/**tests**/notification-contract.test.ts](../apps/mobile/src/features/notifications/__tests__/notification-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; scenario-local resources also use finally where declared.

### Mobile: discovery-navigation.test.tsx

Source: [apps/mobile/src/features/onboarding/**tests**/discovery-navigation.test.tsx](../apps/mobile/src/features/onboarding/__tests__/discovery-navigation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `sign-in`, `current-account`, `discovery-state`, `access-gate-screen`.
- **Controlled:** Sentry SDK entry/capture double; `expo-application`; official AsyncStorage Jest in-memory double; installation initialization outside this scenario; RevenueCat public SDK operations replaced by controlled doubles; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: discovery-screen.test.tsx

Source: [apps/mobile/src/features/onboarding/**tests**/discovery-screen.test.tsx](../apps/mobile/src/features/onboarding/__tests__/discovery-screen.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `theme-provider`, `request-feedback`, `discovery-provider`, `discovery-state`, `discovery-screen`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored; RNTL unmount cleanup owns mounted component effects.

### Mobile: discovery-state.test.ts

Source: [apps/mobile/src/features/onboarding/**tests**/discovery-state.test.ts](../apps/mobile/src/features/onboarding/__tests__/discovery-state.test.ts).

- **Real:** Owning handwritten modules: `discovery-state`.
- **Controlled:** official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored.

### Mobile: initialization-root.test.tsx

Source: [apps/mobile/src/features/onboarding/**tests**/initialization-root.test.tsx](../apps/mobile/src/features/onboarding/__tests__/initialization-root.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `account-session-provider`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles; selected router/Stack navigation boundary (see declared mock); Sentry SDK entry/capture double; official AsyncStorage Jest in-memory double; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** scenario doubles reset before each case; official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: initialize-v2-installation.test.ts

Source: [apps/mobile/src/features/onboarding/**tests**/initialize-v2-installation.test.ts](../apps/mobile/src/features/onboarding/__tests__/initialize-v2-installation.test.ts).

- **Real:** Owning handwritten modules: `initialize-v2-installation`.
- **Controlled:** official AsyncStorage Jest in-memory double; Auth0 client/credential-manager double
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored.

### Mobile: pro-appearance.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-appearance.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-appearance.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `account-session-provider`, `theme-provider`, `tokens`, `index`.
- **Controlled:** selected router/Stack navigation boundary (see declared mock); `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double; installation initialization outside this scenario; official AsyncStorage Jest in-memory double; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket)
- **Isolation/cleanup:** official storage fake cleared before each case; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: pro-entry.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-entry.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-entry.test.tsx).

- **Real:** TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`, `profile-screen`, `sign-in-invitation-screen`, `query-client`, `theme-provider`, `pro-entry`, `pro-profile-entry`, `pro-provider`.
- **Controlled:** react-native-keyboard-controller upstream native test double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; real Router context/focus with controlled navigation commands; Sentry SDK entry/capture double
- **Limit:** Navigation assertions establish requested commands; the separate profile-navigation suite proves route departure. SDK UI doubles do not establish native paywall or customer-center presentation.
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: pro-offering.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-offering.test.ts](../apps/mobile/src/features/pro/__tests__/pro-offering.test.ts).

- **Real:** Owning handwritten modules: `pro-offering`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history.

### Mobile: pro-presentation.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-presentation.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-presentation.test.tsx).

- **Real:** TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `account-session-provider`, `query-client`, `theme-provider`, `pro-provider`, `pro-profile-entry`, `pro-presentation-screen`.
- **Controlled:** `expo-constants`; real Router context/focus with controlled navigation commands; RevenueCat public SDK operations replaced by controlled doubles; Paywall/native management component callbacks controlled by a React test component; Sentry SDK entry/capture double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Limit:** Navigation assertions establish requested commands; the separate profile-navigation suite proves route departure. SDK UI doubles do not establish native paywall or customer-center presentation.
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: pro-profile-navigation.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-profile-navigation.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-profile-navigation.test.tsx).

- **Real:** Expo Router Stack/Link, actual route focus, Query client, Auth0 JavaScript SDK, account/Pro providers and ProProfileEntry.
- **Controlled:** Auth0 native bridge, installation initialization, RevenueCat public SDK I/O, Expo configuration and Sentry capture. A deferred offering read holds the native SDK boundary.
- **Limit/cleanup:** The route must remain /sporting after the held offer resolves. This proves JavaScript navigation/focus, not device gestures or RevenueCat compatibility. Unmount before clearing the client/restoring native doubles and environment; release the held read in finally.

### Mobile: pro-purchase.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-purchase.test.ts](../apps/mobile/src/features/pro/__tests__/pro-purchase.test.ts).

- **Real:** Owning handwritten modules: `pro-session`, `pro-operations`.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double
- **Isolation/cleanup:** scenario doubles reset before each case.

### Mobile: pro-refresh.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-refresh.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-refresh.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: pro-session.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-session.test.ts](../apps/mobile/src/features/pro/__tests__/pro-session.test.ts).

- **Real:** Owning handwritten modules: `accounts`, `pro-session`.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

### Mobile: pro-state.test.ts

Source: [apps/mobile/src/features/pro/**tests**/pro-state.test.ts](../apps/mobile/src/features/pro/__tests__/pro-state.test.ts).

- **Real:** Owning handwritten modules: `accounts`, `pro-state`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles
- **Isolation/cleanup:** fresh scenario-local owner/value setup; Jest clearMocks resets call history.

### Mobile: pro-verification.test.tsx

Source: [apps/mobile/src/features/pro/**tests**/pro-verification.test.tsx](../apps/mobile/src/features/pro/__tests__/pro-verification.test.tsx).

- **Real:** Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo.
- **Controlled:** `expo-constants`; RevenueCat public SDK operations replaced by controlled doubles; Sentry SDK entry/capture double; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: consultation-context.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/consultation-context.test.ts](../apps/mobile/src/features/sporting/__tests__/consultation-context.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `consultation-queries`, `account-session-provider`, `maintenance-bypass`, `query-client`, `api-fetch`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: consultation-contract.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/consultation-contract.test.ts](../apps/mobile/src/features/sporting/__tests__/consultation-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`, `consultation-queries`, `account-session-provider`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: sporting-pages.test.tsx

Source: [apps/mobile/src/features/sporting/**tests**/sporting-pages.test.tsx](../apps/mobile/src/features/sporting/__tests__/sporting-pages.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `query-client`, `theme-provider`, `account-session-provider`, `use-application-access`, `club-screen`, `team-screen`, `pool-screen`, `match-screen`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared; RNTL unmount cleanup owns mounted component effects.

### Mobile: sporting-resource-queries.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/sporting-resource-queries.test.ts](../apps/mobile/src/features/sporting/__tests__/sporting-resource-queries.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `consultation-queries`, `account-session-provider`, `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; global Query online/focus flags reset; scenario-local resources also use finally where declared.

### Mobile: sporting-time-inputs.test.ts

Source: [apps/mobile/src/features/sporting/**tests**/sporting-time-inputs.test.ts](../apps/mobile/src/features/sporting/__tests__/sporting-time-inputs.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`, `account-session-provider`, `consultation-queries`, `sporting-time`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: sporting-time-presentation.test.tsx

Source: [apps/mobile/src/features/sporting/**tests**/sporting-time-presentation.test.tsx](../apps/mobile/src/features/sporting/__tests__/sporting-time-presentation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `query-client`, `theme-provider`, `account-session-provider`, `use-application-access`, `match-summary`, `match-screen`.
- **Controlled:** installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; selected router/Stack navigation boundary (see declared mock); Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

### Mobile: classification.test.tsx

Source: [apps/mobile/src/features/sporting-administration/**tests**/classification.test.tsx](../apps/mobile/src/features/sporting-administration/__tests__/classification.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `_layout`, `[id]`, `index`, `[id]`, `classification-selection`, `classification-selection-screen`, `presentation-screen`, `new`, `administration-screen`, `current-account`, `entry`, `discovery-state`, `query-client`, `theme-provider`, `use-application-access`, `account-session-provider`, `classification-screen`, `divisions-screen`.
- **Controlled:** Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; react-native-safe-area-context upstream native test double; react-native-keyboard-controller upstream native test double; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: prepare-sporting-logo.test.ts

Source: [apps/mobile/src/features/sporting-administration/**tests**/prepare-sporting-logo.test.ts](../apps/mobile/src/features/sporting-administration/__tests__/prepare-sporting-logo.test.ts).

- **Real:** Owning handwritten modules: `prepare-sporting-logo`.
- **Controlled:** `expo-file-system`; `expo-image-manipulator`
- **Isolation/cleanup:** scenario-local values/owners; global Jest clearMocks clears call history.

### Mobile: presentation.test.tsx

Source: [apps/mobile/src/features/sporting-administration/**tests**/presentation.test.tsx](../apps/mobile/src/features/sporting-administration/__tests__/presentation.test.tsx).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `onboarding`, `_layout`, `[id]`, `entry`, `current-account`, `access-gate-screen`, `query-client`, `theme-provider`, `use-application-access`, `account-session-provider`, `discovery-state`, `presentation-screen`.
- **Controlled:** react-native-safe-area-context upstream native test double; react-native-keyboard-controller upstream native test double; Sentry SDK entry/capture double; RevenueCat public SDK operations replaced by controlled doubles; installation initialization outside this scenario; Auth0 native bridge only; SDK provider/hooks/error classes remain real; Fetch response/abort double (no socket); `expo-image-picker`; `expo-image-manipulator`; `expo-file-system`; official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; fresh Query client per case; Query client cleared in teardown; spies/property replacements restored; environment restored by the declared teardown; RNTL unmount cleanup owns mounted component effects.

### Mobile: sporting-contract.test.ts

Source: [apps/mobile/src/features/sporting-administration/**tests**/sporting-contract.test.ts](../apps/mobile/src/features/sporting-administration/__tests__/sporting-contract.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: support-generated.test.ts

Source: [apps/mobile/src/features/support/**tests**/support-generated.test.ts](../apps/mobile/src/features/support/__tests__/support-generated.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown.

### Mobile: api-fetch.test.ts

Source: [apps/mobile/src/shared/api/**tests**/api-fetch.test.ts](../apps/mobile/src/shared/api/__tests__/api-fetch.test.ts).

- **Real:** Handwritten apiFetch and the generated client/response schemas reached by the scenario. TanStack Query and the application Query setup. Owning handwritten modules: `api-fetch`.
- **Controlled:** Fetch response/abort double (no socket)
- **Isolation/cleanup:** scenario doubles reset before each case; spies/property replacements restored; environment restored by the declared teardown; scenario-local resources also use finally where declared.

### Mobile: image-field-examples.test.tsx

Source: [apps/mobile/src/development/**tests**/image-field-examples.test.tsx](../apps/mobile/src/development/__tests__/image-field-examples.test.tsx).

- **Real:** ImageFieldExamplesScreen, theme/feedback, image selection, prepared-preview state and owned-image disposal.
- **Controlled:** Expo image-picker and File read/delete I/O; Sentry capture. The native byte read is a controlled promise.
- **Limit/cleanup:** The example retains its preview after releasing the picker copy and forwards a data URI to the native image renderer. Jest does not decode native pixels or read/delete actual files. RNTL unmount cleanup disposes the mounted tree.

### Mobile: image-field.test.tsx

Source: [apps/mobile/src/shared/components/**tests**/image-field.test.tsx](../apps/mobile/src/shared/components/__tests__/image-field.test.tsx).

- **Real:** React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `theme-provider`, `image-field`, `use-image-selection` and owned-image disposal. The local controlled owner only forwards the public value and selection contract.
- **Controlled:** Expo image-picker and File I/O; Sentry capture. Native selection results, file existence and deletion are controlled.
- **Limit:** Caller validation is supplied as a public error, not reimplemented in the test. Image source/event assertions do not decode native pixels or prove filesystem behavior.
- **Isolation/cleanup:** scenario doubles reset before each case; RNTL unmount cleanup owns mounted component effects.

### Mobile: sentry-native.test.ts

Source: [apps/mobile/src/shared/observability/**tests**/sentry-native.test.ts](../apps/mobile/src/shared/observability/__tests__/sentry-native.test.ts).

- **Real:** initializeSentry, real Sentry SDK initialization/scope/filter/flush path. Owning handwritten modules: `sentry`.
- **Controlled:** Sentry native bridge only; Sentry import-time maintenance timer controlled; SDK remains real
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown; real Sentry client closed and scope breadcrumbs cleared.

### Mobile: sentry.test.ts

Source: [apps/mobile/src/shared/observability/**tests**/sentry.test.ts](../apps/mobile/src/shared/observability/__tests__/sentry.test.ts).

- **Real:** initializeSentry and its configured sanitization callbacks, invoked directly. Owning handwritten modules: `sentry`.
- **Controlled:** Sentry SDK entry/capture double
- **Isolation/cleanup:** spies/property replacements restored; environment restored by the declared teardown.

### Mobile: query-client.test.ts

Source: [apps/mobile/src/shared/query/**tests**/query-client.test.ts](../apps/mobile/src/shared/query/__tests__/query-client.test.ts).

- **Real:** TanStack Query and the application Query setup. Owning handwritten modules: `query-client`.
- **Controlled:** No module-level double; scenario-local callbacks/spies or explicit data only.
- **Isolation/cleanup:** fresh Query client per case; Query client cleared in teardown; fake timers returned to real timers; global Query online/focus flags reset.

### Mobile: query-root.test.tsx

Source: [apps/mobile/src/shared/query/**tests**/query-root.test.tsx](../apps/mobile/src/shared/query/__tests__/query-root.test.tsx).

- **Real:** TanStack Query and the application Query setup. Auth0 JavaScript SDK and the real account/session provider. React and the actual components/providers mounted in the scenario through React Native Testing Library/Jest Expo. Owning handwritten modules: `_layout`, `account-session-provider`, `query-client`.
- **Controlled:** RevenueCat public SDK operations replaced by controlled doubles; selected router/Stack navigation boundary (see declared mock); Sentry SDK entry/capture double; Auth0 native bridge only; SDK provider/hooks/error classes remain real; official AsyncStorage Jest in-memory double
- **Isolation/cleanup:** scenario doubles reset before each case; environment restored by the declared teardown; fake timers returned to real timers; RNTL unmount cleanup owns mounted component effects.

### Mobile: session-isolation.test.tsx

Source: [native identity/cache boundary](../apps/mobile/src/shared/query/__tests__/session-isolation.test.tsx).

- **Real:** Auth0 JavaScript provider/reducer, AccountSessionProvider and its subject-keyed private QueryClient, the independent public client and native MutationObserver.
- **Controlled:** F14 initialization, native Auth0 bridge and synthetic HTTPS responses; no hook or Query result replacement.
- **Isolation/cleanup:** actual subject change tears down the old private tree; clients and detached cache data are cleared after the assertion.

### Mobile: session-consumers.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/accounts/__tests__/session-consumers.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: advertising-privacy.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/advertising/__tests__/advertising-privacy.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: sporting-ad-entry.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/advertising/__tests__/sporting-ad-entry.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: report-contribution.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/contributions/__tests__/report-contribution.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: submit-contribution.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/contributions/__tests__/submit-contribution.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: search-examples.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/discovery/__tests__/search-examples.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: search-filters.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/discovery/__tests__/search-filters.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: search-navigation.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/discovery/__tests__/search-navigation.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: search-options-query.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/discovery/__tests__/search-options-query.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: search-recovery.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/discovery/__tests__/search-recovery.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: follow-recovery.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/following/__tests__/follow-recovery.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: followed-lists.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/following/__tests__/followed-lists.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: follower-count.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/following/__tests__/follower-count.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: personal-calendar.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/following/__tests__/personal-calendar.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: personal-screen.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/following/__tests__/personal-screen.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: personal-season.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/following/__tests__/personal-season.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: inbox-expiry.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/notifications/__tests__/inbox-expiry.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: inbox-navigation.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/notifications/__tests__/inbox-navigation.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: inbox-screen.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/notifications/__tests__/inbox-screen.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: inbox.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/notifications/__tests__/inbox.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: native-notifications.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/notifications/__tests__/native-notifications.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: push-registration.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/notifications/__tests__/push-registration.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: pro-offering-queries.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/pro/api/__tests__/pro-offering-queries.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: pool-map-query.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/pool-map-query.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: pool-map.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/pool-map.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: pool-restrictions-query.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/pool-restrictions-query.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: pool-standings-query.test.ts

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/pool-standings-query.test.ts).

- **Real:** The linked owning handwritten module and native generated/Query boundary where declared by the scenario.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: pool-standings.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/pool-standings.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: sporting-calendar-query.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/sporting-calendar-query.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: sporting-calendar.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/sporting/__tests__/sporting-calendar.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: support-session.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/support/__tests__/support-session.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: use-native-handoff.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/shared/native/__tests__/use-native-handoff.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: application-versions-draft.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/access/__tests__/application-versions-draft.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: presentation-draft.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/sporting-administration/__tests__/presentation-draft.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: profile-navigation.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/accounts/__tests__/profile-navigation.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: contribution-entry.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/contributions/__tests__/contribution-entry.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: contribution-navigation.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/contributions/__tests__/contribution-navigation.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: own-contribution-lifecycle.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/contributions/__tests__/own-contribution-lifecycle.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.

### Mobile: privacy-sheet.test.tsx

Source: [owning executable scenarios](../apps/mobile/src/features/privacy/__tests__/privacy-sheet.test.tsx).

- **Real:** The linked owning handwritten module and its actual React provider/form/query composition.
- **Controlled:** Native or HTTP I/O at the explicit test boundary; these cases claim no physical device or provider acceptance.
- **Isolation/cleanup:** Scenario-local doubles, actual client/component teardown and restored environment/clocks as declared in source.
