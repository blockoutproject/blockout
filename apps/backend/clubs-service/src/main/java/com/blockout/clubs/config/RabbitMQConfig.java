package com.blockout.clubs.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

  public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";

  public static final String CLUB_DEACTIVATION_QUEUE_CLUBS = "club.deactivation.queue.clubs";

  @Bean
  public TopicExchange entityLifecycleExchange() {
    return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
  }

  @Bean
  public Queue clubDeactivationQueueClubs() {
    return new Queue(CLUB_DEACTIVATION_QUEUE_CLUBS, true);
  }

  @Bean
  public Binding bindClubDeactivationQueueClubs(
      TopicExchange entityLifecycleExchange, Queue clubDeactivationQueueClubs) {
    return BindingBuilder.bind(clubDeactivationQueueClubs)
        .to(entityLifecycleExchange)
        .with("club.deactivation");
  }

  @Bean
  public MessageConverter messageConverter() {
    return new JacksonJsonMessageConverter();
  }

  @Bean
  public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
    RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
    rabbitTemplate.setMessageConverter(messageConverter());
    return rabbitTemplate;
  }
}
