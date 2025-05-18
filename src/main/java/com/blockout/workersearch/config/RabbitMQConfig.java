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

    public static final String CLUB_UPSERT_QUEUE_SEARCH = "club.upsert.queue.search";
    public static final String CLUB_DEACTIVATION_QUEUE_SEARCH = "club.deactivation.queue.search";
    public static final String TEAM_UPSERT_QUEUE_SEARCH = "team.upsert.queue.search";
    public static final String TEAM_DEACTIVATION_QUEUE_SEARCH = "team.deactivation.queue.search";
    public static final String POOL_UPSERT_QUEUE_SEARCH = "pool.upsert.queue.search";
    public static final String POOL_DEACTIVATION_QUEUE_SEARCH = "pool.deactivation.queue.search";

    public static final String CLUB_UPSERT_DLQ_SEARCH = "club.upsert.queue.search.dlq";
    public static final String CLUB_DEACTIVATION_DLQ_SEARCH = "club.deactivation.queue.search.dlq";
    public static final String TEAM_UPSERT_DLQ_SEARCH = "team.upsert.queue.search.dlq";
    public static final String TEAM_DEACTIVATION_DLQ_SEARCH = "team.deactivation.queue.search.dlq";
    public static final String POOL_UPSERT_DLQ_SEARCH = "pool.upsert.queue.search.dlq";
    public static final String POOL_DEACTIVATION_DLQ_SEARCH = "pool.deactivation.queue.search.dlq";

    @Bean
    TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    TopicExchange entityLifecycleDlqExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_DLQ_EXCHANGE);
    }

    @Bean Queue clubUpsertQueue()         { return durableQueue(CLUB_UPSERT_QUEUE_SEARCH, "club.upsert.dlq"); }
    @Bean Queue clubDeactivationQueue()   { return durableQueue(CLUB_DEACTIVATION_QUEUE_SEARCH, "club.deactivation.dlq"); }
    @Bean Queue teamUpsertQueue()         { return durableQueue(TEAM_UPSERT_QUEUE_SEARCH, "team.upsert.dlq"); }
    @Bean Queue teamDeactivationQueue()   { return durableQueue(TEAM_DEACTIVATION_QUEUE_SEARCH, "team.deactivation.dlq"); }
    @Bean Queue poolUpsertQueue()         { return durableQueue(POOL_UPSERT_QUEUE_SEARCH, "pool.upsert.dlq"); }
    @Bean Queue poolDeactivationQueue()   { return durableQueue(POOL_DEACTIVATION_QUEUE_SEARCH, "pool.deactivation.dlq"); }

    @Bean Queue clubUpsertDlq()           { return QueueBuilder.durable(CLUB_UPSERT_DLQ_SEARCH).build(); }
    @Bean Queue clubDeactivationDlq()     { return QueueBuilder.durable(CLUB_DEACTIVATION_DLQ_SEARCH).build(); }
    @Bean Queue teamUpsertDlq()           { return QueueBuilder.durable(TEAM_UPSERT_DLQ_SEARCH).build(); }
    @Bean Queue teamDeactivationDlq()     { return QueueBuilder.durable(TEAM_DEACTIVATION_DLQ_SEARCH).build(); }
    @Bean Queue poolUpsertDlq()           { return QueueBuilder.durable(POOL_UPSERT_DLQ_SEARCH).build(); }
    @Bean Queue poolDeactivationDlq()     { return QueueBuilder.durable(POOL_DEACTIVATION_DLQ_SEARCH).build(); }

    @Bean Binding bindClubUpsertQueue()         { return bindQueue(clubUpsertQueue(), "club.upsert"); }
    @Bean Binding bindClubDeactivationQueue()   { return bindQueue(clubDeactivationQueue(), "club.deactivation"); }
    @Bean Binding bindTeamUpsertQueue()         { return bindQueue(teamUpsertQueue(), "team.upsert"); }
    @Bean Binding bindTeamDeactivationQueue()   { return bindQueue(teamDeactivationQueue(), "team.deactivation"); }
    @Bean Binding bindPoolUpsertQueue()         { return bindQueue(poolUpsertQueue(), "pool.upsert"); }
    @Bean Binding bindPoolDeactivationQueue()   { return bindQueue(poolDeactivationQueue(), "pool.deactivation"); }

    @Bean Binding bindClubUpsertDlq()           { return bindDlq(clubUpsertDlq(), "club.upsert.dlq"); }
    @Bean Binding bindClubDeactivationDlq()     { return bindDlq(clubDeactivationDlq(), "club.deactivation.dlq"); }
    @Bean Binding bindTeamUpsertDlq()           { return bindDlq(teamUpsertDlq(), "team.upsert.dlq"); }
    @Bean Binding bindTeamDeactivationDlq()     { return bindDlq(teamDeactivationDlq(), "team.deactivation.dlq"); }
    @Bean Binding bindPoolUpsertDlq()           { return bindDlq(poolUpsertDlq(), "pool.upsert.dlq"); }
    @Bean Binding bindPoolDeactivationDlq()     { return bindDlq(poolDeactivationDlq(), "pool.deactivation.dlq"); }

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

    private Queue durableQueue(String name, String dlqRoutingKey) {
        return QueueBuilder.durable(name)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", dlqRoutingKey)
                .build();
    }

    private Binding bindQueue(Queue queue, String routingKey) {
        return BindingBuilder.bind(queue).to(entityLifecycleExchange()).with(routingKey);
    }

    private Binding bindDlq(Queue queue, String routingKey) {
        return BindingBuilder.bind(queue).to(entityLifecycleDlqExchange()).with(routingKey);
    }
}