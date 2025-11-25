// MatchLiveLinkService.java
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
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
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

    private static final int MIN_ACCOUNT_AGE_DAYS = 7;
    private static final int MAX_LINKS_PER_MATCH_PER_OWNER = 3;
    private static final int MAX_MATCHES_PER_DAY_PER_OWNER = 3;

    private static final String PRO_LEAGUE_CODE = "AALNV";

    private static final String[] YOUTUBE_HOSTS = { "youtube.com", "youtu.be" };
    private static final String[] TWITCH_HOSTS = { "twitch.tv" };
    private static final String[] FACEBOOK_HOSTS = { "facebook.com", "fb.com", "fb.watch" };

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final UsersClientService usersClientService;

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

        if (currentUser == null || currentUser.getCreatedAt() == null) {
            logger.warn("Current user not found or has no createdAt while setting live link",
                    keyValue("action", "set_live_link"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id));
            throw new IllegalStateException("Impossible de vérifier l’ancienneté de ton compte.");
        }

        Instant threshold = now.minus(MIN_ACCOUNT_AGE_DAYS, ChronoUnit.DAYS);
        Instant userCreatedAt = currentUser.getCreatedAt()
                .atZone(PARIS)
                .toInstant();

        if (userCreatedAt.isAfter(threshold)) {
            logger.info("User too recent to set live link",
                    keyValue("action", "set_live_link_rejected_young_account"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("user_id", currentUser.getId()),
                    keyValue("user_created_at", currentUser.getCreatedAt()),
                    keyValue("threshold", threshold));
            throw new IllegalStateException(
                    "Ton compte doit avoir au moins " + MIN_ACCOUNT_AGE_DAYS + " jours pour publier un lien de live.");
        }

        LiveProvider provider = resolveProviderFromUrl(request);

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> {
                    logger.warn("Match not found while setting live link",
                            keyValue("action", "set_live_link"),
                            keyValue("match_id", matchId),
                            keyValue("auth0_id", auth0Id));
                    return new MatchNotFoundException(matchId);
                });

        if (PRO_LEAGUE_CODE.equalsIgnoreCase(match.getLeagueCode())) {
            logger.info("Live link refused for professional match",
                    keyValue("action", "set_live_link_rejected_pro_match"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("league_code", match.getLeagueCode()));
            throw new IllegalStateException(
                    "Les droits de diffusion des matchs professionnels sont réservés à la LNV.");
        }

        boolean isFinished = match.getStatus() == MatchStatus.FINISHED;

        var activeOpt = liveLinkRepository
                .findFirstByMatchIdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE);

        if (isFinished) {
            return handlePostMatchUpsert(match, activeOpt.orElse(null), provider, request, auth0Id, currentUser, now);
        }

        if (match.getMatchDate() != null) {
            ZonedDateTime matchStartParis = ZonedDateTime.ofInstant(match.getMatchDate(), PARIS);
            ZonedDateTime startAllowedParis = matchStartParis.minusHours(1);
            ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);

            if (nowParis.isBefore(startAllowedParis)) {
                logger.info("Live link refused because too early before match",
                        keyValue("action", "set_live_link_rejected_too_early"),
                        keyValue("match_id", matchId),
                        keyValue("auth0_id", auth0Id),
                        keyValue("match_date", match.getMatchDate()),
                        keyValue("now", nowParis));
                throw new IllegalStateException(
                        "Tu pourras publier le lien de live une heure avant le début du match.");
            }
        }

        if (activeOpt.isPresent()) {
            MatchLiveLink active = activeOpt.get();

            if (!auth0Id.equals(active.getOwnerAuth0Id())) {
                logger.warn("User tried to set live link for a match with an active link owned by someone else",
                        keyValue("action", "set_live_link_forbidden_other_owner_active"),
                        keyValue("match_id", matchId),
                        keyValue("auth0_id", auth0Id),
                        keyValue("owner_auth0_id", active.getOwnerAuth0Id()),
                        keyValue("active_link_id", active.getId()));
                throw new AccessDeniedException(
                        "Un autre utilisateur diffuse déjà ce match. Tu ne peux pas modifier son lien.");
            }

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

        long linksForMatchAndOwner = liveLinkRepository.countByMatchIdAndOwnerAuth0Id(matchId, auth0Id);
        if (linksForMatchAndOwner >= MAX_LINKS_PER_MATCH_PER_OWNER) {
            logger.info("User reached per-match live link limit",
                    keyValue("action", "set_live_link_rejected_match_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("links_for_match", linksForMatchAndOwner));
            throw new IllegalStateException("Tu as déjà publié trop de versions de live pour ce match.");
        }

        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        Instant startOfDayParisUtc = nowParis.toLocalDate().atStartOfDay(PARIS).toInstant();
        Instant endOfDayParisUtc = startOfDayParisUtc.plus(1, ChronoUnit.DAYS).minusNanos(1);

        long matchesToday = liveLinkRepository.countDistinctMatchesByOwnerAndDay(
                auth0Id,
                startOfDayParisUtc,
                endOfDayParisUtc);

        boolean alreadyHasLinkForThisMatch = linksForMatchAndOwner > 0;
        if (!alreadyHasLinkForThisMatch && matchesToday >= MAX_MATCHES_PER_DAY_PER_OWNER) {
            logger.info("User reached per-day match limit for live links",
                    keyValue("action", "set_live_link_rejected_daily_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("matches_today", matchesToday));
            throw new IllegalStateException(
                    "Tu as déjà publié des lives pour trop de matchs aujourd’hui. Réessaie demain.");
        }

        activeOpt.ifPresent(active -> {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        });

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
                    if (!auth0Id.equals(link.getOwnerAuth0Id())) {
                        logger.warn("User tried to delete a live link he does not own",
                                keyValue("action", "delete_live_link_forbidden_not_owner"),
                                keyValue("match_id", matchId),
                                keyValue("live_link_id", link.getId()),
                                keyValue("auth0_id", auth0Id),
                                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
                        throw new AccessDeniedException("Seul l’utilisateur qui a publié ce lien peut le supprimer.");
                    }

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
            Instant now) {

        Long matchId = match.getId();

        if (match.isLiveEditLocked()) {
            logger.info("Live link refused because match is locked",
                    keyValue("action", "set_live_link_rejected_locked"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id));
            throw new IllegalStateException("Ce match est verrouillé, le lien ne peut plus être modifié.");
        }

        if (active != null && !auth0Id.equals(active.getOwnerAuth0Id())) {
            logger.warn("User tried to update final link but is not owner",
                    keyValue("action", "set_live_link_forbidden_post_match_not_owner"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("owner_auth0_id", active.getOwnerAuth0Id()),
                    keyValue("active_link_id", active.getId()));
            throw new AccessDeniedException(
                    "Seul l’utilisateur qui a diffusé ce match peut mettre à jour la rediffusion.");
        }

        if (active != null) {
            active.setStatus(LiveLinkStatus.EXPIRED);
            active.setLastUpdate(now);
            liveLinkRepository.save(active);
        }

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

        match.setLiveEditLocked(true);
        match.setLastUpdate(now);
        matchRepository.save(match);

        logger.info("Post-match final live link created and match locked",
                keyValue("action", "set_live_link_post_match_final"),
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