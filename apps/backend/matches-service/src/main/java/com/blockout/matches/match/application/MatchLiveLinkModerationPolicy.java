package com.blockout.matches.match.application;

import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.views.CurrentUserView;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
public class MatchLiveLinkModerationPolicy {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkModerationPolicy.class);
    private static final int MIN_ACCOUNT_AGE_DAYS = 7;
    private static final int MAX_LINKS_PER_MATCH_PER_OWNER = 3;
    private static final int MAX_MATCHES_PER_DAY_PER_OWNER = 3;
    private static final String PRO_LEAGUE_CODE = "AALNV";
    private static final int AUTO_HIDE_THRESHOLD = 3;
    private static final int FINAL_AUTO_HIDE_THRESHOLD = 10;
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    private static final String MOD_SCOPE = "SCOPE_moderate:match_live_link";

    public boolean isModerator() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (MOD_SCOPE.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public void validateUserAccountAge(CurrentUserView currentUser, Long matchId, Instant now) {
        if (isModerator()) {
            return;
        }
        if (currentUser == null || currentUser.createdAt() == null) {
            LOGGER.warn("Current user is unavailable while setting live link",
                    keyValue("action", "set_live_link"), keyValue("matchId", matchId));
            throw new IllegalStateException("Impossible de vérifier l’ancienneté de ton compte.");
        }
        Instant threshold = now.minus(MIN_ACCOUNT_AGE_DAYS, ChronoUnit.DAYS);
        if (currentUser.createdAt().isAfter(threshold)) {
            LOGGER.info("User is too recent to set live link",
                    keyValue("action", "set_live_link_rejected_young_account"),
                    keyValue("matchId", matchId), keyValue("auth0Id", currentUser.auth0Id()),
                    keyValue("userId", currentUser.id()));
            throw new IllegalStateException(
                    "Ton compte doit avoir au moins " + MIN_ACCOUNT_AGE_DAYS + " jours pour publier un lien de live.");
        }
    }

    public void validateMatchLeague(MatchEntity match, Long matchId, String auth0Id) {
        if (PRO_LEAGUE_CODE.equalsIgnoreCase(match.getLeagueCode())) {
            LOGGER.info("Live link refused for professional match",
                    keyValue("action", "set_live_link_rejected_pro_match"),
                    keyValue("matchId", matchId), keyValue("auth0Id", auth0Id));
            throw new IllegalStateException(
                    "Les droits de diffusion des matchs professionnels sont réservés à la LNV.");
        }
    }

    public void validatePublishWindow(MatchEntity match, Instant now, Long matchId, String auth0Id) {
        if (isModerator() || match.getMatchDate() == null) {
            return;
        }
        ZonedDateTime startAllowed = ZonedDateTime.ofInstant(match.getMatchDate(), PARIS).minusHours(1);
        if (ZonedDateTime.ofInstant(now, PARIS).isBefore(startAllowed)) {
            LOGGER.info("Live link refused because it is too early",
                    keyValue("action", "set_live_link_rejected_too_early"),
                    keyValue("matchId", matchId), keyValue("auth0Id", auth0Id));
            throw new IllegalStateException(
                    "Tu pourras publier le lien de live une heure avant le début du match.");
        }
    }

    public void validateOwnerOfActiveLink(MatchLiveLinkEntity active, String auth0Id, Long matchId) {
        if (!isModerator() && !auth0Id.equals(active.getOwnerAuth0Id())) {
            LOGGER.warn("User tried to replace another user's active live link",
                    keyValue("action", "set_live_link_forbidden_other_owner_active"),
                    keyValue("matchId", matchId), keyValue("auth0Id", auth0Id));
            throw new AccessDeniedException(
                    "Un autre utilisateur diffuse déjà ce match. Tu ne peux pas modifier son lien.");
        }
    }

    public void validateLinkQuotas(Long matchId, String auth0Id, long linksForMatchAndOwner,
            long matchesToday, boolean alreadyHasLinkForThisMatch) {
        if (isModerator()) {
            return;
        }
        if (linksForMatchAndOwner >= MAX_LINKS_PER_MATCH_PER_OWNER) {
            throw new IllegalStateException("Tu as déjà publié trop de versions de live pour ce match.");
        }
        if (!alreadyHasLinkForThisMatch && matchesToday >= MAX_MATCHES_PER_DAY_PER_OWNER) {
            throw new IllegalStateException(
                    "Tu as déjà publié des lives pour trop de matchs aujourd’hui. Réessaie demain.");
        }
    }

    public void validatePostMatchLinkRules(MatchLiveLinkEntity active, String auth0Id, Long matchId) {
        if (!isModerator() && active != null && !auth0Id.equals(active.getOwnerAuth0Id())) {
            LOGGER.warn("User tried to replace another user's post-match live link",
                    keyValue("action", "set_live_link_forbidden_post_match_not_owner"),
                    keyValue("matchId", matchId), keyValue("auth0Id", auth0Id));
            throw new AccessDeniedException(
                    "Seul l’utilisateur qui a diffusé ce match peut mettre à jour le lien après match.");
        }
    }

    public int determineAutoHideThreshold(MatchEntity match) {
        return match != null && match.getStatus() == MatchStatus.FINISHED
                ? FINAL_AUTO_HIDE_THRESHOLD
                : AUTO_HIDE_THRESHOLD;
    }

    public void validateDeletePermission(MatchLiveLinkEntity link, String auth0Id, Long matchId) {
        if (!isModerator() && !auth0Id.equals(link.getOwnerAuth0Id())) {
            LOGGER.warn("User tried to delete another user's live link",
                    keyValue("action", "delete_live_link_forbidden_not_owner"),
                    keyValue("matchId", matchId), keyValue("auth0Id", auth0Id));
            throw new AccessDeniedException("Seul l’utilisateur qui a publié ce lien peut le supprimer.");
        }
    }
}
