package com.blockout.workersearch.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.workersearch.config.RabbitMQConfig;
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

@SpringBootTest(classes = RabbitSearchTopologyIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit search topology integration")
class RabbitSearchTopologyIntegrationTest {

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @BeforeEach
  void purgeQueues() {
    rabbitAdmin.purgeQueue(RabbitMQConfig.TEAM_UPSERT_QUEUE_SEARCH, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.TEAM_UPSERT_DLQ_SEARCH, false);
  }

  @Test
  @DisplayName("dead-letters rejected team projection events")
  void deadLettersRejectedTeamProjectionEvents() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
        "team.upsert",
        Map.of("id", 22, "name", "Team Twenty-Two"));

    Boolean rejected =
        rabbitTemplate.execute(
            channel -> {
              GetResponse response =
                  channel.basicGet(RabbitMQConfig.TEAM_UPSERT_QUEUE_SEARCH, false);
              if (response == null) {
                return false;
              }
              channel.basicReject(response.getEnvelope().getDeliveryTag(), false);
              return true;
            });

    assertThat(rejected).isTrue();

    var message = rabbitTemplate.receive(RabbitMQConfig.TEAM_UPSERT_DLQ_SEARCH, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"id\":22")
        .contains("\"name\":\"Team Twenty-Two\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
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
