package com.blockout.matches.match.live.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.match.live.persistence.MatchLiveLinkPersistenceMapper;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.services.moderation.MatchLiveLinkModerationPolicy;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkApplicationService.class);
    private static final String[] YOUTUBE_HOSTS = {"youtube.com", "youtu.be"};
    private static final String[] TWITCH_HOSTS = {"twitch.tv"};
    private static final String[] FACEBOOK_HOSTS = {"facebook.com", "fb.com", "fb.watch"};
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final CurrentUserProvider users;
    private final MatchLiveLinkModerationPolicy policy;
    private final MatchLiveLinkEvents events;
    private final MatchLiveLinkPersistenceMapper mapper;
    private final Clock clock;

    @Transactional
    public MatchLiveLinkResultView upsert(Long matchId, UpsertMatchLiveLinkCommand command) {
        CurrentUserSnapshot currentUser = users.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("Utilisateur courant introuvable.");
        }
        String auth0Id = currentUser.auth0Id();
        Instant now = clock.instant();
        boolean moderator = policy.isModerator();

        policy.validateUserAccountAge(currentUser, matchId, now);
        LiveProvider provider = resolveProvider(command.url());
        Match match = matches.findById(matchId).orElseThrow(() -> {
            LOGGER.warn("Match not found while setting live link", keyValue("action", "set_live_link"),
                    keyValue("match_id", matchId), keyValue("auth0_id", auth0Id));
            return new MatchNotFoundException(matchId);
        });
        policy.validateMatchLeague(match, matchId, auth0Id);

        boolean finished = match.getStatus() == MatchStatus.FINISHED;
        MatchLiveLink active = liveLinks
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .orElse(null);

        if (finished && !moderator) {
            policy.validatePostMatchLinkRules(match, active, auth0Id, matchId, now);
            return handlePostMatchUpsert(match, active, provider, command.url(), auth0Id, now);
        }

        policy.validatePublishWindow(match, now, matchId, auth0Id);
        if (active != null) {
            policy.validateOwnerOfActiveLink(active, auth0Id, matchId);
            if (active.getProvider() == provider && command.url().equals(active.getUrl())) {
                LOGGER.info("Live link unchanged, skipping new version", keyValue("action", "set_live_link_noop"),
                        keyValue("match_id", matchId), keyValue("auth0_id", auth0Id),
                        keyValue("active_link_id", active.getId()));
                return mapper.toResult(active);
            }
        }

        long ownerLinkCount = liveLinks.countByMatch_IdAndOwnerAuth0Id(matchId, auth0Id);
        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        Instant startOfDay = nowParis.toLocalDate().atStartOfDay(PARIS).toInstant();
        Instant endOfDay = startOfDay.plus(1, ChronoUnit.DAYS).minusNanos(1);
        long ownerMatchCountToday = liveLinks.countDistinctMatchesByOwnerAndDay(auth0Id, startOfDay, endOfDay);
        policy.validateLinkQuotas(
                matchId, auth0Id, ownerLinkCount, ownerMatchCountToday, ownerLinkCount > 0);

        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinks.save(active);
        }

        MatchLiveLink saved = liveLinks.save(MatchLiveLink.builder()
                .match(match)
                .ownerAuth0Id(auth0Id)
                .provider(provider)
                .url(command.url())
                .status(LiveLinkStatus.ACTIVE)
                .reportCount(0)
                .createdAt(now)
                .lastUpdate(now)
                .build());

        LOGGER.info("Live link version created", keyValue("action", "set_live_link"),
                keyValue("match_id", matchId), keyValue("provider", saved.getProvider()),
                keyValue("url", saved.getUrl()), keyValue("auth0_id", auth0Id),
                keyValue("owner_auth0_id", saved.getOwnerAuth0Id()),
                keyValue("version_id", saved.getId()));

        if (!finished) {
            events.publishMatchLiveLinkCreated(new MatchLiveLinkCreatedEventInput(
                    match.getId(), match.getTeamIdA(), match.getTeamIdB(), match.getPoolId()));
        }
        return mapper.toResult(saved);
    }

    @Transactional
    public void delete(Long matchId, String auth0Id) {
        liveLinks.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(link -> {
                    policy.validateDeletePermission(link, auth0Id, matchId);
                    link.setStatus(LiveLinkStatus.DEACTIVATED);
                    link.setLastUpdate(clock.instant());
                    liveLinks.save(link);
                    LOGGER.info("Live link deactivated (delete requested)",
                            keyValue("action", "delete_live_link"), keyValue("match_id", matchId),
                            keyValue("live_link_id", link.getId()), keyValue("auth0_id", auth0Id),
                            keyValue("new_status", link.getStatus()));
                });
    }

    @Transactional(readOnly = true)
    public MatchLiveLinkHistoryPage findHistory(Long matchId, int page, int pageSize) {
        Page<MatchLiveLink> result = liveLinks.findByMatch_IdOrderByCreatedAtDescIdDesc(
                matchId, PageRequest.of(page, pageSize));
        return new MatchLiveLinkHistoryPage(result.getContent().stream().map(mapper::toHistoryItem).toList(),
                page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public List<MatchLiveLinkHistoryItemView> findAllHistory(Long matchId) {
        List<MatchLiveLinkHistoryItemView> result = liveLinks.findByMatch_IdOrderByCreatedAtDescIdDesc(matchId).stream()
                .map(mapper::toHistoryItem)
                .toList();
        if (result.isEmpty()) {
            LOGGER.info("No live links found for match", keyValue("action", "get_live_links_history"),
                    keyValue("match_id", matchId));
        }
        return result;
    }

    private MatchLiveLinkResultView handlePostMatchUpsert(
            Match match,
            MatchLiveLink active,
            LiveProvider provider,
            String url,
            String auth0Id,
            Instant now) {
        Long matchId = match.getId();
        MatchLiveLink last = liveLinks
                .findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc(matchId, auth0Id)
                .orElse(null);
        if (last != null && last.getProvider() == provider && url.equals(last.getUrl())
                && (last.getStatus() == LiveLinkStatus.ACTIVE || last.getStatus() == LiveLinkStatus.PENDING)) {
            LOGGER.info("Post-match live link unchanged, skipping",
                    keyValue("action", "set_live_link_post_match_noop"), keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id), keyValue("link_id", last.getId()),
                    keyValue("status", last.getStatus()));
            return mapper.toResult(last);
        }

        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinks.save(active);
        }
        List<MatchLiveLink> previousPending = liveLinks.findByMatch_IdAndOwnerAuth0IdAndStatus(
                matchId, auth0Id, LiveLinkStatus.PENDING);
        if (!previousPending.isEmpty()) {
            previousPending.forEach(link -> {
                link.setStatus(LiveLinkStatus.EXPIRED);
                link.setLastUpdate(now);
            });
            liveLinks.saveAll(previousPending);
        }

        MatchLiveLink saved = liveLinks.save(MatchLiveLink.builder()
                .match(match)
                .ownerAuth0Id(auth0Id)
                .provider(provider)
                .url(url)
                .status(LiveLinkStatus.PENDING)
                .reportCount(0)
                .createdAt(now)
                .lastUpdate(now)
                .build());
        match.setLastUpdate(now);
        matches.save(match);
        LOGGER.info("Post-match link created as PENDING", keyValue("action", "set_live_link_post_match_pending"),
                keyValue("match_id", matchId), keyValue("provider", saved.getProvider()),
                keyValue("url", saved.getUrl()), keyValue("auth0_id", auth0Id),
                keyValue("version_id", saved.getId()));
        return mapper.toResult(saved);
    }

    private LiveProvider resolveProvider(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("Le lien du live est requis.");
        }
        try {
            URI uri = new URI(url);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.isBlank()) {
                throw new IllegalArgumentException("URL invalide.");
            }
            if (matchesHost(host, YOUTUBE_HOSTS)) {
                return LiveProvider.YOUTUBE;
            }
            if (matchesHost(host, TWITCH_HOSTS)) {
                return LiveProvider.TWITCH;
            }
            if (matchesHost(host, FACEBOOK_HOSTS)) {
                return LiveProvider.FACEBOOK;
            }
            throw new IllegalArgumentException("Seuls les liens YouTube, Twitch ou Facebook sont acceptés.");
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("URL invalide.", exception);
        }
    }

    private boolean matchesHost(String host, String[] bases) {
        for (String base : bases) {
            if (host.equals(base) || host.endsWith("." + base)) {
                return true;
            }
        }
        return false;
    }
}
