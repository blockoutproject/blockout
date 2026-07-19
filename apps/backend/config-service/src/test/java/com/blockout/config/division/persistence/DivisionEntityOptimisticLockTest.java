package com.blockout.config.division.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.persistence.OptimisticLockException;
import jakarta.persistence.RollbackException;
import org.junit.jupiter.api.Test;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;

class DivisionEntityOptimisticLockTest {

    @Test
    void revisionStartsAtZeroAndRejectsAStaleConcurrentWrite() {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting(AvailableSettings.URL, "jdbc:h2:mem:mrg439-lock;DB_CLOSE_DELAY=-1")
                .applySetting(AvailableSettings.USER, "sa")
                .applySetting(AvailableSettings.PASS, "")
                .applySetting(AvailableSettings.HBM2DDL_AUTO, "create-drop")
                .build();
        try (SessionFactory sessionFactory = new MetadataSources(registry)
                .addAnnotatedClass(DivisionEntity.class)
                .buildMetadata()
                .buildSessionFactory()) {
            DivisionEntity seed = persist(sessionFactory, division("Elite"));
            assertThat(seed.getRevision()).isZero();

            try (Session first = sessionFactory.openSession();
                    Session stale = sessionFactory.openSession()) {
                var firstTransaction = first.beginTransaction();
                var staleTransaction = stale.beginTransaction();
                DivisionEntity firstWrite = first.find(DivisionEntity.class, seed.getId());
                DivisionEntity staleWrite = stale.find(DivisionEntity.class, seed.getId());

                firstWrite.setName("Elite 1");
                firstTransaction.commit();
                assertThat(firstWrite.getRevision()).isOne();

                staleWrite.setName("Elite stale");
                assertThatThrownBy(staleTransaction::commit)
                        .isInstanceOfAny(OptimisticLockException.class, RollbackException.class);
            }

            try (Session deactivate = sessionFactory.openSession()) {
                var transaction = deactivate.beginTransaction();
                DivisionEntity current = deactivate.find(DivisionEntity.class, seed.getId());
                current.setActive(false);
                transaction.commit();

                assertThat(current.getRevision()).isEqualTo(2L);
                assertThat(current.getActive()).isFalse();
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private DivisionEntity persist(SessionFactory sessionFactory, DivisionEntity entity) {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();
            session.persist(entity);
            transaction.commit();
            return entity;
        }
    }

    private DivisionEntity division(String name) {
        return DivisionEntity.builder()
                .name(name)
                .mainColor("#111")
                .firstGradientColor("#222")
                .secondGradientColor("#333")
                .thirdGradientColor("#444")
                .active(true)
                .build();
    }
}
