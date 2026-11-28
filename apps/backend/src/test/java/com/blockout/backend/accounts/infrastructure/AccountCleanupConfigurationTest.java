package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.auth0.client.mgmt.ManagementApi;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.config.SecurityProperties;
import com.blockout.backend.shared.image.ImageObjects;
import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.client.RestClient;

/** Native typed settings and shared SDK wiring without any database or network request. */
@DisplayName("Cleanup configuration and shared provider wiring")
class AccountCleanupConfigurationTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner()
          .withInitializer(new ConfigDataApplicationContextInitializer())
          .withUserConfiguration(Settings.class);

  @Test
  @DisplayName("The application YAML supplies no provider cleanup targets or credentials")
  void defaultsToUnconfigured() {
    // Given
    ApplicationContextRunner defaults = context;

    // When
    defaults.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          AccountCleanupProperties properties = application.getBean(AccountCleanupProperties.class);
          assertThat(properties.auth0Connections()).isEmpty();
          assertThat(properties.revenueCatSecretKey()).isEmpty();
          assertThat(properties.revenueCatProjectId()).isEmpty();
        });
  }

  @ParameterizedTest
  @ValueSource(strings = {"0ms", "-1s", "invalid"})
  @DisplayName("Invalid cleanup deadlines fail native validation")
  void rejectsUnboundedDeadline(String deadline) {
    // Given
    ApplicationContextRunner invalid =
        context.withPropertyValues("blockout.accounts.cleanup.read-timeout=" + deadline);

    // When
    invalid.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }

  @Test
  @DisplayName("Native optional SDK wiring stays absent when server registration is missing")
  void permitsMissingProviderConfiguration() {
    // Given
    ApplicationContextRunner missing = wired();

    // When
    missing.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          assertThat(
                  application
                      .getBean(AccountCleanup.Auth0.class)
                      .remove("https://identity.example.invalid/", "auth0|synthetic"))
              .isEqualTo(Outcome.NOT_CONFIGURED);
          assertThat(application.getBean(PrincipalReader.class)).isNotNull();
        });
  }

  @Test
  @DisplayName("An Auth0 cleanup connection with no Management SDK requires attention")
  void reportsMissingManagementSdkForConfiguredConnection() {
    // Given
    ApplicationContextRunner incomplete =
        wired().withPropertyValues("blockout.accounts.cleanup.auth0-connections=synthetic");

    // When
    incomplete.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          assertThat(
                  application
                      .getBean(AccountCleanup.Auth0.class)
                      .remove("https://identity.example.invalid/", "auth0|synthetic"))
              .isEqualTo(Outcome.MISSING_CONFIGURATION);
        });
  }

  @Test
  @DisplayName("The configured native Management SDK is shared by establishment and cleanup")
  void wiresConfiguredSdk() {
    // Given
    ClientRegistration registration =
        ClientRegistration.withRegistrationId("auth0")
            .clientId("synthetic")
            .clientSecret("synthetic-secret")
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .tokenUri("http://127.0.0.1:1/not-called")
            .build();
    InMemoryClientRegistrationRepository registrations =
        new InMemoryClientRegistrationRepository(registration);
    ApplicationContextRunner configured =
        wired()
            .withPropertyValues("blockout.accounts.auth0.audience=http://127.0.0.1:1/api/v2/")
            .withBean(
                "registrations", InMemoryClientRegistrationRepository.class, () -> registrations)
            .withBean(
                InMemoryOAuth2AuthorizedClientService.class,
                () -> new InMemoryOAuth2AuthorizedClientService(registrations));

    // When
    configured.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          assertThat(application.getBean(ManagementApi.class)).isNotNull();
          assertThat(application.getBean(PrincipalReader.class)).isNotNull();
          assertThat(
                  application
                      .getBean(AccountCleanup.Auth0.class)
                      .remove("https://identity.example.invalid/", "auth0|synthetic"))
              .isEqualTo(Outcome.NOT_CONFIGURED);
        });
  }

  /**
   * @return real provider factories with explicit synthetic security and native validation
   */
  private ApplicationContextRunner wired() {
    return context
        .withUserConfiguration(Auth0Configuration.class, AccountCleanupConfiguration.class)
        .withBean(RestClient.Builder.class, RestClient::builder)
        .withBean(ImageObjects.class, () -> mock(ImageObjects.class))
        .withBean(LocalValidatorFactoryBean.class, LocalValidatorFactoryBean::new)
        .withBean(
            SecurityProperties.class,
            () ->
                new SecurityProperties(
                    URI.create("https://identity.example.invalid/"),
                    "mobile",
                    "mobile",
                    "collector",
                    "collector"));
  }

  /**
   * Loads only the two native properties owners; production configuration supplies actual defaults.
   */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties({AccountCleanupProperties.class, Auth0Properties.class})
  static class Settings {}
}
