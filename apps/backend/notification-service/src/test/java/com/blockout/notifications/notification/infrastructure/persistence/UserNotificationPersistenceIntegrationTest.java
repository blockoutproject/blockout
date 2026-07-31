package com.blockout.notifications.notification.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.blockout.notifications.notification.infrastructure.http.Auth0ServiceTokenProvider;
import com.blockout.notifications.notification.infrastructure.persistence.entities.UserNotificationEntity;
import com.blockout.notifications.notification.infrastructure.persistence.repositories.UserNotificationRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** Verifies the Jackson 3 mapping used by the notification JSONB persistence boundary. */
@SpringBootTest(
    properties = {
      "spring.rabbitmq.dynamic=false",
      "spring.rabbitmq.listener.simple.auto-startup=false"
    })
@Testcontainers
@DisplayName("User notification persistence")
class UserNotificationPersistenceIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

  @Autowired UserNotificationRepository repository;

  @Autowired EntityManager entityManager;

  @Autowired ObjectMapper objectMapper;

  @MockitoBean Auth0ServiceTokenProvider auth0ServiceTokenProvider;

  @Test
  @Transactional
  @DisplayName("round-trips structured metadata through JSONB")
  void roundTripsStructuredMetadataThroughJsonb() {
    assertThat(objectMapper).isInstanceOf(JsonMapper.class);

    var metadata = objectMapper.createObjectNode();
    metadata.put("divisionId", 4L);
    metadata.putObject("source").put("provider", "ffvb");

    var saved =
        repository.saveAndFlush(
            UserNotificationEntity.builder()
                .userId(42L)
                .type(NotificationType.MATCH_FINISHED)
                .title("Result available")
                .body("The match result is available.")
                .targetType(NotificationTargetType.MATCH)
                .targetId(7L)
                .metadata(metadata)
                .build());
    entityManager.clear();

    var reloaded = repository.findById(saved.getId()).orElseThrow();

    assertThat(reloaded.getMetadata().path("divisionId").asLong()).isEqualTo(4L);
    assertThat(reloaded.getMetadata().path("source").path("provider").asString()).isEqualTo("ffvb");
  }
}
