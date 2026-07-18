package com.blockout.matches.match.live.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.live.outbound.OutboxMatchLiveLinkEvents;
import com.blockout.matches.match.live.persistence.JpaMatchLiveLinkStore;
import com.blockout.matches.match.live.persistence.MatchLiveLink;
import com.blockout.matches.match.live.persistence.MatchLiveLinkPersistenceMapper;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

class MatchLiveLinkArchitectureTest {

    @Test
    void liveApplicationServicesPoliciesAndProjectorsUseApplicationOwnedCollaborators() {
        assertApplicationFields(MatchLiveLinkApplicationService.class);
        assertApplicationFields(MatchLiveLinkHistoryService.class);
        assertApplicationFields(MatchLiveLinkPolicy.class);
        assertApplicationFields(MatchLiveLinkStatePolicy.class);
        assertApplicationFields(MatchLiveProviderResolver.class);
        assertApplicationFields(MatchLiveLinkProjector.class);
    }

    @Test
    void liveEntityStoreMapperAndOutboxStayInsideTheirOwningAdapters() {
        assertThat(MatchLiveLink.class.getPackageName())
                .isEqualTo("com.blockout.matches.match.live.persistence");
        assertThat(MatchLiveLink.class.getAnnotation(Entity.class)).isNotNull();
        assertThat(MatchLiveLink.class.getAnnotation(Table.class).name()).isEqualTo("match_live_links");
        assertThat(JpaMatchLiveLinkStore.class.getInterfaces())
                .containsExactlyInAnyOrder(MatchLiveLinkStore.class, MatchLiveLinkHistoryStore.class);
        assertThat(MatchLiveLinkPersistenceMapper.class.getPackageName())
                .isEqualTo("com.blockout.matches.match.live.persistence");
        assertThat(OutboxMatchLiveLinkEvents.class.getInterfaces()).containsExactly(MatchLiveLinkEvents.class);
    }

    @Test
    void commandsAndHistoryRetainTheirTransactionOwnership() throws NoSuchMethodException {
        Transactional upsert = MatchLiveLinkApplicationService.class
                .getMethod("upsert", Long.class, UpsertMatchLiveLinkCommand.class)
                .getAnnotation(Transactional.class);
        Transactional history = MatchLiveLinkHistoryService.class
                .getMethod("findHistory", Long.class, int.class, int.class)
                .getAnnotation(Transactional.class);

        assertThat(upsert).isNotNull();
        assertThat(history).isNotNull();
        assertThat(history.readOnly()).isTrue();
    }

    private void assertApplicationFields(Class<?> type) {
        assertThat(Arrays.stream(type.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName()))
                .allMatch(packageName -> packageName.equals("com.blockout.matches.match.live.application")
                        || packageName.equals("java.time"));
    }
}
