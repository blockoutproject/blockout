package com.blockout.workersearch.projection.infrastructure.messaging;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.projection.application.SearchProjectionService;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.TeamDeactivationMessage;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.TeamUpsertMessage;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class TeamProjectionListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(TeamProjectionListener.class);

    private final SearchProjectionService searchProjectionService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_UPSERT_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void onUpsertBatch(List<Message<TeamUpsertMessage>> messages, Channel channel) throws IOException {
        long lastTag = deliveryTag(messages);
        var teams = messages.stream()
            .map(Message::getPayload)
            .map(message -> new TeamProjectionSource(
                message.id(), message.name(), message.shortName(), message.clubId(), message.divisionId(),
                message.format(), message.gender(), message.season(), message.logoUrl()))
            .toList();
        try {
            searchProjectionService.upsertTeams(teams);
            channel.basicAck(lastTag, true);
            LOGGER.info(
                "Processed team batch",
                keyValue("action", "team_index_batch_upsert"),
                keyValue("count", teams.size()));
        } catch (Exception exception) {
            channel.basicNack(lastTag, true, false);
            LOGGER.error("Error processing team batch", keyValue("count", teams.size()), exception);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_SEARCH)
    public void onDeactivation(TeamDeactivationMessage message) {
        searchProjectionService.deactivateTeam(message.teamId());
        LOGGER.info(
            "Team deleted from index",
            keyValue("action", "team_index_delete"),
            keyValue("teamId", message.teamId()));
    }

    private long deliveryTag(List<? extends Message<?>> messages) {
        return (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);
    }
}
