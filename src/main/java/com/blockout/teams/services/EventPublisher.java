package com.blockout.teams.services;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.Team;
import com.blockout.teams.models.events.TeamUpsertEvent;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public void publishTeamUpsert(Team team) {
        TeamUpsertEvent event = TeamUpsertEvent.builder()
                .id(team.getId())
                .name(team.getName())
                .clubId(team.getClubId())
                .divisionName(team.getDivisionName())
                .format(team.getFormat())
                .gender(team.getGender())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "team.upsert",
                    event);

            logger.info("Team upsert event sent",
                    keyValue("action", "publish_team_upsert"),
                    keyValue("id", team.getId()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish team event",
                    keyValue("id", team.getId()), ex);
            throw ex;    // retry / DLQ si besoin
        }
    }
}