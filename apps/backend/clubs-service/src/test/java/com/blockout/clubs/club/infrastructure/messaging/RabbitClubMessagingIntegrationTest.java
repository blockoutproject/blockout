package com.blockout.clubs.club.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.club.application.views.ClubView;
import com.blockout.clubs.config.RabbitMQConfig;
import java.nio.charset.StandardCharsets;
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

@SpringBootTest(classes = RabbitClubMessagingIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit club messaging integration")
class RabbitClubMessagingIntegrationTest {

  private static final String UPSERT_QUEUE = "club.upsert.queue.integration";

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @Autowired private RabbitClubEventPublisher publisher;

  @BeforeEach
  void prepareQueues() {
    Queue queue = new Queue(UPSERT_QUEUE, false, true, true);
    rabbitAdmin.declareQueue(queue);
    rabbitAdmin.declareBinding(
        BindingBuilder.bind(queue)
            .to(new TopicExchange(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE))
            .with("club.upsert"));
    rabbitAdmin.purgeQueue(RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS, false);
  }

  @AfterEach
  void deleteUpsertQueue() {
    rabbitAdmin.deleteQueue(UPSERT_QUEUE);
  }

  @Test
  @DisplayName("publishes the search projection as JSON through the lifecycle exchange")
  void publishesSearchProjection() {
    publisher.publishClubUpsert(
        new ClubView(
            "club-7",
            "Raw Club",
            "Club Seven",
            "7 Main Street",
            "Paris",
            "75007",
            "club@example.test",
            "0102030405",
            "https://club.example.test",
            "logo.png",
            true,
            48.85,
            2.35,
            null,
            null));

    var message = rabbitTemplate.receive(UPSERT_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"id\":\"club-7\"")
        .contains("\"name\":\"Club Seven\"")
        .contains("\"city\":\"Paris\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
  }

  @Test
  @DisplayName("routes club deactivation commands to the owned queue")
  void routesDeactivationCommands() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "club.deactivation", Map.of("clubId", "club-7"));

    var message = rabbitTemplate.receive(RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"clubId\":\"club-7\"");
  }

  @SpringBootConfiguration
  @ImportAutoConfiguration(RabbitAutoConfiguration.class)
  @Import({RabbitMQConfig.class, RabbitClubEventPublisher.class})
  static class TestApplication {

    @Bean
    RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
      return new RabbitAdmin(connectionFactory);
    }
  }
}
