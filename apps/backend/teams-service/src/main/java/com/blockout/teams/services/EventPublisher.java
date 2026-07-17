package com.blockout.teams.services;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;
import com.blockout.teams.models.events.TeamUpsertEvent;
import com.blockout.teams.team.application.TeamEventPublisher;
import com.blockout.teams.team.application.TeamView;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EventPublisher implements TeamEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishUpsert(TeamView team) {
        TeamUpsertEvent event = TeamUpsertEvent.builder()
                .id(team.id())
                .name(team.name())
                .shortName(team.shortName())
                .clubId(team.clubId())
                .divisionId(team.divisionId())
                .format(Format.valueOf(team.format().name()))
                .gender(Gender.valueOf(team.gender().name()))
                .season(team.season())
                .logoUrl(team.logoUrl())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "team.upsert",
                    event);

            logger.info("Team upsert event sent",
                    keyValue("action", "publish_team_upsert"),
                    keyValue("id", team.id()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish team event",
                    keyValue("id", team.id()), ex);
            throw ex;
        }
    }
}
