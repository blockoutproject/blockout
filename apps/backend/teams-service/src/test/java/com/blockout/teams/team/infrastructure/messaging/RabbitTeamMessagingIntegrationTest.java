package com.blockout.teams.team.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.application.views.TeamView;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(classes = RabbitTeamMessagingIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit team messaging integration")
class RabbitTeamMessagingIntegrationTest {

  private static final String UPSERT_QUEUE = "team.upsert.queue.integration";

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @Autowired private RabbitTeamEventPublisher publisher;

  @BeforeEach
  void prepareQueues() {
    Queue queue = new Queue(UPSERT_QUEUE, false, true, true);
    rabbitAdmin.declareQueue(queue);
    rabbitAdmin.declareBinding(
        BindingBuilder.bind(queue)
            .to(new TopicExchange(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE))
            .with("team.upsert"));
    rabbitAdmin.purgeQueue(RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.TEAM_FOLLOW_QUEUE, false);
  }

  @AfterEach
  void deleteUpsertQueue() {
    rabbitAdmin.deleteQueue(UPSERT_QUEUE);
  }

  @Test
  @DisplayName("publishes serialized team projections through the lifecycle exchange")
  void publishesSerializedTeamProjections() {
    publisher.publishTeamUpsert(
        new TeamView(
            22L,
            "club-4",
            "Raw Team",
            "Team Twenty-Two",
            "T22",
            "league",
            3L,
            "2026",
            Format.SIX,
            Gender.F,
            19L,
            "logo.png",
            true,
            LocalDateTime.now(),
            LocalDateTime.now()));

    var message = rabbitTemplate.receive(UPSERT_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"id\":22")
        .contains("\"clubId\":\"club-4\"")
        .contains("\"name\":\"Team Twenty-Two\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
  }

  @Test
  @DisplayName("routes team deactivation commands to the owned queue")
  void routesTeamDeactivationCommands() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "team.deactivation", Map.of("teamId", 22));

    var message = rabbitTemplate.receive(RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8)).contains("\"teamId\":22");
  }

  @Test
  @DisplayName("routes club deactivation commands to the owned queue")
  void routesClubDeactivationCommands() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "club.deactivation", Map.of("clubId", "club-4"));

    var message = rabbitTemplate.receive(RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"clubId\":\"club-4\"");
  }

  @Test
  @DisplayName("routes team follow events to the owned queue")
  void routesTeamFollowEvents() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.USER_FOLLOW_EXCHANGE,
        "team.follow",
        Map.of("userId", "user-2", "entityId", "team-22"));

    var message = rabbitTemplate.receive(RabbitMQConfig.TEAM_FOLLOW_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"userId\":\"user-2\"")
        .contains("\"entityId\":\"team-22\"");
  }

  @SpringBootConfiguration
  @ImportAutoConfiguration(RabbitAutoConfiguration.class)
  @Import({RabbitMQConfig.class, RabbitTeamEventPublisher.class})
  static class TestApplication {

    @Bean
    RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
      return new RabbitAdmin(connectionFactory);
    }
  }
}
