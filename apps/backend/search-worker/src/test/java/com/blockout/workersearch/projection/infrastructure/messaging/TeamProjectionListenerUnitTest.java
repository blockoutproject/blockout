package com.blockout.workersearch.projection.infrastructure.messaging;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.blockout.workersearch.projection.application.SearchProjectionService;
import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.TeamUpsertMessage;
import com.rabbitmq.client.Channel;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;

@ExtendWith(MockitoExtension.class)
class TeamProjectionListenerUnitTest {

    @Mock
    private SearchProjectionService searchProjectionService;

    @Mock
    private Channel channel;

    @Test
    void acknowledgesTheWholeBatchAfterSuccessfulProjection() throws Exception {
        var listener = new TeamProjectionListener(searchProjectionService);

        listener.onUpsertBatch(List.of(message(41L), message(42L)), channel);

        verify(searchProjectionService).upsertTeams(anyList());
        verify(channel).basicAck(42L, true);
    }

    @Test
    void deadLettersTheWholeBatchAfterProjectionFailure() throws Exception {
        var listener = new TeamProjectionListener(searchProjectionService);
        doThrow(new IllegalStateException("index unavailable"))
                .when(searchProjectionService)
                .upsertTeams(anyList());

        listener.onUpsertBatch(List.of(message(42L)), channel);

        verify(channel).basicNack(42L, true, false);
    }

    private Message<TeamUpsertMessage> message(long deliveryTag) {
        var payload = new TeamUpsertMessage(
                1L, "Team", "T", "club-1", 2L, Format.SIX, Gender.F, "2026/2027", null);
        return MessageBuilder.withPayload(payload)
                .setHeader(AmqpHeaders.DELIVERY_TAG, deliveryTag)
                .build();
    }
}
