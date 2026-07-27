package com.blockout.notifications.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.config.RabbitMQConfig;
import com.rabbitmq.client.GetResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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

@SpringBootTest(classes = RabbitNotificationTopologyIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit notification topology integration")
class RabbitNotificationTopologyIntegrationTest {

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @BeforeEach
  void purgeQueues() {
    rabbitAdmin.purgeQueue(RabbitMQConfig.TEAM_FOLLOW_QUEUE_NOTIFICATIONS, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.TEAM_FOLLOW_DLQ_NOTIFICATIONS, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.MATCH_FINISHED_QUEUE, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.MATCH_FINISHED_DLQ, false);
  }

  @Test
  @DisplayName("dead-letters rejected user follow events")
  void deadLettersRejectedUserFollowEvents() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.USER_FOLLOW_EXCHANGE,
        RabbitMQConfig.RK_TEAM_FOLLOW,
        Map.of("userId", "user-3", "entityId", "team-8"));

    rejectFirstMessage(RabbitMQConfig.TEAM_FOLLOW_QUEUE_NOTIFICATIONS);

    var message = rabbitTemplate.receive(RabbitMQConfig.TEAM_FOLLOW_DLQ_NOTIFICATIONS, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"userId\":\"user-3\"")
        .contains("\"entityId\":\"team-8\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
  }

  @Test
  @DisplayName("dead-letters rejected match lifecycle events")
  void deadLettersRejectedMatchLifecycleEvents() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
        RabbitMQConfig.RK_MATCH_FINISHED,
        Map.of("id", 31, "set", "3-2"));

    rejectFirstMessage(RabbitMQConfig.MATCH_FINISHED_QUEUE);

    var message = rabbitTemplate.receive(RabbitMQConfig.MATCH_FINISHED_DLQ, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"id\":31")
        .contains("\"set\":\"3-2\"");
  }

  private void rejectFirstMessage(String queue) {
    Boolean rejected =
        rabbitTemplate.execute(
            channel -> {
              GetResponse response = channel.basicGet(queue, false);
              if (response == null) {
                return false;
              }
              channel.basicReject(response.getEnvelope().getDeliveryTag(), false);
              return true;
            });

    assertThat(rejected).isTrue();
  }

  @SpringBootConfiguration
  @ImportAutoConfiguration(RabbitAutoConfiguration.class)
  @Import(RabbitMQConfig.class)
  static class TestApplication {

    @Bean
    RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
      return new RabbitAdmin(connectionFactory);
    }
  }
}
