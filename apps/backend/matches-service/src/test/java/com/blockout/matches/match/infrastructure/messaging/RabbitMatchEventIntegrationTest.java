package com.blockout.matches.match.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.match.application.views.MatchView;
import java.nio.charset.StandardCharsets;
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

@SpringBootTest(classes = RabbitMatchEventIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit match event integration")
class RabbitMatchEventIntegrationTest {

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @Autowired private RabbitMatchEventPublisher publisher;

  @BeforeEach
  void purgeNotificationQueues() {
    rabbitAdmin.purgeQueue(RabbitMQConfig.MATCH_FINISHED_QUEUE, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.MATCH_LIVE_LINK_CREATED_QUEUE, false);
  }

  @Test
  @DisplayName("publishes serialized match completion events to the notification queue")
  void publishesMatchCompletionEvents() {
    publisher.publishMatchFinished(
        new MatchView(
            17L,
            "match-17",
            "league",
            5L,
            null,
            2L,
            3L,
            null,
            "2026",
            "3-1",
            null,
            null,
            null,
            null,
            null,
            true,
            null,
            null,
            null,
            null,
            null));

    var message = rabbitTemplate.receive(RabbitMQConfig.MATCH_FINISHED_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"id\":17")
        .contains("\"teamIdA\":2")
        .contains("\"teamIdB\":3")
        .contains("\"poolId\":5")
        .contains("\"set\":\"3-1\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
  }

  @SpringBootConfiguration
  @ImportAutoConfiguration(RabbitAutoConfiguration.class)
  @Import({RabbitMQConfig.class, RabbitMatchEventPublisher.class})
  static class TestApplication {

    @Bean
    RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
      return new RabbitAdmin(connectionFactory);
    }
  }
}
