package com.blockout.matches.match.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.persistence.JpaMatchStore;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchPersistenceMapper;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

class MatchCoreArchitectureTest {

    @Test
    void applicationServicesAndProjectorsDependOnlyOnApplicationOwnedCollaborators() {
        assertApplicationFields(MatchApplicationService.class);
        assertApplicationFields(MatchDayProjectionService.class);
        assertApplicationFields(MatchDayProjector.class);
        assertApplicationFields(MatchDetailProjector.class);
    }

    @Test
    void jpaEntityRepositoryMappingAndStoreRemainInsideThePersistenceBoundary() {
        assertThat(Match.class.getPackageName()).isEqualTo("com.blockout.matches.match.persistence");
        assertThat(Match.class.getAnnotation(Entity.class).name()).isEqualTo("Match");
        assertThat(Match.class.getAnnotation(Table.class).name()).isEqualTo("matches");
        assertThat(JpaMatchStore.class.getInterfaces()).containsExactlyInAnyOrder(MatchStore.class, MatchDayStore.class);
        assertThat(MatchPersistenceMapper.class.getPackageName())
                .isEqualTo("com.blockout.matches.match.persistence");
    }

    @Test
    void commandAndProjectionServicesRetainTheirTransactionOwnership() throws NoSuchMethodException {
        Transactional update = MatchApplicationService.class
                .getMethod("update", Long.class, UpdateMatchCommand.class)
                .getAnnotation(Transactional.class);
        Transactional dayPage = MatchDayProjectionService.class
                .getMethod("findPage", MatchDayQuery.class)
                .getAnnotation(Transactional.class);

        assertThat(update).isNotNull();
        assertThat(dayPage).isNotNull();
        assertThat(dayPage.readOnly()).isTrue();
    }

    private void assertApplicationFields(Class<?> type) {
        assertThat(Arrays.stream(type.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName()))
                .allMatch(packageName -> packageName.equals("com.blockout.matches.match.application")
                        || packageName.equals("java.time"));
    }
}
