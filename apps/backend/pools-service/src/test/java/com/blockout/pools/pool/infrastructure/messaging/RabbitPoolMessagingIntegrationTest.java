package com.blockout.pools.pool.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;
import com.blockout.pools.pool.application.views.PoolView;
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

@SpringBootTest(classes = RabbitPoolMessagingIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Rabbit pool messaging integration")
class RabbitPoolMessagingIntegrationTest {

  private static final String UPSERT_QUEUE = "pool.upsert.queue.integration";

  @Container @ServiceConnection
  static final RabbitMQContainer rabbitMQ =
      new RabbitMQContainer(DockerImageName.parse("rabbitmq:4-management"));

  @Autowired private RabbitAdmin rabbitAdmin;

  @Autowired private RabbitTemplate rabbitTemplate;

  @Autowired private RabbitPoolEventPublisher publisher;

  @BeforeEach
  void prepareQueues() {
    Queue queue = new Queue(UPSERT_QUEUE, false, true, true);
    rabbitAdmin.declareQueue(queue);
    rabbitAdmin.declareBinding(
        BindingBuilder.bind(queue)
            .to(new TopicExchange(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE))
            .with("pool.upsert"));
    rabbitAdmin.purgeQueue(RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS, false);
    rabbitAdmin.purgeQueue(RabbitMQConfig.POOL_FOLLOW_QUEUE, false);
  }

  @AfterEach
  void deleteUpsertQueue() {
    rabbitAdmin.deleteQueue(UPSERT_QUEUE);
  }

  @Test
  @DisplayName("publishes serialized pool projections through the lifecycle exchange")
  void publishesSerializedPoolProjections() {
    publisher.publishPoolUpsert(
        new PoolView(
            12L,
            "pool-12",
            "league",
            "2026",
            "League",
            "Raw Pool",
            "Pool Twelve",
            "P12",
            4L,
            Format.SIX,
            Gender.F,
            17L,
            true,
            LocalDateTime.now(),
            LocalDateTime.now()));

    var message = rabbitTemplate.receive(UPSERT_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"id\":12")
        .contains("\"name\":\"Pool Twelve\"")
        .contains("\"leagueCode\":\"league\"");
    assertThat(rabbitMQ.getMappedPort(5672)).isNotEqualTo(5672);
  }

  @Test
  @DisplayName("routes pool deactivation commands to the owned queue")
  void routesPoolDeactivationCommands() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "pool.deactivation", Map.of("poolId", 12));

    var message = rabbitTemplate.receive(RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8)).contains("\"poolId\":12");
  }

  @Test
  @DisplayName("routes pool follow events to the owned queue")
  void routesPoolFollowEvents() {
    rabbitTemplate.convertAndSend(
        RabbitMQConfig.USER_FOLLOW_EXCHANGE,
        "pool.follow",
        Map.of("userId", "user-2", "entityId", "pool-12"));

    var message = rabbitTemplate.receive(RabbitMQConfig.POOL_FOLLOW_QUEUE, 5_000);

    assertThat(message).isNotNull();
    assertThat(new String(message.getBody(), StandardCharsets.UTF_8))
        .contains("\"userId\":\"user-2\"")
        .contains("\"entityId\":\"pool-12\"");
  }

  @SpringBootConfiguration
  @ImportAutoConfiguration(RabbitAutoConfiguration.class)
  @Import({RabbitMQConfig.class, RabbitPoolEventPublisher.class})
  static class TestApplication {

    @Bean
    RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
      return new RabbitAdmin(connectionFactory);
    }
  }
}
