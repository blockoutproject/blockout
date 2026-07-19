package com.blockout.workersearch.listeners.club;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.models.events.ClubDeactivationEvent;
import com.blockout.workersearch.services.index.ClubIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class ClubDeactivationListener {

    private static final Logger logger = LoggerFactory.getLogger(ClubDeactivationListener.class);
    private final ClubIndexService clubIndexService;

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_SEARCH)
    public void onClubDeactivated(ClubDeactivationEvent event) {
        String clubId = event.getClubId();
        
        logger.info("Received club deactivation event",
                keyValue("action", "club_deactivated"),
                keyValue("clubId", clubId));

        clubIndexService.delete(clubId);

        logger.info("Club deleted from index",
                keyValue("action", "club_index_delete"),
                keyValue("clubId", clubId));
    }
}