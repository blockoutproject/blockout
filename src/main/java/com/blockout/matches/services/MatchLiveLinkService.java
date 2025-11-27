package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.MatchDTO;
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
import java.util.Objects;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkService {

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkService.class);

    // Plateformes autorisées
    private static final String[] YOUTUBE_HOSTS = { "youtube.com", "youtu.be" };
    private static final String[] TWITCH_HOSTS = { "twitch.tv" };
    private static final String[] FACEBOOK_HOSTS = { "facebook.com", "fb.com", "fb.watch" };

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final UsersClientService usersClientService;
    private final MatchLiveLinkModerationPolicy moderationPolicy;

    @Transactional(readOnly = true)
    public MatchLiveLinkResponseDTO getActiveLiveLink(Long matchId) {
        return liveLinkRepository
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .map(this::toResponseDto)
                .orElse(null);
    }

    /**
     * Création / mise à jour d'un lien de match.
     * - avant/pendant match → ACTIVE directement
     * - après match → PENDING (validation admin)
     */
    @Transactional
    public MatchLiveLinkResponseDTO upsertLiveLink(Long matchId, MatchLiveLinkRequestDTO request, String auth0Id) {
        CustomUserDTO currentUser = usersClientService.getCurrentUser();
        Instant now = Instant.now();

        // Anti-abus général (sauf modérateurs)
        moderationPolicy.validateUserAccountAge(currentUser, matchId, auth0Id, now);

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

        // Cas post-match → lien en attente de validation (PENDING)
        if (isFinished) {
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

        // Cas live (match non terminé) → fenêtre 1h avant
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

        // Quotas standard (ignorés pour modérateurs)
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

        // Avant/pendant match → lien directement actif
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

    /**
     * Suppression logique du lien actif (owner ou modérateur).
     */
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

    /**
     * Liste tous les liens en statut PENDING, projetés en MatchDTO.
     * On injecte dans le DTO les infos du lien pending (url, provider, owner).
     */
    @Transactional(readOnly = true)
    public List<MatchDTO> listPendingLinks() {
        List<MatchLiveLink> pending = liveLinkRepository.findByStatusWithMatch(LiveLinkStatus.PENDING);
        if (pending.isEmpty()) {
            return List.of();
        }

        return pending.stream()
                .map(link -> {
                    Match match = link.getMatch();
                    if (match == null) {
                        return null;
                    }

                    return MatchDTO.builder()
                            .id(match.getId())
                            .matchCode(match.getMatchCode())
                            .leagueCode(match.getLeagueCode())
                            .poolId(match.getPoolId())
                            .liveCode(match.getLiveCode())
                            .teamIdA(match.getTeamIdA())
                            .teamIdB(match.getTeamIdB())
                            .matchDate(match.getMatchDate())
                            .season(match.getSeason())
                            .set(match.getSet())
                            .score(match.getScore())
                            .status(match.getStatus())
                            .venue(match.getVenue())
                            .firstReferee(match.getFirstReferee())
                            .secondReferee(match.getSecondReferee())
                            // Infos du lien PENDING (candidat)
                            .liveUrl(link.getUrl())
                            .liveProvider(link.getProvider())
                            .liveOwnerAuth0Id(link.getOwnerAuth0Id())
                            .liveEditLocked(match.isLiveEditLocked())
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Approuve un lien PENDING → ACTIVE.
     */
    @Transactional
    public void approvePendingLink(Long liveLinkId, String adminAuth0Id) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));

        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        Match match = link.getMatch();
        if (match == null) {
            match = matchRepository.findById(link.getMatch().getId())
                    .orElseThrow(() -> new MatchNotFoundException(link.getMatch().getId()));
        }

        Instant now = Instant.now();

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);

        if (moderationPolicy.shouldLockLinkEditingAfterSave(match, now)) {
            match.setLiveEditLocked(true);
        }

        match.setLastUpdate(now);
        matchRepository.save(match);

        logger.info("Pending live link approved by admin",
                keyValue("action", "approve_pending_live_link"),
                keyValue("live_link_id", link.getId()),
                keyValue("match_id", match.getId()),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()),
                keyValue("admin_auth0_id", adminAuth0Id));
    }

    /**
     * Refuse un lien PENDING → REJECTED.
     */
    @Transactional
    public void rejectPendingLink(Long liveLinkId, String adminAuth0Id) {
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
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()),
                keyValue("admin_auth0_id", adminAuth0Id));
    }

    /**
     * Cas post-match : création d'une nouvelle version PENDING.
     * - expire l'ancien lien actif (si présent)
     * - expire tous les anciens PENDING de ce même owner pour ce match
     * - crée un nouveau PENDING qui devient le seul candidat en cours.
     */
    private MatchLiveLinkResponseDTO handlePostMatchUpsert(
            Match match,
            MatchLiveLink active,
            LiveProvider provider,
            MatchLiveLinkRequestDTO request,
            String auth0Id,
            CustomUserDTO currentUser,
            Instant now) {

        Long matchId = match.getId();

        // On expire l'ancien lien actif s'il existe
        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        }

        // On expire tous les anciens liens PENDING de ce même owner pour ce match.
        // → un seul lien PENDING "courant" par utilisateur et par match.
        List<MatchLiveLink> previousPendingForOwner = liveLinkRepository.findByMatch_IdAndOwnerAuth0IdAndStatus(
                matchId,
                auth0Id,
                LiveLinkStatus.PENDING);

        if (!previousPendingForOwner.isEmpty()) {
            for (MatchLiveLink oldPending : previousPendingForOwner) {
                oldPending.setStatus(LiveLinkStatus.EXPIRED);
                oldPending.setLastUpdate(now);
            }
            liveLinkRepository.saveAll(previousPendingForOwner);
        }

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

        logger.info("Post-match link created in pending status",
                keyValue("action", "set_live_link_post_match_pending"),
                keyValue("match_id", matchId),
                keyValue("provider", saved.getProvider()),
                keyValue("url", saved.getUrl()),
                keyValue("auth0_id", auth0Id),
                keyValue("owner_auth0_id", saved.getOwnerAuth0Id()),
                keyValue("user_id", currentUser.getId()),
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