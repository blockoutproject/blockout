package com.blockout.backend.legacy.api;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Qualifies the frozen legacy read against real F12 HTTP commands, admission and migrated SQL. JWT
 * authentication uses Spring Security test support; no provider or V1 binary runs.
 */
@SpringBootTest(
    properties = {
      "blockout.legacy.min-version-ios=2.0.0",
      "blockout.legacy.min-version-android=2.1.0",
      "blockout.legacy.store-url-ios=https://apps.apple.com/app/id123456789",
      "blockout.legacy.store-url-android=https://play.google.com/store/apps/details?id=com.blockoutproject.blockout"
    })
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Legacy retirement independent of current F12 settings")
class LegacyApplicationStatusIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID EDITOR = UUID.fromString("00000000-0000-4000-8000-000000000159");
  private static final String LEGACY_PATH = "/api/v1/mobile/public/config/app-status";
  private static final String LEGACY_RESPONSE =
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
      """;

  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate sql;

  /**
   * Runs the committed migrations before opening the restricted application connection.
   *
   * @param properties native registry receiving this suite's disposable database coordinates
   * @throws Exception if the real migration boundary fails
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Restores this suite's committed settings and an editor with only the two required grants. */
  @BeforeEach
  void prepare() {
    sql.update("DELETE FROM account");
    sql.update(
        "UPDATE access_settings SET active=false, revision=0, message='Pause en cours', image_url=NULL WHERE id='maintenance'");
    sql.update(
        "UPDATE access_settings SET revision=0, message=NULL, ios_minimum_version='3.0.0', ios_store_url='https://apps.apple.com/app/id111222333', android_minimum_version='3.0.0', android_store_url='https://play.google.com/store/apps/details?id=com.blockoutproject.blockout&hl=en' WHERE id='versions'");
    sql.update(
        "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'auth0|159', 'Editor_159', 'editor@example.invalid')",
        EDITOR);
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.manage'), (?, 'application-versions.manage')",
        EDITOR,
        EDITOR);
  }

  @Test
  @DisplayName("Keeps the exact legacy response public after actual F12 maintenance activation")
  void preservesLegacyReadAcrossActivation() throws Exception {
    // Given
    mvc.perform(get(LEGACY_PATH))
        .andExpect(status().isOk())
        .andExpect(content().json(LEGACY_RESPONSE, JsonCompareMode.STRICT));

    // When
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(editor())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"active\":true}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(1));
    ResultActions legacy =
        mvc.perform(get(LEGACY_PATH).header("Authorization", "Bearer obsolete-v1"));

    // Then
    legacy
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().json(LEGACY_RESPONSE, JsonCompareMode.STRICT));
    mvc.perform(get("/application-access"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(true))
        .andExpect(jsonPath("$.maintenance.message").value("Pause en cours"));
    mvc.perform(get("/clubs"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    mvc.perform(
            post("/api/v1/mobile/accounts")
                .with(jwt().jwt(token -> token.claim("azp", "old-client"))))
        .andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @CsvSource({"1.0.0, 1.1.0", "9.0.0, 10.0.0"})
  @DisplayName("Keeps fixed retirement thresholds when F12 versions and store links change")
  void preservesRetirementAfterVersionChanges(String ios, String android) throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    String change =
        """
        {
          "revision": 0,
          "ios": {"minimumVersion": "%s", "storeUrl": "https://apps.apple.com/app/id987654321"},
          "android": {"minimumVersion": "%s", "storeUrl": "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout&hl=fr"},
          "message": "Nouvelle version V2"
        }
        """
            .formatted(ios, android);

    // When
    mvc.perform(
            patch("/administration/application-versions")
                .with(editor())
                .contentType(MediaType.APPLICATION_JSON)
                .content(change))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(1));
    ResultActions legacy = mvc.perform(get(LEGACY_PATH));

    // Then
    legacy
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().json(LEGACY_RESPONSE, JsonCompareMode.STRICT));
    mvc.perform(get("/application-access"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(true))
        .andExpect(jsonPath("$.versions.ios.minimumVersion").value(ios))
        .andExpect(jsonPath("$.versions.android.minimumVersion").value(android))
        .andExpect(
            jsonPath("$.versions.ios.storeUrl").value("https://apps.apple.com/app/id987654321"))
        .andExpect(
            jsonPath("$.versions.android.storeUrl")
                .value(
                    "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout&hl=fr"))
        .andExpect(jsonPath("$.versions.message").value("Nouvelle version V2"));
  }

  @Test
  @DisplayName("Keeps retirement configured when F12 removes both version minima and store links")
  void preservesRetirementAfterVersionRemoval() throws Exception {
    // Given
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    String change =
        """
        {
          "revision": 0,
          "ios": {"minimumVersion": null, "storeUrl": null},
          "android": {"minimumVersion": null, "storeUrl": null},
          "message": null
        }
        """;

    // When
    mvc.perform(
            patch("/administration/application-versions")
                .with(editor())
                .contentType(MediaType.APPLICATION_JSON)
                .content(change))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(1));
    ResultActions legacy = mvc.perform(get(LEGACY_PATH));

    // Then
    legacy
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().json(LEGACY_RESPONSE, JsonCompareMode.STRICT));
    mvc.perform(get("/application-access"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(true))
        .andExpect(jsonPath("$.versions.ios.minimumVersion").isEmpty())
        .andExpect(jsonPath("$.versions.ios.storeUrl").isEmpty())
        .andExpect(jsonPath("$.versions.android.minimumVersion").isEmpty())
        .andExpect(jsonPath("$.versions.android.storeUrl").isEmpty());
  }

  /** Returns the editor's validated mobile identity; it supplies no business grant in its JWT. */
  private static RequestPostProcessor editor() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("auth0|159")
                    .claim("azp", "mobile-test"));
  }
}
