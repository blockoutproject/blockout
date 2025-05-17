package com.blockout.workersearch.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";
    public static final String ENTITY_LIFECYCLE_DLQ_EXCHANGE = "entity.lifecycle.dlq.exchange";

    public static final String CLUB_LIFECYCLE_QUEUE_SEARCH = "club.lifecycle.queue.workersearch";
    public static final String TEAM_LIFECYCLE_QUEUE_SEARCH = "team.lifecycle.queue.workersearch";
    public static final String POOL_LIFECYCLE_QUEUE_SEARCH = "pool.lifecycle.queue.workersearch";

    public static final String CLUB_DLQ = "club.lifecycle.queue.workersearch.dlq";
    public static final String TEAM_DLQ = "team.lifecycle.queue.workersearch.dlq";
    public static final String POOL_DLQ = "pool.lifecycle.queue.workersearch.dlq";

    @Bean
    TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    TopicExchange entityLifecyclDlqExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_DLQ_EXCHANGE);
    }

    @Bean
    Queue clubLifecycleQueueSearch() {
        return QueueBuilder.durable(CLUB_LIFECYCLE_QUEUE_SEARCH)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "club.dlq")
                .build();
    }

    @Bean
    Queue teamLifecycleQueueSearch() {
        return QueueBuilder.durable(TEAM_LIFECYCLE_QUEUE_SEARCH)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "team.dlq")
                .build();
    }

    @Bean
    Queue poolLifecycleQueueSearch() {
        return QueueBuilder.durable(POOL_LIFECYCLE_QUEUE_SEARCH)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "pool.dlq")
                .build();
    }

    @Bean
    Queue clubDlq() {
        return QueueBuilder.durable(CLUB_DLQ).build();
    }

    @Bean
    Queue teamDlq() {
        return QueueBuilder.durable(TEAM_DLQ).build();
    }

    @Bean
    Queue poolDlq() {
        return QueueBuilder.durable(POOL_DLQ).build();
    }

    @Bean
    Binding bindClubLifecycleQueueSearch(TopicExchange entityLifecycleExchange,
            Queue clubLifecycleQueueSearch) {
        return BindingBuilder.bind(clubLifecycleQueueSearch)
                .to(entityLifecycleExchange)
                .with("club.upsert");
    }

    @Bean
    Binding bindTeamLifecycleQueueSearch(TopicExchange entityLifecycleExchange,
            Queue teamLifecycleQueueSearch) {
        return BindingBuilder.bind(teamLifecycleQueueSearch)
                .to(entityLifecycleExchange)
                .with("team.upsert");
    }

    @Bean
    Binding bindPoolLifecycleQueueSearch(TopicExchange entityLifecycleExchange,
            Queue poolLifecycleQueueSearch) {
        return BindingBuilder.bind(poolLifecycleQueueSearch)
                .to(entityLifecycleExchange)
                .with("pool.upsert");
    }

    @Bean
    Binding bindClubDlq(TopicExchange entityLifecycleExchange, Queue clubDlq) {
        return BindingBuilder.bind(clubDlq)
                .to(entityLifecycleExchange)
                .with("club.dlq");
    }

    @Bean
    Binding bindTeamDlq(TopicExchange entityLifecycleExchange, Queue teamDlq) {
        return BindingBuilder.bind(teamDlq)
                .to(entityLifecycleExchange)
                .with("team.dlq");
    }

    @Bean
    Binding bindPoolDlq(TopicExchange entityLifecycleExchange, Queue poolDlq) {
        return BindingBuilder.bind(poolDlq)
                .to(entityLifecycleExchange)
                .with("pool.dlq");
    }

    public static final String DEACTIVATED_EXCHANGE = "deactivated.exchange";

    public static final String CLUB_DEACTIVATED_QUEUE_SEARCH = "club.deactivated.queue.workersearch";
    public static final String TEAM_DEACTIVATED_QUEUE_SEARCH = "team.deactivated.queue.workersearch";
    public static final String POOL_DEACTIVATED_QUEUE_SEARCH = "pool.deactivated.queue.workersearch";

    @Bean
    public TopicExchange deactivatedExchange() {
        return new TopicExchange(DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Queue clubDeactivatedQueueSearch() {
        return new Queue(CLUB_DEACTIVATED_QUEUE_SEARCH, true);
    }

    @Bean
    public Queue teamDeactivatedQueueSearch() {
        return new Queue(TEAM_DEACTIVATED_QUEUE_SEARCH, true);
    }

    @Bean
    public Queue poolDeactivatedQueueSearch() {
        return new Queue(POOL_DEACTIVATED_QUEUE_SEARCH, true);
    }

    @Bean
    public Binding bindClubDeactivatedQueueSearch(TopicExchange deactivatedExchange,
            Queue clubDeactivatedQueueSearch) {
        return BindingBuilder.bind(clubDeactivatedQueueSearch)
                .to(deactivatedExchange)
                .with("club.deactivated");
    }

    @Bean
    public Binding bindTeamDeactivatedQueueSearch(TopicExchange deactivatedExchange,
            Queue teamDeactivatedQueueSearch) {
        return BindingBuilder.bind(teamDeactivatedQueueSearch)
                .to(deactivatedExchange)
                .with("team.deactivated");
    }

    @Bean
    public Binding bindPoolDeactivatedQueueSearch(TopicExchange deactivatedExchange,
            Queue poolDeactivatedQueueSearch) {
        return BindingBuilder.bind(poolDeactivatedQueueSearch)
                .to(deactivatedExchange)
                .with("pool.deactivated");
    }

    @Bean(name = "rabbitBatchFactory")
    public SimpleRabbitListenerContainerFactory rabbitBatchFactory(ConnectionFactory connectionFactory,
            MessageConverter messageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);

        factory.setBatchListener(true);
        factory.setConsumerBatchEnabled(true);
        factory.setBatchSize(500);
        factory.setReceiveTimeout(2000L);
        factory.setPrefetchCount(500);
        factory.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        factory.setMessageConverter(messageConverter);
        return factory;
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}