package com.blockout.matches.match.live.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkPolicy {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkPolicy.class);
    private static final int MIN_ACCOUNT_AGE_DAYS = 7;
    private static final int MAX_LINKS_PER_MATCH_PER_OWNER = 3;
    private static final int MAX_MATCHES_PER_DAY_PER_OWNER = 3;
    private static final String PRO_LEAGUE_CODE = "AALNV";
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    public void validateUserAccountAge(
            CurrentUserSnapshot currentUser, Long matchId, Instant now, boolean moderator) {
        if (moderator) {
            return;
        }
        if (currentUser == null || currentUser.createdAt() == null) {
            LOGGER.warn("Current user not found or has no createdAt while setting live link",
                    keyValue("action", "set_live_link"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", currentUser == null ? null : currentUser.auth0Id()));
            throw new IllegalStateException("Impossible de vérifier l’ancienneté de ton compte.");
        }
        Instant threshold = now.minus(MIN_ACCOUNT_AGE_DAYS, ChronoUnit.DAYS);
        Instant userCreatedAt = currentUser.createdAt().atZone(PARIS).toInstant();
        if (userCreatedAt.isAfter(threshold)) {
            LOGGER.info("User too recent to set live link",
                    keyValue("action", "set_live_link_rejected_young_account"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", currentUser.auth0Id()),
                    keyValue("user_created_at", currentUser.createdAt()),
                    keyValue("threshold", threshold));
            throw new IllegalStateException(
                    "Ton compte doit avoir au moins " + MIN_ACCOUNT_AGE_DAYS + " jours pour publier un lien de live.");
        }
    }

    public void validateMatchLeague(MatchLiveMatchSnapshot match, Long matchId, String auth0Id) {
        if (PRO_LEAGUE_CODE.equalsIgnoreCase(match.leagueCode())) {
            LOGGER.info("Live link refused for professional match",
                    keyValue("action", "set_live_link_rejected_pro_match"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("league_code", match.leagueCode()));
            throw new IllegalStateException(
                    "Les droits de diffusion des matchs professionnels sont réservés à la LNV.");
        }
    }

    public void validatePublishWindow(
            MatchLiveMatchSnapshot match, Instant now, Long matchId, String auth0Id, boolean moderator) {
        if (moderator || match.matchDate() == null) {
            return;
        }
        ZonedDateTime matchStartParis = ZonedDateTime.ofInstant(match.matchDate(), PARIS);
        ZonedDateTime startAllowedParis = matchStartParis.minusHours(1);
        ZonedDateTime nowParis = ZonedDateTime.ofInstant(now, PARIS);
        if (nowParis.isBefore(startAllowedParis)) {
            LOGGER.info("Live link refused because too early before match",
                    keyValue("action", "set_live_link_rejected_too_early"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("match_date", match.matchDate()),
                    keyValue("now", nowParis));
            throw new IllegalStateException(
                    "Tu pourras publier le lien de live une heure avant le début du match.");
        }
    }

    public void validateOwnerOfActiveLink(
            MatchLiveLinkSnapshot active, String auth0Id, Long matchId, boolean moderator) {
        if (moderator) {
            return;
        }
        if (!auth0Id.equals(active.ownerAuth0Id())) {
            LOGGER.warn("User tried to set live link for a match with an active link owned by someone else",
                    keyValue("action", "set_live_link_forbidden_other_owner_active"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("owner_auth0_id", active.ownerAuth0Id()),
                    keyValue("active_link_id", active.id()));
            throw new AccessDeniedException(
                    "Un autre utilisateur diffuse déjà ce match. Tu ne peux pas modifier son lien.");
        }
    }

    public void validateLinkQuotas(
            Long matchId,
            String auth0Id,
            long linksForMatchAndOwner,
            long matchesToday,
            boolean alreadyHasLinkForThisMatch,
            boolean moderator) {
        if (moderator) {
            return;
        }
        if (linksForMatchAndOwner >= MAX_LINKS_PER_MATCH_PER_OWNER) {
            LOGGER.info("User reached per-match live link limit",
                    keyValue("action", "set_live_link_rejected_match_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("links_for_match", linksForMatchAndOwner));
            throw new IllegalStateException("Tu as déjà publié trop de versions de live pour ce match.");
        }
        if (!alreadyHasLinkForThisMatch && matchesToday >= MAX_MATCHES_PER_DAY_PER_OWNER) {
            LOGGER.info("User reached per-day match limit for live links",
                    keyValue("action", "set_live_link_rejected_daily_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("matches_today", matchesToday));
            throw new IllegalStateException(
                    "Tu as déjà publié des lives pour trop de matchs aujourd’hui. Réessaie demain.");
        }
    }

    public void validatePostMatchLinkRules(
            MatchLiveLinkSnapshot active, String auth0Id, Long matchId, boolean moderator) {
        if (moderator) {
            return;
        }
        if (active != null && !auth0Id.equals(active.ownerAuth0Id())) {
            LOGGER.warn("User tried to update post-match link but is not owner",
                    keyValue("action", "set_live_link_forbidden_post_match_not_owner"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("owner_auth0_id", active.ownerAuth0Id()),
                    keyValue("active_link_id", active.id()));
            throw new AccessDeniedException(
                    "Seul l’utilisateur qui a diffusé ce match peut mettre à jour le lien après match.");
        }
    }

    public void validateDeletePermission(
            MatchLiveLinkSnapshot link, String auth0Id, Long matchId, boolean moderator) {
        if (moderator) {
            return;
        }
        if (!auth0Id.equals(link.ownerAuth0Id())) {
            LOGGER.warn("User tried to delete a live link he does not own",
                    keyValue("action", "delete_live_link_forbidden_not_owner"),
                    keyValue("match_id", matchId),
                    keyValue("live_link_id", link.id()),
                    keyValue("auth0_id", auth0Id),
                    keyValue("owner_auth0_id", link.ownerAuth0Id()));
            throw new AccessDeniedException("Seul l’utilisateur qui a publié ce lien peut le supprimer.");
        }
    }
}
