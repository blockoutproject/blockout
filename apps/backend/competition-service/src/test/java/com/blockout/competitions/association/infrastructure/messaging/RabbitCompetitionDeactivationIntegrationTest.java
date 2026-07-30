package com.blockout.competitions.association.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.competitions.config.RabbitMQConfig;
import java.nio.charset.StandardCharsets;
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
import org.springframework.boot.amqp.autoconfigure.RabbitAutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(classes = RabbitCompetitionDeactivationIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit competition deactivation integration")
class RabbitCompetitionDeactivationIntegrationTest {

  private static final String TEST_QUEUE = "competition.deactivation.queue.integration";

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @Autowired private RabbitCompetitionDeactivationPublisher publisher;

  @BeforeEach
  void declareConsumerQueue() {
    Queue queue = new Queue(TEST_QUEUE, false, true, true);
    rabbitAdmin.declareQueue(queue);
    rabbitAdmin.declareBinding(
        BindingBuilder.bind(queue)
            .to(new TopicExchange(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE))
            .with("club.deactivation"));
  }

  @AfterEach
  void deleteConsumerQueue() {
    rabbitAdmin.deleteQueue(TEST_QUEUE);
  }

  @Test
  @DisplayName("publishes serialized cascade commands through the lifecycle exchange")
  void publishesSerializedCascadeCommands() {
    publisher.publishClubDeactivation("club-11");

    var message = rabbitTemplate.receive(TEST_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"clubId\":\"club-11\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
  }

  @SpringBootConfiguration
  @ImportAutoConfiguration(RabbitAutoConfiguration.class)
  @Import({RabbitMQConfig.class, RabbitCompetitionDeactivationPublisher.class})
  static class TestApplication {

    @Bean
    RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
      return new RabbitAdmin(connectionFactory);
    }
  }
}
