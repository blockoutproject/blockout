package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
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
import java.util.Locale;

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
                .findFirstByMatchIdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .map(this::toResponseDto)
                .orElse(null);
    }

    @Transactional
    public MatchLiveLinkResponseDTO upsertLiveLink(Long matchId, MatchLiveLinkRequestDTO request, String auth0Id) {
        CustomUserDTO currentUser = usersClientService.getCurrentUser();
        Instant now = Instant.now();

        // Règle: ancienneté minimum du compte
        moderationPolicy.validateUserAccountAge(currentUser, matchId, auth0Id, now);

        // Valide l'URL et déduit le provider (YouTube/Twitch/Facebook)
        LiveProvider provider = resolveProviderFromUrl(request);

        // Chargement du match
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> {
                    logger.warn("Match not found while setting live link",
                            keyValue("action", "set_live_link"),
                            keyValue("match_id", matchId),
                            keyValue("auth0_id", auth0Id));
                    return new MatchNotFoundException(matchId);
                });

        // Règle: pas de lien sur les matchs pros
        moderationPolicy.validateMatchLeague(match, matchId, auth0Id);

        boolean isFinished = match.getStatus() == MatchStatus.FINISHED;

        var activeOpt = liveLinkRepository
                .findFirstByMatchIdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE);

        // Cas: match terminé → gestion rediffusion finale (avec nouvelles règles)
        if (isFinished) {
            // On ne compte que les liens créés après la date du match comme "rediff"
            long rediffCountForOwner = 0L;
            if (match.getMatchDate() != null) {
                rediffCountForOwner = liveLinkRepository
                        .countByMatchIdAndOwnerAuth0IdAndCreatedAtAfter(
                                matchId,
                                auth0Id,
                                match.getMatchDate());
            }

            moderationPolicy.validatePostMatchRediffRules(
                    match,
                    activeOpt.orElse(null),
                    auth0Id,
                    matchId,
                    now,
                    rediffCountForOwner);

            return handlePostMatchUpsert(
                    match,
                    activeOpt.orElse(null),
                    provider,
                    request,
                    auth0Id,
                    currentUser,
                    now,
                    rediffCountForOwner);
        }

        // Cas: match non terminé → fenêtre temporelle (1h avant)
        moderationPolicy.validatePublishWindow(match, now, matchId, auth0Id);

        // Si un lien actif existe déjà
        if (activeOpt.isPresent()) {
            MatchLiveLink active = activeOpt.get();

            // Vérifie que l'utilisateur a les droits sur le lien actif
            moderationPolicy.validateOwnerOfActiveLink(active, auth0Id, matchId);

            boolean sameProvider = active.getProvider() == provider;
            boolean sameUrl = request.getUrl().equals(active.getUrl());
            if (sameProvider && sameUrl) {
                // Pas de changement → on renvoie la version existante
                logger.info("Live link unchanged, skipping new version",
                        keyValue("action", "set_live_link_noop"),
                        keyValue("match_id", matchId),
                        keyValue("auth0_id", auth0Id),
                        keyValue("active_link_id", active.getId()));
                return toResponseDto(active);
            }
        }

        // Calcul des quotas "live" par match et par jour
        long linksForMatchAndOwner = liveLinkRepository.countByMatchIdAndOwnerAuth0Id(matchId, auth0Id);

        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        Instant startOfDayParisUtc = nowParis.toLocalDate().atStartOfDay(PARIS).toInstant();
        Instant endOfDayParisUtc = startOfDayParisUtc.plus(1, ChronoUnit.DAYS).minusNanos(1);

        long matchesToday = liveLinkRepository.countDistinctMatchesByOwnerAndDay(
                auth0Id,
                startOfDayParisUtc,
                endOfDayParisUtc);

        boolean alreadyHasLinkForThisMatch = linksForMatchAndOwner > 0;

        // Règle: quotas (versions / match + matchs / jour)
        moderationPolicy.validateLinkQuotas(
                matchId,
                auth0Id,
                linksForMatchAndOwner,
                matchesToday,
                alreadyHasLinkForThisMatch);

        // Expiration de l'ancien lien actif éventuel
        activeOpt.ifPresent(active -> {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        });

        // Création d'une nouvelle version ACTIVE (live pendant/avant match)
        MatchLiveLink newLink = MatchLiveLink.builder()
                .matchId(match.getId())
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
        liveLinkRepository.findFirstByMatchIdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(link -> {
                    // Vérifie que l'utilisateur est bien owner du lien
                    moderationPolicy.validateDeletePermission(link, auth0Id, matchId);

                    // On masque logiquement le lien
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

    private MatchLiveLinkResponseDTO handlePostMatchUpsert(
            Match match,
            MatchLiveLink active,
            LiveProvider provider,
            MatchLiveLinkRequestDTO request,
            String auth0Id,
            CustomUserDTO currentUser,
            Instant now,
            long rediffCountForOwner) {

        Long matchId = match.getId();

        // Si une rediff existe, on la passe en EXPIRED
        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        }

        // Création de la rediff ACTIVE
        MatchLiveLink finalLink = MatchLiveLink.builder()
                .matchId(match.getId())
                .ownerAuth0Id(auth0Id)
                .provider(provider)
                .url(request.getUrl())
                .status(LiveLinkStatus.ACTIVE)
                .reportCount(0)
                .createdAt(now)
                .lastUpdate(now)
                .build();

        MatchLiveLink saved = liveLinkRepository.save(finalLink);

        long rediffCountAfterSave = rediffCountForOwner + 1;

        // On fige quand on a atteint le quota ou dépassé la fenêtre
        if (moderationPolicy.shouldLockRediffAfterSave(match, rediffCountAfterSave, now)) {
            match.setLiveEditLocked(true);
        }

        match.setLastUpdate(now);
        matchRepository.save(match);

        logger.info("Post-match rediff live link created",
                keyValue("action", "set_live_link_post_match_rediff"),
                keyValue("match_id", matchId),
                keyValue("provider", saved.getProvider()),
                keyValue("url", saved.getUrl()),
                keyValue("auth0_id", auth0Id),
                keyValue("owner_auth0_id", saved.getOwnerAuth0Id()),
                keyValue("user_id", currentUser.getId()),
                keyValue("version_id", saved.getId()),
                keyValue("rediff_count_after_save", rediffCountAfterSave));

        return toResponseDto(saved);
    }

    private MatchLiveLinkResponseDTO toResponseDto(MatchLiveLink entity) {
        return MatchLiveLinkResponseDTO.builder()
                .matchId(entity.getMatchId())
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