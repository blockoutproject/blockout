package com.blockout.workersearch.listeners.club;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.workersearch.events.DecodedLifecycleEvent;
import com.blockout.workersearch.events.LifecycleEventDeduplicator;
import com.blockout.workersearch.events.LifecycleEventReceiptStore;
import com.blockout.workersearch.events.LifecycleV2MessageDecoder;
import com.blockout.workersearch.events.V2EventMetadataValidator;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.services.index.ClubIndexService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

class ClubUpsertListenerTest {

    @Test
    void canonicalBatchKeepsManualAckAndSkipsDuplicateEventIds() throws Exception {
        UUID eventId = UUID.randomUUID();
        ClubUpsertEvent event = ClubUpsertEvent.builder().id("club-1").name("Club").build();
        var service = new RecordingClubIndexService(false);
        var channel = new RecordingChannel();
        var listener = new ClubUpsertListener(service, new FixedDecoder(eventId, event), deduplicator());

        listener.onUpsertBatchV2(List.of(message(6), message(7)), channel.proxy());

        assertThat(service.batches).containsExactly(List.of(event));
        assertThat(channel.calls).containsExactly("ack:7:true");
    }

    @Test
    void canonicalBatchNacksWithoutRequeueAndReleasesClaimsForRetry() throws Exception {
        UUID eventId = UUID.randomUUID();
        ClubUpsertEvent event = ClubUpsertEvent.builder().id("club-1").name("Club").build();
        var service = new RecordingClubIndexService(true);
        var channel = new RecordingChannel();
        var listener = new ClubUpsertListener(service, new FixedDecoder(eventId, event), deduplicator());

        listener.onUpsertBatchV2(List.of(message(7)), channel.proxy());
        listener.onUpsertBatchV2(List.of(message(8)), channel.proxy());

        assertThat(service.attempts).isEqualTo(2);
        assertThat(channel.calls).containsExactly("nack:7:true:false", "ack:8:true");
    }

    private Message message(long deliveryTag) {
        MessageProperties properties = new MessageProperties();
        properties.setDeliveryTag(deliveryTag);
        return new Message(new byte[] {1}, properties);
    }

    private LifecycleEventDeduplicator deduplicator() {
        return new LifecycleEventDeduplicator(new LifecycleEventReceiptStore() {
            @Override
            public boolean exists(UUID eventId) {
                return false;
            }

            @Override
            public void record(UUID eventId, String eventType, String wireVersion) {}
        });
    }

    private static final class FixedDecoder extends LifecycleV2MessageDecoder {
        private final DecodedLifecycleEvent<ClubUpsertEvent> decoded;

        private FixedDecoder(UUID eventId, ClubUpsertEvent event) {
            super(new ObjectMapper(), new V2EventMetadataValidator());
            decoded = new DecodedLifecycleEvent<>(eventId, "CLUB_UPSERT", event);
        }

        @Override
        public DecodedLifecycleEvent<ClubUpsertEvent> clubUpsert(Message message) {
            return decoded;
        }
    }

    private static final class RecordingClubIndexService extends ClubIndexService {
        private final List<List<ClubUpsertEvent>> batches = new ArrayList<>();
        private boolean failNext;
        private int attempts;

        private RecordingClubIndexService(boolean failNext) {
            super(null, null, null, null);
            this.failNext = failNext;
        }

        @Override
        public void upsertBatch(List<ClubUpsertEvent> events) {
            attempts++;
            if (failNext) {
                failNext = false;
                throw new IllegalStateException("index unavailable");
            }
            batches.add(events);
        }
    }

    private static final class RecordingChannel implements java.lang.reflect.InvocationHandler {
        private final List<String> calls = new ArrayList<>();

        private Channel proxy() {
            return (Channel) Proxy.newProxyInstance(
                    Channel.class.getClassLoader(), new Class<?>[] {Channel.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] args) {
            if (method.getName().equals("basicAck")) {
                calls.add("ack:%s:%s".formatted(args[0], args[1]));
            } else if (method.getName().equals("basicNack")) {
                calls.add("nack:%s:%s:%s".formatted(args[0], args[1], args[2]));
            }
            return defaultValue(method.getReturnType());
        }

        private Object defaultValue(Class<?> type) {
            if (!type.isPrimitive() || type == void.class) {
                return null;
            }
            if (type == boolean.class) {
                return false;
            }
            if (type == char.class) {
                return '\0';
            }
            return 0;
        }
    }
}
