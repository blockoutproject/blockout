package com.blockout.matches.match.application;

import com.blockout.matches.match.application.commands.SetMatchLiveLinkCommand;
import com.blockout.matches.match.application.exceptions.MatchNotFoundException;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.ports.CurrentUserProvider;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.CurrentUserView;
import com.blockout.matches.match.application.views.MatchLiveLinkResult;
import com.blockout.matches.match.application.views.MatchLiveLinkView;
import com.blockout.matches.match.application.views.MatchView;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkRepository;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkApplicationService implements MatchLiveLinkService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkApplicationService.class);
    private static final String[] YOUTUBE_HOSTS = {"youtube.com", "youtu.be"};
    private static final String[] TWITCH_HOSTS = {"twitch.tv"};
    private static final String[] FACEBOOK_HOSTS = {"facebook.com", "fb.com", "fb.watch"};
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final CurrentUserProvider currentUserProvider;
    private final MatchLiveLinkModerationPolicy moderationPolicy;
    private final MatchEventPublisher eventPublisher;

    @Override
    @Transactional
    public MatchLiveLinkResult upsertLiveLink(Long matchId, SetMatchLiveLinkCommand command) {
        CurrentUserView currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("Utilisateur courant introuvable.");
        }
        String auth0Id = currentUser.auth0Id();
        Instant now = Instant.now();
        boolean moderator = moderationPolicy.isModerator();
        moderationPolicy.validateUserAccountAge(currentUser, matchId, now);
        LiveProvider provider = resolveProvider(command.url());
        MatchEntity match = loadMatch(matchId);
        moderationPolicy.validateMatchLeague(match, matchId, auth0Id);

        boolean finished = match.getStatus() == MatchStatus.FINISHED;
        MatchLiveLinkEntity active = liveLinkRepository
            .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
            .orElse(null);
        if (finished && !moderator) {
            moderationPolicy.validatePostMatchLinkRules(active, auth0Id, matchId);
            return handlePostMatchUpsert(match, active, provider, command.url(), auth0Id, now);
        }

        moderationPolicy.validatePublishWindow(match, now, matchId, auth0Id);
        if (active != null) {
            moderationPolicy.validateOwnerOfActiveLink(active, auth0Id, matchId);
            if (active.getProvider() == provider && command.url().equals(active.getUrl())) {
                return toResult(active);
            }
        }

        long linksForMatchAndOwner = liveLinkRepository.countByMatch_IdAndOwnerAuth0Id(matchId, auth0Id);
        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        Instant startOfDay = nowParis.toLocalDate().atStartOfDay(PARIS).toInstant();
        Instant endOfDay = startOfDay.plus(1, ChronoUnit.DAYS).minusNanos(1);
        long matchesToday = liveLinkRepository.countDistinctMatchesByOwnerAndDay(auth0Id, startOfDay, endOfDay);
        moderationPolicy.validateLinkQuotas(
            matchId, auth0Id, linksForMatchAndOwner, matchesToday, linksForMatchAndOwner > 0);

        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        }
        MatchLiveLinkEntity saved = liveLinkRepository.saveAndFlush(MatchLiveLinkEntity.builder()
            .match(match)
            .ownerAuth0Id(auth0Id)
            .provider(provider)
            .url(command.url())
            .status(LiveLinkStatus.ACTIVE)
            .reportCount(0)
            .createdAt(now)
            .lastUpdate(now)
            .build());
        if (!finished) {
            eventPublisher.publishMatchLiveLinkCreated(toMatchView(match, saved));
        }
        LOGGER.info("Created live link version", keyValue("action", "set_live_link"),
            keyValue("matchId", matchId), keyValue("liveLinkId", saved.getId()));
        return toResult(saved);
    }

    @Override
    @Transactional
    public void deleteLiveLink(Long matchId, String auth0Id) {
        liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
            .ifPresent(link -> {
                moderationPolicy.validateDeletePermission(link, auth0Id, matchId);
                link.setStatus(LiveLinkStatus.DEACTIVATED);
                liveLinkRepository.saveAndFlush(link);
                LOGGER.info("Deactivated live link", keyValue("action", "delete_live_link"),
                    keyValue("matchId", matchId), keyValue("liveLinkId", link.getId()));
            });
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchLiveLinkView> getLiveLinksHistoryForMatch(Long matchId) {
        return liveLinkRepository.findByMatch_Id(matchId).stream()
            .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
            .map(this::toView)
            .toList();
    }

    @Override
    @Transactional
    public void approvePendingLink(Long liveLinkId) {
        MatchLiveLinkEntity link = loadLiveLink(liveLinkId);
        requireStatus(link, LiveLinkStatus.PENDING, "Ce lien n'est pas en attente de validation.");
        MatchEntity match = requireMatch(link);
        Instant now = Instant.now();
        expireCurrentActive(match.getId(), link.getId(), now, LiveLinkStatus.EXPIRED);
        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);
        match.setLastUpdate(now);
        matchRepository.saveAndFlush(match);
    }

    @Override
    @Transactional
    public void rejectPendingLink(Long liveLinkId) {
        MatchLiveLinkEntity link = loadLiveLink(liveLinkId);
        requireStatus(link, LiveLinkStatus.PENDING, "Ce lien n'est pas en attente de validation.");
        link.setStatus(LiveLinkStatus.REJECTED);
        liveLinkRepository.saveAndFlush(link);
    }

    @Override
    @Transactional
    public void reactivateLiveLink(Long liveLinkId) {
        MatchLiveLinkEntity link = loadLiveLink(liveLinkId);
        if (link.getStatus() != LiveLinkStatus.REJECTED
            && link.getStatus() != LiveLinkStatus.EXPIRED
            && link.getStatus() != LiveLinkStatus.DEACTIVATED
            && link.getStatus() != LiveLinkStatus.BANNED) {
            throw new IllegalStateException("Ce lien ne peut pas être réactivé dans son état actuel.");
        }
        MatchEntity match = requireMatch(link);
        Instant now = Instant.now();
        expireCurrentActive(match.getId(), link.getId(), now, LiveLinkStatus.DEACTIVATED);
        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);
        match.setLastUpdate(now);
        matchRepository.saveAndFlush(match);
    }

    private MatchLiveLinkResult handlePostMatchUpsert(MatchEntity match, MatchLiveLinkEntity active,
                                                      LiveProvider provider, String url, String auth0Id, Instant now) {
        MatchLiveLinkEntity last = liveLinkRepository
            .findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc(match.getId(), auth0Id)
            .orElse(null);
        if (last != null && last.getProvider() == provider && url.equals(last.getUrl())
            && (last.getStatus() == LiveLinkStatus.ACTIVE || last.getStatus() == LiveLinkStatus.PENDING)) {
            return toResult(last);
        }
        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        }
        List<MatchLiveLinkEntity> pending = liveLinkRepository.findByMatch_IdAndOwnerAuth0IdAndStatus(
            match.getId(), auth0Id, LiveLinkStatus.PENDING);
        pending.forEach(link -> {
            link.setStatus(LiveLinkStatus.EXPIRED);
            link.setLastUpdate(now);
        });
        liveLinkRepository.saveAll(pending);
        MatchLiveLinkEntity saved = liveLinkRepository.save(MatchLiveLinkEntity.builder()
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
        matchRepository.saveAndFlush(match);
        return toResult(saved);
    }

    private void expireCurrentActive(Long matchId, Long replacementId, Instant now, LiveLinkStatus status) {
        liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
            .filter(active -> !active.getId().equals(replacementId))
            .ifPresent(active -> {
                active.setStatus(status);
                active.setLastUpdate(now);
                liveLinkRepository.save(active);
            });
    }

    private MatchEntity loadMatch(Long matchId) {
        return matchRepository.findById(matchId).orElseThrow(() -> new MatchNotFoundException(matchId));
    }

    private MatchLiveLinkEntity loadLiveLink(Long liveLinkId) {
        return liveLinkRepository.findById(liveLinkId)
            .orElseThrow(() -> new IllegalStateException("Lien introuvable."));
    }

    private MatchEntity requireMatch(MatchLiveLinkEntity link) {
        if (link.getMatch() == null || link.getMatch().getId() == null) {
            throw new MatchNotFoundException(null);
        }
        return link.getMatch();
    }

    private void requireStatus(MatchLiveLinkEntity link, LiveLinkStatus status, String message) {
        if (link.getStatus() != status) {
            throw new IllegalStateException(message);
        }
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
            if (matchesHost(host, YOUTUBE_HOSTS)) return LiveProvider.YOUTUBE;
            if (matchesHost(host, TWITCH_HOSTS)) return LiveProvider.TWITCH;
            if (matchesHost(host, FACEBOOK_HOSTS)) return LiveProvider.FACEBOOK;
            throw new IllegalArgumentException("Seuls les liens YouTube, Twitch ou Facebook sont acceptés.");
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("URL invalide.", exception);
        }
    }

    private boolean matchesHost(String host, String[] supportedHosts) {
        for (String supported : supportedHosts) {
            if (host.equals(supported) || host.endsWith("." + supported)) {
                return true;
            }
        }
        return false;
    }

    private MatchLiveLinkView toView(MatchLiveLinkEntity link) {
        return new MatchLiveLinkView(link.getId(), link.getMatch().getId(), link.getProvider(), link.getUrl(),
            link.getStatus(), link.getReportCount(), link.getOwnerAuth0Id(), link.getCreatedAt(), link.getLastUpdate());
    }

    private MatchLiveLinkResult toResult(MatchLiveLinkEntity link) {
        return new MatchLiveLinkResult(link.getMatch().getId(), link.getProvider(), link.getUrl(), link.getStatus(),
            link.getReportCount(), link.getOwnerAuth0Id());
    }

    private MatchView toMatchView(MatchEntity match, MatchLiveLinkEntity link) {
        return new MatchView(match.getId(), match.getMatchCode(), match.getLeagueCode(), match.getPoolId(),
            match.getLiveCode(), match.getTeamIdA(), match.getTeamIdB(), match.getMatchDate(), match.getSeason(),
            match.getSet(), match.getScore(), match.getStatus(), match.getVenue(), match.getFirstReferee(),
            match.getSecondReferee(), match.getActive(), match.getCreatedAt(), match.getLastUpdate(),
            link.getUrl(), link.getProvider(), link.getOwnerAuth0Id());
    }
}
