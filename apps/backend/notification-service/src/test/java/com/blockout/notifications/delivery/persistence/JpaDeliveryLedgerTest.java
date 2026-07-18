package com.blockout.notifications.delivery.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.delivery.application.DeliveryAttemptKey;
import com.blockout.notifications.delivery.application.DeliveryReservation;
import com.blockout.shared.model.NotificationTypeEnum;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class JpaDeliveryLedgerTest {

    private static final Instant NOW = Instant.parse("2026-07-17T08:15:30Z");

    @Test
    void reservationAndTransitionsAlwaysCarryTheNotificationType() {
        List<String> calls = new ArrayList<>();
        DeliveryAttemptRepository repository = repository(calls);
        JpaDeliveryLedger ledger = new JpaDeliveryLedger(repository, Clock.fixed(NOW, ZoneOffset.UTC));
        DeliveryAttemptKey attempt =
                new DeliveryAttemptKey(42L, NotificationTypeEnum.MATCH_LIVE_LINK_CREATED);

        assertThat(ledger.reserve(new DeliveryReservation(attempt, 10L, 11L, 12L)))
                .containsExactly(1L, 2L);
        ledger.markSent(attempt, List.of(1L));
        ledger.markNoToken(attempt, List.of(2L));
        ledger.markFailed(attempt, List.of(3L), "CODE", "detail");

        LocalDateTime now = LocalDateTime.ofInstant(NOW, ZoneOffset.UTC);
        assertThat(calls).containsExactly(
                "reserve:42:10:11:12:MATCH_LIVE_LINK_CREATED",
                "sent:42:MATCH_LIVE_LINK_CREATED:[1]:" + now + ":" + now,
                "no-token:42:MATCH_LIVE_LINK_CREATED:[2]:" + now,
                "failed:42:MATCH_LIVE_LINK_CREATED:[3]:CODE:detail:" + now + ":" + now);
    }

    @Test
    void emptyTransitionsDoNotReachPersistence() {
        List<String> calls = new ArrayList<>();
        JpaDeliveryLedger ledger = new JpaDeliveryLedger(repository(calls), Clock.systemUTC());
        DeliveryAttemptKey attempt = new DeliveryAttemptKey(42L, NotificationTypeEnum.MATCH_FINISHED);

        ledger.markSent(attempt, List.of());
        ledger.markNoToken(attempt, null);
        ledger.markFailed(attempt, List.of(), "CODE", "detail");

        assertThat(calls).isEmpty();
    }

    @Test
    void transitionQueriesAreScopedToTheTypedPendingAttempt() throws Exception {
        assertTypedPendingQuery("markSent", LocalDateTime.class, LocalDateTime.class);
        assertTypedPendingQuery("markNoToken", LocalDateTime.class);
        assertTypedPendingQuery(
                "markFailed", String.class, String.class, LocalDateTime.class, LocalDateTime.class);
    }

    private void assertTypedPendingQuery(String methodName, Class<?>... trailingTypes) throws Exception {
        Class<?>[] parameterTypes = new Class<?>[3 + trailingTypes.length];
        parameterTypes[0] = Long.class;
        parameterTypes[1] = NotificationTypeEnum.class;
        parameterTypes[2] = Collection.class;
        System.arraycopy(trailingTypes, 0, parameterTypes, 3, trailingTypes.length);
        String query = DeliveryAttemptRepository.class
                .getMethod(methodName, parameterTypes)
                .getAnnotation(Query.class)
                .value();

        assertThat(query)
                .contains("ns.matchId = :matchId")
                .contains("ns.notificationType = :notificationType")
                .contains("ns.userId IN :userIds")
                .contains("ns.status = 'PENDING'");
    }

    private DeliveryAttemptRepository repository(List<String> calls) {
        return (DeliveryAttemptRepository) Proxy.newProxyInstance(
                DeliveryAttemptRepository.class.getClassLoader(),
                new Class<?>[] {DeliveryAttemptRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "insertPendingForMatchAndType" -> {
                        calls.add("reserve:%s:%s:%s:%s:%s".formatted(arguments));
                        yield List.of(1L, 2L);
                    }
                    case "markSent" -> {
                        calls.add("sent:%s:%s:%s:%s:%s".formatted(arguments));
                        yield 1;
                    }
                    case "markNoToken" -> {
                        calls.add("no-token:%s:%s:%s:%s".formatted(arguments));
                        yield 1;
                    }
                    case "markFailed" -> {
                        calls.add("failed:%s:%s:%s:%s:%s:%s:%s".formatted(arguments));
                        yield 1;
                    }
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }
}
