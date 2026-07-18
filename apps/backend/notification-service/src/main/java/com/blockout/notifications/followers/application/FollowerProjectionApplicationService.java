package com.blockout.notifications.followers.application;

import com.blockout.shared.model.FollowerProjectionMutationEnum;
import com.blockout.shared.model.FollowerProjectionActionEnum;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies idempotent event commands and bounded canonical reconciliation snapshots. */
@Service
@RequiredArgsConstructor
public class FollowerProjectionApplicationService
        implements FollowerProjectionConsumer, FollowerProjectionReconciler {

    private static final Logger LOGGER = LoggerFactory.getLogger(FollowerProjectionApplicationService.class);

    private final FollowerProjectionStore store;

    @Transactional
    @Override
    public FollowerProjectionMutationEnum apply(FollowerProjectionCommand command) {
        FollowerProjectionTarget target = new FollowerProjectionTarget(command.entityType(), command.entityId());
        boolean changed = command.action() == FollowerProjectionActionEnum.FOLLOW
                ? store.add(command.userId(), target)
                : store.remove(command.userId(), target);
        FollowerProjectionMutationEnum result = changed
                ? FollowerProjectionMutationEnum.APPLIED
                : FollowerProjectionMutationEnum.UNCHANGED;
        LOGGER.info("Follower projection command applied",
                keyValue("action", "follower_projection_command"),
                keyValue("userId", command.userId()),
                keyValue("entityType", command.entityType()),
                keyValue("entityId", command.entityId()),
                keyValue("projectionAction", command.action()),
                keyValue("result", result));
        return result;
    }

    @Transactional
    @Override
    public FollowerProjectionReconciliation reconcile(FollowerProjectionSnapshot snapshot) {
        Set<FollowerProjectionTarget> current = store.findByUserId(snapshot.userId());
        Set<FollowerProjectionTarget> desired = snapshot.favorites();
        Set<FollowerProjectionTarget> removed = difference(current, desired);
        Set<FollowerProjectionTarget> added = difference(desired, current);
        Set<FollowerProjectionTarget> retained = new LinkedHashSet<>(current);
        retained.retainAll(desired);

        removed.removeIf(target -> !store.remove(snapshot.userId(), target));
        added.removeIf(target -> !store.add(snapshot.userId(), target));

        FollowerProjectionReconciliation result =
                new FollowerProjectionReconciliation(added, removed, retained);
        LOGGER.info("Follower projection reconciled from canonical favorites",
                keyValue("action", "followers_projection_reconcile_user"),
                keyValue("userId", snapshot.userId()),
                keyValue("beforeCount", current.size()),
                keyValue("desiredCount", desired.size()),
                keyValue("addedCount", result.added().size()),
                keyValue("removedCount", result.removed().size()),
                keyValue("retainedCount", result.retained().size()));
        return result;
    }

    private Set<FollowerProjectionTarget> difference(
            Set<FollowerProjectionTarget> left,
            Set<FollowerProjectionTarget> right) {
        Set<FollowerProjectionTarget> result = new LinkedHashSet<>(left);
        result.removeAll(right);
        return result;
    }
}
