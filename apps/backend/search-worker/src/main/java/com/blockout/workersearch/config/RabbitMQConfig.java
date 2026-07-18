package com.blockout.workersearch.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.amqp.support.converter.SimpleMessageConverter;

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

    public static final String CLUB_UPSERT_QUEUE_SEARCH_V2 = "club.upsert.queue.search.v2";
    public static final String CLUB_DEACTIVATION_QUEUE_SEARCH_V2 = "club.deactivation.queue.search.v2";
    public static final String TEAM_UPSERT_QUEUE_SEARCH_V2 = "team.upsert.queue.search.v2";
    public static final String TEAM_DEACTIVATION_QUEUE_SEARCH_V2 = "team.deactivation.queue.search.v2";
    public static final String POOL_UPSERT_QUEUE_SEARCH_V2 = "pool.upsert.queue.search.v2";
    public static final String POOL_DEACTIVATION_QUEUE_SEARCH_V2 = "pool.deactivation.queue.search.v2";

    public static final String CLUB_UPSERT_DLQ_SEARCH_V2 = "club.upsert.queue.search.dlq.v2";
    public static final String CLUB_DEACTIVATION_DLQ_SEARCH_V2 = "club.deactivation.queue.search.dlq.v2";
    public static final String TEAM_UPSERT_DLQ_SEARCH_V2 = "team.upsert.queue.search.dlq.v2";
    public static final String TEAM_DEACTIVATION_DLQ_SEARCH_V2 = "team.deactivation.queue.search.dlq.v2";
    public static final String POOL_UPSERT_DLQ_SEARCH_V2 = "pool.upsert.queue.search.dlq.v2";
    public static final String POOL_DEACTIVATION_DLQ_SEARCH_V2 = "pool.deactivation.queue.search.dlq.v2";

    @Bean
    TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    TopicExchange entityLifecycleDlqExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_DLQ_EXCHANGE);
    }

    @Bean
    Queue clubUpsertQueue() {
        return durableQueue(CLUB_UPSERT_QUEUE_SEARCH, "club.upsert.dlq");
    }

    @Bean
    Queue clubDeactivationQueue() {
        return durableQueue(CLUB_DEACTIVATION_QUEUE_SEARCH, "club.deactivation.dlq");
    }

    @Bean
    Queue teamUpsertQueue() {
        return durableQueue(TEAM_UPSERT_QUEUE_SEARCH, "team.upsert.dlq");
    }

    @Bean
    Queue teamDeactivationQueue() {
        return durableQueue(TEAM_DEACTIVATION_QUEUE_SEARCH, "team.deactivation.dlq");
    }

    @Bean
    Queue poolUpsertQueue() {
        return durableQueue(POOL_UPSERT_QUEUE_SEARCH, "pool.upsert.dlq");
    }

    @Bean
    Queue poolDeactivationQueue() {
        return durableQueue(POOL_DEACTIVATION_QUEUE_SEARCH, "pool.deactivation.dlq");
    }

    @Bean
    Queue clubUpsertQueueV2() {
        return durableQueue(CLUB_UPSERT_QUEUE_SEARCH_V2, "club.upsert.dlq.v2");
    }

    @Bean
    Queue clubDeactivationQueueV2() {
        return durableQueue(CLUB_DEACTIVATION_QUEUE_SEARCH_V2, "club.deactivation.dlq.v2");
    }

    @Bean
    Queue teamUpsertQueueV2() {
        return durableQueue(TEAM_UPSERT_QUEUE_SEARCH_V2, "team.upsert.dlq.v2");
    }

    @Bean
    Queue teamDeactivationQueueV2() {
        return durableQueue(TEAM_DEACTIVATION_QUEUE_SEARCH_V2, "team.deactivation.dlq.v2");
    }

    @Bean
    Queue poolUpsertQueueV2() {
        return durableQueue(POOL_UPSERT_QUEUE_SEARCH_V2, "pool.upsert.dlq.v2");
    }

    @Bean
    Queue poolDeactivationQueueV2() {
        return durableQueue(POOL_DEACTIVATION_QUEUE_SEARCH_V2, "pool.deactivation.dlq.v2");
    }

    @Bean
    Queue clubUpsertDlq() {
        return QueueBuilder.durable(CLUB_UPSERT_DLQ_SEARCH).build();
    }

    @Bean
    Queue clubDeactivationDlq() {
        return QueueBuilder.durable(CLUB_DEACTIVATION_DLQ_SEARCH).build();
    }

    @Bean
    Queue teamUpsertDlq() {
        return QueueBuilder.durable(TEAM_UPSERT_DLQ_SEARCH).build();
    }

    @Bean
    Queue teamDeactivationDlq() {
        return QueueBuilder.durable(TEAM_DEACTIVATION_DLQ_SEARCH).build();
    }

    @Bean
    Queue poolUpsertDlq() {
        return QueueBuilder.durable(POOL_UPSERT_DLQ_SEARCH).build();
    }

    @Bean
    Queue poolDeactivationDlq() {
        return QueueBuilder.durable(POOL_DEACTIVATION_DLQ_SEARCH).build();
    }

    @Bean
    Queue clubUpsertDlqV2() {
        return QueueBuilder.durable(CLUB_UPSERT_DLQ_SEARCH_V2).build();
    }

    @Bean
    Queue clubDeactivationDlqV2() {
        return QueueBuilder.durable(CLUB_DEACTIVATION_DLQ_SEARCH_V2).build();
    }

    @Bean
    Queue teamUpsertDlqV2() {
        return QueueBuilder.durable(TEAM_UPSERT_DLQ_SEARCH_V2).build();
    }

    @Bean
    Queue teamDeactivationDlqV2() {
        return QueueBuilder.durable(TEAM_DEACTIVATION_DLQ_SEARCH_V2).build();
    }

    @Bean
    Queue poolUpsertDlqV2() {
        return QueueBuilder.durable(POOL_UPSERT_DLQ_SEARCH_V2).build();
    }

    @Bean
    Queue poolDeactivationDlqV2() {
        return QueueBuilder.durable(POOL_DEACTIVATION_DLQ_SEARCH_V2).build();
    }

    @Bean
    Binding bindClubUpsertQueue() {
        return bindQueue(clubUpsertQueue(), "club.upsert");
    }

    @Bean
    Binding bindClubDeactivationQueue() {
        return bindQueue(clubDeactivationQueue(), "club.deactivation");
    }

    @Bean
    Binding bindTeamUpsertQueue() {
        return bindQueue(teamUpsertQueue(), "team.upsert");
    }

    @Bean
    Binding bindTeamDeactivationQueue() {
        return bindQueue(teamDeactivationQueue(), "team.deactivation");
    }

    @Bean
    Binding bindPoolUpsertQueue() {
        return bindQueue(poolUpsertQueue(), "pool.upsert");
    }

    @Bean
    Binding bindPoolDeactivationQueue() {
        return bindQueue(poolDeactivationQueue(), "pool.deactivation");
    }

    @Bean
    Binding bindClubUpsertQueueV2() {
        return bindQueue(clubUpsertQueueV2(), "club.upsert.v2");
    }

    @Bean
    Binding bindClubDeactivationQueueV2() {
        return bindQueue(clubDeactivationQueueV2(), "club.deactivation.v2");
    }

    @Bean
    Binding bindTeamUpsertQueueV2() {
        return bindQueue(teamUpsertQueueV2(), "team.upsert.v2");
    }

    @Bean
    Binding bindTeamDeactivationQueueV2() {
        return bindQueue(teamDeactivationQueueV2(), "team.deactivation.v2");
    }

    @Bean
    Binding bindPoolUpsertQueueV2() {
        return bindQueue(poolUpsertQueueV2(), "pool.upsert.v2");
    }

    @Bean
    Binding bindPoolDeactivationQueueV2() {
        return bindQueue(poolDeactivationQueueV2(), "pool.deactivation.v2");
    }

    @Bean
    Binding bindClubUpsertDlq() {
        return bindDlq(clubUpsertDlq(), "club.upsert.dlq");
    }

    @Bean
    Binding bindClubDeactivationDlq() {
        return bindDlq(clubDeactivationDlq(), "club.deactivation.dlq");
    }

    @Bean
    Binding bindTeamUpsertDlq() {
        return bindDlq(teamUpsertDlq(), "team.upsert.dlq");
    }

    @Bean
    Binding bindTeamDeactivationDlq() {
        return bindDlq(teamDeactivationDlq(), "team.deactivation.dlq");
    }

    @Bean
    Binding bindPoolUpsertDlq() {
        return bindDlq(poolUpsertDlq(), "pool.upsert.dlq");
    }

    @Bean
    Binding bindPoolDeactivationDlq() {
        return bindDlq(poolDeactivationDlq(), "pool.deactivation.dlq");
    }

    @Bean
    Binding bindClubUpsertDlqV2() {
        return bindDlq(clubUpsertDlqV2(), "club.upsert.dlq.v2");
    }

    @Bean
    Binding bindClubDeactivationDlqV2() {
        return bindDlq(clubDeactivationDlqV2(), "club.deactivation.dlq.v2");
    }

    @Bean
    Binding bindTeamUpsertDlqV2() {
        return bindDlq(teamUpsertDlqV2(), "team.upsert.dlq.v2");
    }

    @Bean
    Binding bindTeamDeactivationDlqV2() {
        return bindDlq(teamDeactivationDlqV2(), "team.deactivation.dlq.v2");
    }

    @Bean
    Binding bindPoolUpsertDlqV2() {
        return bindDlq(poolUpsertDlqV2(), "pool.upsert.dlq.v2");
    }

    @Bean
    Binding bindPoolDeactivationDlqV2() {
        return bindDlq(poolDeactivationDlqV2(), "pool.deactivation.dlq.v2");
    }

    @Bean(name = "rabbitBatchFactory")
    public SimpleRabbitListenerContainerFactory rabbitBatchFactory(ConnectionFactory connectionFactory,
            @Qualifier("messageConverter") MessageConverter messageConverter) {
        return batchFactory(connectionFactory, messageConverter);
    }

    @Bean(name = "rabbitV2BatchFactory")
    public SimpleRabbitListenerContainerFactory rabbitV2BatchFactory(ConnectionFactory connectionFactory) {
        return batchFactory(connectionFactory, new SimpleMessageConverter());
    }

    private SimpleRabbitListenerContainerFactory batchFactory(
            ConnectionFactory connectionFactory, MessageConverter messageConverter) {
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
