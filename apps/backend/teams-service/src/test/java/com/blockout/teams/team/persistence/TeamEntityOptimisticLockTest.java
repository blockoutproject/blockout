package com.blockout.teams.team.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import jakarta.persistence.OptimisticLockException;
import jakarta.persistence.RollbackException;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.junit.jupiter.api.Test;

class TeamEntityOptimisticLockTest {

    @Test
    void revisionStartsAtZeroAndRejectsAStaleConcurrentWrite() {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting(AvailableSettings.URL, "jdbc:h2:mem:mrg441-lock;DB_CLOSE_DELAY=-1")
                .applySetting(AvailableSettings.USER, "sa")
                .applySetting(AvailableSettings.PASS, "")
                .applySetting(AvailableSettings.HBM2DDL_AUTO, "create-drop")
                .build();
        try (SessionFactory sessionFactory = new MetadataSources(registry)
                .addAnnotatedClass(TeamEntity.class)
                .buildMetadata()
                .buildSessionFactory()) {
            TeamEntity seed = persist(sessionFactory, team());
            assertThat(seed.getRevision()).isZero();

            try (Session first = sessionFactory.openSession();
                    Session stale = sessionFactory.openSession()) {
                var firstTransaction = first.beginTransaction();
                var staleTransaction = stale.beginTransaction();
                TeamEntity firstWrite = first.find(TeamEntity.class, seed.getId());
                TeamEntity staleWrite = stale.find(TeamEntity.class, seed.getId());

                firstWrite.setName("Team 1");
                firstTransaction.commit();
                assertThat(firstWrite.getRevision()).isOne();

                staleWrite.setName("Team stale");
                assertThatThrownBy(staleTransaction::commit)
                        .isInstanceOfAny(OptimisticLockException.class, RollbackException.class);
            }

            try (Session deactivate = sessionFactory.openSession()) {
                var transaction = deactivate.beginTransaction();
                TeamEntity current = deactivate.find(TeamEntity.class, seed.getId());
                current.setActive(false);
                transaction.commit();

                assertThat(current.getRevision()).isEqualTo(2L);
                assertThat(current.getActive()).isFalse();
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private TeamEntity persist(SessionFactory sessionFactory, TeamEntity entity) {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();
            session.persist(entity);
            transaction.commit();
            return entity;
        }
    }

    private TeamEntity team() {
        return TeamEntity.builder()
                .clubId("club-1")
                .rawName("Raw")
                .name("Team")
                .shortName("TM")
                .leagueCode("L1")
                .divisionId(2L)
                .season("2026")
                .format(FormatEnum.SIX)
                .gender(GenderEnum.M)
                .active(true)
                .build();
    }
}
