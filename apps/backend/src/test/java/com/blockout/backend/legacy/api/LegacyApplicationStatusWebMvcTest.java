package com.blockout.backend.legacy.api;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Exercises the legacy wire contract and real security policy with synthetic deployment values. */
@WebMvcTest(
    controllers = LegacyApplicationStatusController.class,
    properties = {
      "blockout.legacy.min-version-ios=2.0.0",
      "blockout.legacy.min-version-android=2.1.0",
      "blockout.legacy.store-url-ios=https://apps.apple.com/app/id123456789",
      "blockout.legacy.store-url-android=https://play.google.com/store/apps/details?id=com.blockoutproject.blockout"
    })
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  LegacyApplicationStatusMapperImpl.class
})
@DisplayName("Legacy application update status")
class LegacyApplicationStatusWebMvcTest {
  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("Returns the flat historical response without credentials or maintenance")
  void returnsHistoricalResponse() throws Exception {
    // Given
    String path = "/api/v1/mobile/public/config/app-status";

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(
            content()
                .json(
                    """
                    {
                      "maintenance": false,
                      "message": null,
                      "image_url": null,
                      "last_update": null,
                      "min_version_ios": "2.0.0",
                      "min_version_android": "2.1.0",
                      "store_url_ios": "https://apps.apple.com/app/id123456789",
                      "store_url_android": "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout"
                    }
                    """,
                    JsonCompareMode.STRICT));
  }

  @Test
  @DisplayName("Returns public update status despite a malformed bearer")
  void ignoresMalformedBearer() throws Exception {
    // Given
    String path = "/api/v1/mobile/public/config/app-status";

    // When
    ResultActions response = mvc.perform(get(path).header("Authorization", "Bearer not-a-jwt"));

    // Then
    response.andExpect(status().isOk());
  }

  @Test
  @DisplayName("Returns public update status for an old authenticated client")
  void ignoresOldClientIdentity() throws Exception {
    // Given
    String path = "/api/v1/mobile/public/config/app-status";

    // When
    ResultActions response =
        mvc.perform(get(path).with(jwt().jwt(token -> token.claim("azp", "old-client"))));

    // Then
    response.andExpect(status().isOk());
  }

  @ParameterizedTest
  @CsvSource({
    "POST, /api/v1/mobile/public/config/app-status",
    "GET, /api/v1/mobile/public/config/app-status/other",
    "GET, /application-access"
  })
  @DisplayName("Rejects malformed bearers outside the exact legacy status GET")
  void rejectsMalformedBearerOutsideStatusRead(String method, String path) throws Exception {
    // Given
    HttpMethod httpMethod = HttpMethod.valueOf(method);

    // When
    ResultActions response =
        mvc.perform(request(httpMethod, path).header("Authorization", "Bearer not-a-jwt"));

    // Then
    response.andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Does not expose an authenticated legacy status mutation")
  void refusesStatusMutation() throws Exception {
    // Given
    String path = "/api/v1/mobile/public/config/app-status";

    // When
    ResultActions response =
        mvc.perform(post(path).with(jwt().jwt(token -> token.claim("azp", "mobile-test"))));

    // Then
    response.andExpect(status().isMethodNotAllowed());
  }

  @Test
  @DisplayName("A public status read grants no access to old business paths")
  void grantsNoLegacyBusinessAccess() throws Exception {
    // Given
    mvc.perform(get("/api/v1/mobile/public/config/app-status")).andExpect(status().isOk());

    // When
    ResultActions response =
        mvc.perform(
            post("/api/v1/mobile/accounts")
                .with(jwt().jwt(token -> token.claim("azp", "old-client"))));

    // Then
    response.andExpect(status().isForbidden());
  }
}
