package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.MatchLiveLinkDTO;
import com.blockout.matches.models.dto.match.MatchLiveLinkRequestDTO;
import com.blockout.matches.models.dto.match.MatchLiveLinkResponseDTO;
import com.blockout.matches.models.dto.users.CustomUserDTO;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.services.clients.UsersClientService;
import com.blockout.matches.services.moderation.MatchLiveLinkModerationPolicy;

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
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkService {

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkService.class);

    private static final String[] YOUTUBE_HOSTS = { "youtube.com", "youtu.be" };
    private static final String[] TWITCH_HOSTS = { "twitch.tv" };
    private static final String[] FACEBOOK_HOSTS = { "facebook.com", "fb.com", "fb.watch" };

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final UsersClientService usersClientService;
    private final MatchLiveLinkModerationPolicy moderationPolicy;

    @Transactional
    public MatchLiveLinkResponseDTO upsertLiveLink(Long matchId, MatchLiveLinkRequestDTO request) {
        CustomUserDTO currentUser = usersClientService.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("Utilisateur courant introuvable.");
        }
        String auth0Id = currentUser.getAuth0Id();
        Instant now = Instant.now();

        boolean isModerator = moderationPolicy.isModerator();

        // Anti-abus général (sauf modérateurs – déjà géré dans la policy)
        moderationPolicy.validateUserAccountAge(currentUser, matchId, now);

        LiveProvider provider = resolveProviderFromUrl(request);

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> {
                    logger.warn("Match not found while setting live link",
                            keyValue("action", "set_live_link"),
                            keyValue("match_id", matchId),
                            keyValue("auth0_id", auth0Id));
                    return new MatchNotFoundException(matchId);
                });

        moderationPolicy.validateMatchLeague(match, matchId, auth0Id);

        boolean isFinished = match.getStatus() == MatchStatus.FINISHED;

        var activeOpt = liveLinkRepository
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE);

        // Les modérateurs ne passent pas par le PENDING, ils suivent le flux "live"
        if (isFinished && !isModerator) {
            moderationPolicy.validatePostMatchLinkRules(
                    match,
                    activeOpt.orElse(null),
                    auth0Id,
                    matchId,
                    now);

            return handlePostMatchUpsert(
                    match,
                    activeOpt.orElse(null),
                    provider,
                    request,
                    auth0Id,
                    currentUser,
                    now);
        }

        // Cas live (match non terminé) OU modérateur (match fini ou non)
        // → validatePublishWindow ne fait rien pour les modos
        moderationPolicy.validatePublishWindow(match, now, matchId, auth0Id);

        if (activeOpt.isPresent()) {
            MatchLiveLink active = activeOpt.get();

            // Proprio ou modérateur
            moderationPolicy.validateOwnerOfActiveLink(active, auth0Id, matchId);

            boolean sameProvider = active.getProvider() == provider;
            boolean sameUrl = request.getUrl().equals(active.getUrl());
            if (sameProvider && sameUrl) {
                logger.info("Live link unchanged, skipping new version",
                        keyValue("action", "set_live_link_noop"),
                        keyValue("match_id", matchId),
                        keyValue("auth0_id", auth0Id),
                        keyValue("active_link_id", active.getId()));
                return toResponseDto(active);
            }
        }

        long linksForMatchAndOwner = liveLinkRepository.countByMatch_IdAndOwnerAuth0Id(matchId, auth0Id);

        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        Instant startOfDayParisUtc = nowParis.toLocalDate().atStartOfDay(PARIS).toInstant();
        Instant endOfDayParisUtc = startOfDayParisUtc.plus(1, ChronoUnit.DAYS).minusNanos(1);

        long matchesToday = liveLinkRepository.countDistinctMatchesByOwnerAndDay(
                auth0Id,
                startOfDayParisUtc,
                endOfDayParisUtc);

        boolean alreadyHasLinkForThisMatch = linksForMatchAndOwner > 0;

        // Quotas standard (ignorés pour modérateurs – déjà géré dans la policy)
        moderationPolicy.validateLinkQuotas(
                matchId,
                auth0Id,
                linksForMatchAndOwner,
                matchesToday,
                alreadyHasLinkForThisMatch);

        // On expire l'ancien lien actif s'il existe
        activeOpt.ifPresent(active -> {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        });

        // Ici : que le match soit fini ou non, pour un modérateur on arrive
        // dans ce flux → lien directement ACTIVE.
        MatchLiveLink newLink = MatchLiveLink.builder()
                .match(match)
                .ownerAuth0Id(auth0Id)
                .provider(provider)
                .url(request.getUrl())
                .status(LiveLinkStatus.ACTIVE)
                .reportCount(0)
                .createdAt(now)
                .lastUpdate(now)
                .build();

        MatchLiveLink saved = liveLinkRepository.save(newLink);

        logger.info("Live link version created",
                keyValue("action", "set_live_link"),
                keyValue("match_id", matchId),
                keyValue("provider", saved.getProvider()),
                keyValue("url", saved.getUrl()),
                keyValue("auth0_id", auth0Id),
                keyValue("owner_auth0_id", saved.getOwnerAuth0Id()),
                keyValue("user_id", currentUser.getId()),
                keyValue("version_id", saved.getId()));

        return toResponseDto(saved);
    }

    @Transactional
    public void deleteLiveLink(Long matchId, String auth0Id) {
        liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(link -> {
                    moderationPolicy.validateDeletePermission(link, auth0Id, matchId);

                    link.setStatus(LiveLinkStatus.HIDDEN);
                    link.setLastUpdate(Instant.now());
                    liveLinkRepository.save(link);

                    logger.info("Live link hidden (delete requested)",
                            keyValue("action", "delete_live_link"),
                            keyValue("match_id", matchId),
                            keyValue("live_link_id", link.getId()),
                            keyValue("auth0_id", auth0Id));
                });
    }

    @Transactional(readOnly = true)
    public List<MatchLiveLinkDTO> getLiveLinksHistoryForMatch(Long matchId) {
        List<MatchLiveLink> links = liveLinkRepository
                .findByMatch_Id(matchId);

        if (links.isEmpty()) {
            logger.info("No live links found for match",
                    keyValue("action", "get_live_links_history"),
                    keyValue("match_id", matchId));
            return List.of();
        }

        // On trie côté Java si tu veux l’ordre descendant par createdAt
        List<MatchLiveLink> sorted = links.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());

        return sorted.stream()
                .map(link -> MatchLiveLinkDTO.builder()
                        .id(link.getId())
                        .matchId(link.getMatch() != null ? link.getMatch().getId() : null)
                        .provider(link.getProvider())
                        .url(link.getUrl())
                        .status(link.getStatus())
                        .reportCount(link.getReportCount())
                        .ownerAuth0Id(link.getOwnerAuth0Id())
                        .createdAt(link.getCreatedAt())
                        .lastUpdate(link.getLastUpdate())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void approvePendingLink(Long liveLinkId) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));

        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        Match match = link.getMatch();
        if (match == null || match.getId() == null) {
            throw new MatchNotFoundException(null);
        }

        Long matchId = match.getId();
        Instant now = Instant.now();

        liveLinkRepository
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(active -> {
                    active.setStatus(LiveLinkStatus.EXPIRED);
                    active.setLastUpdate(now);
                    liveLinkRepository.save(active);

                    logger.info("Active live link expired due to approval of pending link",
                            keyValue("action", "expire_active_on_pending_approval"),
                            keyValue("expired_live_link_id", active.getId()),
                            keyValue("match_id", matchId),
                            keyValue("approved_pending_live_link_id", liveLinkId));
                });

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);

        match.setLastUpdate(now);
        matchRepository.save(match);

        logger.info("Pending live link approved by admin",
                keyValue("action", "approve_pending_live_link"),
                keyValue("live_link_id", link.getId()),
                keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    @Transactional
    public void rejectPendingLink(Long liveLinkId) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));

        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        Instant now = Instant.now();

        link.setStatus(LiveLinkStatus.REJECTED);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);

        logger.info("Pending live link rejected by admin",
                keyValue("action", "reject_pending_live_link"),
                keyValue("live_link_id", link.getId()),
                keyValue("match_id", link.getMatch() != null ? link.getMatch().getId() : null),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    @Transactional
    public void reactivateLiveLink(Long liveLinkId) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));

        LiveLinkStatus status = link.getStatus();
        if (status != LiveLinkStatus.REJECTED
                && status != LiveLinkStatus.EXPIRED
                && status != LiveLinkStatus.HIDDEN) {
            throw new IllegalStateException("Ce lien ne peut pas être réactivé dans son état actuel.");
        }

        Match match = link.getMatch();
        if (match == null || match.getId() == null) {
            throw new IllegalStateException("Match associé au lien introuvable.");
        }

        Long matchId = match.getId();
        Instant now = Instant.now();

        liveLinkRepository
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(active -> {
                    if (!active.getId().equals(link.getId())) {
                        active.setStatus(LiveLinkStatus.HIDDEN);
                        active.setLastUpdate(now);
                        liveLinkRepository.save(active);

                        logger.info("Previous active live link hidden before activation",
                                keyValue("action", "hide_previous_active_live_link"),
                                keyValue("match_id", matchId),
                                keyValue("previous_live_link_id", active.getId()),
                                keyValue("new_live_link_id", link.getId()));
                    }
                });

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);

        match.setLastUpdate(now);
        matchRepository.save(match);

        logger.info("Live link activated by moderation",
                keyValue("action", "reactivate_live_link"),
                keyValue("live_link_id", link.getId()),
                keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    private MatchLiveLinkResponseDTO handlePostMatchUpsert(
            Match match,
            MatchLiveLink active,
            LiveProvider provider,
            MatchLiveLinkRequestDTO request,
            String auth0Id,
            CustomUserDTO currentUser,
            Instant now) {

        Long matchId = match.getId();

        // Récupérer le dernier lien du user pour ce match
        MatchLiveLink last = liveLinkRepository
                .findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc(matchId, auth0Id)
                .orElse(null);

        // Si même URL + provider + status ACTIVE ou PENDING → NO-OP
        if (last != null
                && last.getProvider() == provider
                && request.getUrl().equals(last.getUrl())
                && (last.getStatus() == LiveLinkStatus.ACTIVE || last.getStatus() == LiveLinkStatus.PENDING)) {

            logger.info("Post-match live link unchanged → skipping",
                    keyValue("action", "set_live_link_post_match_noop"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("link_id", last.getId()),
                    keyValue("status", last.getStatus()));

            return toResponseDto(last);
        }

        // Expirer lien actif s’il existe
        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        }

        // Expirer les anciens PENDING du même owner
        List<MatchLiveLink> previousPending = liveLinkRepository
                .findByMatch_IdAndOwnerAuth0IdAndStatus(
                        matchId,
                        auth0Id,
                        LiveLinkStatus.PENDING);

        if (!previousPending.isEmpty()) {
            previousPending.forEach(p -> {
                p.setStatus(LiveLinkStatus.EXPIRED);
                p.setLastUpdate(now);
            });
            liveLinkRepository.saveAll(previousPending);
        }

        // Créer le nouveau lien PENDING
        MatchLiveLink pendingLink = MatchLiveLink.builder()
                .match(match)
                .ownerAuth0Id(auth0Id)
                .provider(provider)
                .url(request.getUrl())
                .status(LiveLinkStatus.PENDING)
                .reportCount(0)
                .createdAt(now)
                .lastUpdate(now)
                .build();

        MatchLiveLink saved = liveLinkRepository.save(pendingLink);

        match.setLastUpdate(now);
        matchRepository.save(match);

        logger.info("Post-match link created as PENDING",
                keyValue("action", "set_live_link_post_match_pending"),
                keyValue("match_id", matchId),
                keyValue("provider", saved.getProvider()),
                keyValue("url", saved.getUrl()),
                keyValue("auth0_id", auth0Id),
                keyValue("version_id", saved.getId()));

        return toResponseDto(saved);
    }

    private MatchLiveLinkResponseDTO toResponseDto(MatchLiveLink entity) {
        return MatchLiveLinkResponseDTO.builder()
                .matchId(entity.getMatch() != null ? entity.getMatch().getId() : null)
                .provider(entity.getProvider())
                .url(entity.getUrl())
                .status(entity.getStatus())
                .reportCount(entity.getReportCount())
                .ownerAuth0Id(entity.getOwnerAuth0Id())
                .build();
    }

    private LiveProvider resolveProviderFromUrl(MatchLiveLinkRequestDTO request) {
        if (request.getUrl() == null || request.getUrl().isBlank()) {
            throw new IllegalArgumentException("Le lien du live est requis.");
        }

        try {
            URI uri = new URI(request.getUrl());
            String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";

            if (host.isBlank()) {
                throw new IllegalArgumentException("URL invalide.");
            }

            if (matchesHost(host, YOUTUBE_HOSTS))
                return LiveProvider.YOUTUBE;
            if (matchesHost(host, TWITCH_HOSTS))
                return LiveProvider.TWITCH;
            if (matchesHost(host, FACEBOOK_HOSTS))
                return LiveProvider.FACEBOOK;

            throw new IllegalArgumentException("Seuls les liens YouTube, Twitch ou Facebook sont acceptés.");
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("URL invalide.", e);
        }
    }

    private boolean matchesHost(String host, String[] bases) {
        for (String base : bases) {
            if (host.equals(base) || host.endsWith("." + base))
                return true;
        }
        return false;
    }
}