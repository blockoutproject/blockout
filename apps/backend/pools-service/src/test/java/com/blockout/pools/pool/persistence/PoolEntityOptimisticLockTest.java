package com.blockout.pools.pool.persistence;

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

class PoolEntityOptimisticLockTest {

    @Test
    void revisionStartsAtZeroAndRejectsAStaleConcurrentWrite() {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting(AvailableSettings.URL, "jdbc:h2:mem:mrg442-lock;DB_CLOSE_DELAY=-1")
                .applySetting(AvailableSettings.USER, "sa")
                .applySetting(AvailableSettings.PASS, "")
                .applySetting(AvailableSettings.HBM2DDL_AUTO, "create-drop")
                .build();
        try (SessionFactory sessionFactory = new MetadataSources(registry)
                .addAnnotatedClass(PoolEntity.class)
                .buildMetadata()
                .buildSessionFactory()) {
            PoolEntity seed = persist(sessionFactory, pool());
            assertThat(seed.getRevision()).isZero();

            try (Session first = sessionFactory.openSession();
                    Session stale = sessionFactory.openSession()) {
                var firstTransaction = first.beginTransaction();
                var staleTransaction = stale.beginTransaction();
                PoolEntity firstWrite = first.find(PoolEntity.class, seed.getId());
                PoolEntity staleWrite = stale.find(PoolEntity.class, seed.getId());

                firstWrite.setName("Pool 1");
                firstTransaction.commit();
                assertThat(firstWrite.getRevision()).isOne();

                staleWrite.setName("Pool stale");
                assertThatThrownBy(staleTransaction::commit)
                        .isInstanceOfAny(OptimisticLockException.class, RollbackException.class);
            }

            try (Session deactivate = sessionFactory.openSession()) {
                var transaction = deactivate.beginTransaction();
                PoolEntity current = deactivate.find(PoolEntity.class, seed.getId());
                current.setActive(false);
                transaction.commit();

                assertThat(current.getRevision()).isEqualTo(2L);
                assertThat(current.getActive()).isFalse();
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private PoolEntity persist(SessionFactory sessionFactory, PoolEntity entity) {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();
            session.persist(entity);
            transaction.commit();
            return entity;
        }
    }

    private PoolEntity pool() {
        return PoolEntity.builder()
                .poolCode("P1")
                .leagueCode("L1")
                .season("2026")
                .leagueName("League")
                .rawName("Raw")
                .name("Pool")
                .shortName("PL")
                .divisionId(2L)
                .format(FormatEnum.SIX)
                .gender(GenderEnum.M)
                .active(true)
                .build();
    }
}
