package com.blockout.backend.access.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.generated.mobile.model.ApplicationAccessResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises configured Jackson and generated validation without a servlet or persistence context.
 */
@JsonTest
@Import(HttpConfiguration.class)
@ImportAutoConfiguration(ValidationAutoConfiguration.class)
@DisplayName("Access generated JSON contract")
class AccessContractJsonTest {
  @Autowired private JsonMapper mapper;

  @Test
  @DisplayName("Serializes complete nullable access groups and additive response fields")
  void preservesCompleteAccess() throws Exception {
    // Given
    String body =
        """
        {
          "maintenance": {"revision":9007199254740991,"active":false,"message":null,"imageUrl":null},
          "versions": {
            "revision":9007199254740991,
            "ios":{"minimumVersion":null,"storeUrl":null,"future":true},
            "android":{"minimumVersion":null,"storeUrl":null},"message":null
          },
          "future":true
        }
        """;

    ApplicationAccessResponse response = mapper.readValue(body, ApplicationAccessResponse.class);

    // When
    String serialized = mapper.writeValueAsString(response);

    // Then
    assertThat(mapper.readTree(serialized)).isEqualTo(mapper.readTree(body));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"manageMaintenance\":false}",
        "{\"manageMaintenance\":true,\"future\":true}"
      })
  @DisplayName("Preserves absent and boolean permissions without inserting privileges")
  void preservesPermissions(String permissions) throws Exception {
    // Given
    String body = accountWithPermissions(permissions);
    AccountResponse response = mapper.readValue(body, AccountResponse.class);

    // When
    String serialized = mapper.writeValueAsString(response);

    // Then
    assertThat(mapper.readTree(serialized)).isEqualTo(mapper.readTree(body));
  }

  /**
   * Supplies required synthetic account data while keeping decisive permission input explicit.
   *
   * @param permissions raw JSON for the permission projection under test
   * @return complete account JSON
   */
  private static String accountWithPermissions(String permissions) {
    return """
        {"accountId":"00000000-0000-4000-8000-000000000001","username":"Synthetic",
         "email":"fixture@example.invalid","principalCreatedAt":null,"hasPhoto":false,
         "permissions":%s}
        """
        .formatted(permissions);
  }
}
