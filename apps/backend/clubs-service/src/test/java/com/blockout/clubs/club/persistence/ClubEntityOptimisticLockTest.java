package com.blockout.clubs.club.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.persistence.OptimisticLockException;
import jakarta.persistence.RollbackException;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.junit.jupiter.api.Test;

class ClubEntityOptimisticLockTest {

    @Test
    void revisionStartsAtZeroAndRejectsAStaleConcurrentWrite() {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting(AvailableSettings.URL, "jdbc:h2:mem:mrg440-lock;DB_CLOSE_DELAY=-1")
                .applySetting(AvailableSettings.USER, "sa")
                .applySetting(AvailableSettings.PASS, "")
                .applySetting(AvailableSettings.HBM2DDL_AUTO, "create-drop")
                .build();
        try (SessionFactory sessionFactory = new MetadataSources(registry)
                .addAnnotatedClass(ClubEntity.class)
                .buildMetadata()
                .buildSessionFactory()) {
            ClubEntity seed = persist(sessionFactory, club());
            assertThat(seed.getRevision()).isZero();

            try (Session first = sessionFactory.openSession();
                    Session stale = sessionFactory.openSession()) {
                var firstTransaction = first.beginTransaction();
                var staleTransaction = stale.beginTransaction();
                ClubEntity firstWrite = first.find(ClubEntity.class, seed.getId());
                ClubEntity staleWrite = stale.find(ClubEntity.class, seed.getId());

                firstWrite.setName("Club 1");
                firstTransaction.commit();
                assertThat(firstWrite.getRevision()).isOne();

                staleWrite.setName("Club stale");
                assertThatThrownBy(staleTransaction::commit)
                        .isInstanceOfAny(OptimisticLockException.class, RollbackException.class);
            }

            try (Session deactivate = sessionFactory.openSession()) {
                var transaction = deactivate.beginTransaction();
                ClubEntity current = deactivate.find(ClubEntity.class, seed.getId());
                current.setActive(false);
                transaction.commit();

                assertThat(current.getRevision()).isEqualTo(2L);
                assertThat(current.getActive()).isFalse();
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private ClubEntity persist(SessionFactory sessionFactory, ClubEntity entity) {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();
            session.persist(entity);
            transaction.commit();
            return entity;
        }
    }

    private ClubEntity club() {
        return ClubEntity.builder()
                .id("club-1")
                .rawName("Raw")
                .name("Club")
                .active(true)
                .build();
    }
}
