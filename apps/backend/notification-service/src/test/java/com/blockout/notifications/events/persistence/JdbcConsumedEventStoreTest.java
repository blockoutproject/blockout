package com.blockout.notifications.events.persistence;

import com.blockout.shared.model.ConsumedEventClaimEnum;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.notifications.events.application.ConsumedEventIdentity;
import com.blockout.notifications.events.application.ConsumedEventIdentityCollisionException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class JdbcConsumedEventStoreTest {

    @Test
    void aNewIdentityIsClaimedWithoutAConflictRead() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate(1, null);
        JdbcConsumedEventStore store = new JdbcConsumedEventStore(jdbc);

        assertThat(store.claim(identity("TEAM_FOLLOWED"))).isEqualTo(ConsumedEventClaimEnum.CLAIMED);
        assertThat(jdbc.queries).isZero();
    }

    @Test
    void theSameFactIsADuplicateAcrossWireVersions() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate(0, "TEAM_FOLLOWED");
        JdbcConsumedEventStore store = new JdbcConsumedEventStore(jdbc);

        assertThat(store.claim(identity("TEAM_FOLLOWED"))).isEqualTo(ConsumedEventClaimEnum.DUPLICATE);
        assertThat(jdbc.queries).isEqualTo(1);
    }

    @Test
    void aConflictingFactFailsInsteadOfBeingAcknowledgedAsADuplicate() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate(0, "POOL_FOLLOWED");
        JdbcConsumedEventStore store = new JdbcConsumedEventStore(jdbc);

        assertThatThrownBy(() -> store.claim(identity("TEAM_FOLLOWED")))
                .isInstanceOf(ConsumedEventIdentityCollisionException.class);
    }

    private ConsumedEventIdentity identity(String eventType) {
        return new ConsumedEventIdentity(
                UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83"), eventType, "v2");
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final int updateResult;
        private final String existingType;
        private int queries;

        private RecordingJdbcTemplate(int updateResult, String existingType) {
            this.updateResult = updateResult;
            this.existingType = existingType;
        }

        @Override
        public int update(String sql, Object... args) {
            return updateResult;
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            queries++;
            return requiredType.cast(existingType);
        }
    }
}
