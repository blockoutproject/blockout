package com.blockout.matches.match.live.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkApplicationService.class);
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchLiveLinkStore liveLinks;
    private final CurrentUserProvider users;
    private final MatchLiveAuthorizationProvider authorization;
    private final MatchLiveLinkPolicy policy;
    private final MatchLiveLinkStatePolicy states;
    private final MatchLiveProviderResolver providers;
    private final MatchLiveLinkProjector projector;
    private final MatchLiveLinkEvents events;
    private final Clock clock;

    @Transactional
    public MatchLiveLinkResultView upsert(Long matchId, UpsertMatchLiveLinkCommand command) {
        CurrentUserSnapshot currentUser = users.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("Utilisateur courant introuvable.");
        }
        String auth0Id = currentUser.auth0Id();
        Instant now = clock.instant();
        boolean moderator = authorization.isModerator();

        policy.validateUserAccountAge(currentUser, matchId, now, moderator);
        LiveProviderEnum provider = providers.resolve(command.url());
        MatchLiveMatchSnapshot match = liveLinks.findMatch(matchId).orElseThrow(() -> notFound(matchId, auth0Id));
        policy.validateMatchLeague(match, matchId, auth0Id);

        MatchLiveLinkSnapshot active = liveLinks.findNewestActive(matchId).orElse(null);
        MatchLiveLinkUpsertPlan plan = states.plan(match, moderator);
        if (plan.postMatch()) {
            policy.validatePostMatchLinkRules(active, auth0Id, matchId, moderator);
            return handlePostMatchUpsert(match, active, provider, command.url(), auth0Id, now, plan);
        }

        policy.validatePublishWindow(match, now, matchId, auth0Id, moderator);
        if (active != null) {
            policy.validateOwnerOfActiveLink(active, auth0Id, matchId, moderator);
            if (isSameLink(active, provider, command.url())) {
                LOGGER.info("Live link unchanged, skipping new version", keyValue("action", "set_live_link_noop"),
                        keyValue("match_id", matchId), keyValue("auth0_id", auth0Id),
                        keyValue("active_link_id", active.id()));
                return projector.toResult(active);
            }
        }

        long ownerLinkCount = liveLinks.countByOwner(matchId, auth0Id);
        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        Instant startOfDay = nowParis.toLocalDate().atStartOfDay(PARIS).toInstant();
        Instant endOfDay = startOfDay.plus(1, ChronoUnit.DAYS).minusNanos(1);
        long ownerMatchCountToday = liveLinks.countDistinctMatchesByOwnerAndDay(auth0Id, startOfDay, endOfDay);
        policy.validateLinkQuotas(
                matchId, auth0Id, ownerLinkCount, ownerMatchCountToday, ownerLinkCount > 0, moderator);

        expire(active, now);
        MatchLiveLinkSnapshot saved = create(matchId, auth0Id, provider, command.url(), plan.createdStatus(), now);
        logCreated(saved, auth0Id, "Live link version created", "set_live_link");

        if (plan.publishCreatedEvent()) {
            events.publishMatchLiveLinkCreated(new MatchLiveLinkCreatedEventInput(
                    match.id(), match.teamIdA(), match.teamIdB(), match.poolId()));
        }
        return projector.toResult(saved);
    }

    @Transactional
    public void delete(Long matchId, String auth0Id) {
        liveLinks.findNewestActive(matchId).ifPresent(link -> {
            boolean moderator = authorization.isModerator();
            policy.validateDeletePermission(link, auth0Id, matchId, moderator);
            liveLinks.changeStatus(link.id(), LiveLinkStatusEnum.DEACTIVATED, clock.instant());
            LOGGER.info("Live link deactivated (delete requested)",
                    keyValue("action", "delete_live_link"), keyValue("match_id", matchId),
                    keyValue("live_link_id", link.id()), keyValue("auth0_id", auth0Id),
                    keyValue("new_status", LiveLinkStatusEnum.DEACTIVATED));
        });
    }

    private MatchLiveLinkResultView handlePostMatchUpsert(
            MatchLiveMatchSnapshot match,
            MatchLiveLinkSnapshot active,
            LiveProviderEnum provider,
            String url,
            String auth0Id,
            Instant now,
            MatchLiveLinkUpsertPlan plan) {
        Long matchId = match.id();
        MatchLiveLinkSnapshot last = liveLinks.findLatestByOwner(matchId, auth0Id).orElse(null);
        if (last != null && isSameLink(last, provider, url)
                && (last.status() == LiveLinkStatusEnum.ACTIVE || last.status() == LiveLinkStatusEnum.PENDING)) {
            LOGGER.info("Post-match live link unchanged, skipping",
                    keyValue("action", "set_live_link_post_match_noop"), keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id), keyValue("link_id", last.id()),
                    keyValue("status", last.status()));
            return projector.toResult(last);
        }

        expire(active, now);
        if (plan.expirePending()) {
            liveLinks.changePendingByOwner(matchId, auth0Id, LiveLinkStatusEnum.EXPIRED, now);
        }

        MatchLiveLinkSnapshot saved = create(matchId, auth0Id, provider, url, plan.createdStatus(), now);
        if (plan.touchMatch()) {
            liveLinks.touchMatch(matchId, now);
        }
        logCreated(saved, auth0Id, "Post-match link created as PENDING", "set_live_link_post_match_pending");
        return projector.toResult(saved);
    }

    private MatchLiveLinkSnapshot create(
            Long matchId,
            String auth0Id,
            LiveProviderEnum provider,
            String url,
            LiveLinkStatusEnum status,
            Instant now) {
        return liveLinks.create(new NewMatchLiveLink(matchId, auth0Id, provider, url, status, now));
    }

    private void expire(MatchLiveLinkSnapshot link, Instant now) {
        if (link != null) {
            liveLinks.changeStatus(link.id(), LiveLinkStatusEnum.EXPIRED, now);
        }
    }

    private boolean isSameLink(MatchLiveLinkSnapshot link, LiveProviderEnum provider, String url) {
        return link.provider() == provider && url.equals(link.url());
    }

    private void logCreated(MatchLiveLinkSnapshot saved, String auth0Id, String message, String action) {
        LOGGER.info(message, keyValue("action", action),
                keyValue("match_id", saved.matchId()), keyValue("provider", saved.provider()),
                keyValue("url", saved.url()), keyValue("auth0_id", auth0Id),
                keyValue("owner_auth0_id", saved.ownerAuth0Id()), keyValue("version_id", saved.id()));
    }

    private MatchNotFoundException notFound(Long matchId, String auth0Id) {
        LOGGER.warn("Match not found while setting live link", keyValue("action", "set_live_link"),
                keyValue("match_id", matchId), keyValue("auth0_id", auth0Id));
        return new MatchNotFoundException(matchId);
    }
}
