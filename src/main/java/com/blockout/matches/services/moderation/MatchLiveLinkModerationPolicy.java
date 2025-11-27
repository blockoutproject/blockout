package com.blockout.matches.services.moderation;

import com.blockout.matches.models.dto.users.CustomUserDTO;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.MatchStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MatchLiveLinkModerationPolicy {

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkModerationPolicy.class);

    // Règles "live" (avant/pendant match)
    private static final int MIN_ACCOUNT_AGE_DAYS = 7;
    private static final int MAX_LINKS_PER_MATCH_PER_OWNER = 3;
    private static final int MAX_MATCHES_PER_DAY_PER_OWNER = 3;

    // Règles "pro" (LNV)
    private static final String PRO_LEAGUE_CODE = "AALNV";

    // Règles de reports
    private static final int AUTO_HIDE_THRESHOLD = 3;
    private static final int FINAL_AUTO_HIDE_THRESHOLD = 10;

    // Règles rediff (post-match)
    private static final int REDIFF_EDIT_WINDOW_DAYS = 7;
    private static final int MAX_REDIFF_UPDATES_PER_OWNER = 2;

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    /**
     * Vérifie l'ancienneté du compte avant d'autoriser la publication d'un live link.
     */
    public void validateUserAccountAge(CustomUserDTO currentUser, Long matchId, String auth0Id, Instant now) {
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
    }

    /**
     * Bloque les matchs pros (droits de diffusion réservés).
     */
    public void validateMatchLeague(Match match, Long matchId, String auth0Id) {
        if (PRO_LEAGUE_CODE.equalsIgnoreCase(match.getLeagueCode())) {
            logger.info("Live link refused for professional match",
                    keyValue("action", "set_live_link_rejected_pro_match"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("league_code", match.getLeagueCode()));
            throw new IllegalStateException(
                    "Les droits de diffusion des matchs professionnels sont réservés à la LNV.");
        }
    }

    /**
     * Autorise la publication au plus tôt 1h avant le début du match.
     */
    public void validatePublishWindow(Match match, Instant now, Long matchId, String auth0Id) {
        if (match.getMatchDate() == null) {
            return; // si pas de date définie, on ne bloque pas
        }

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

    /**
     * Vérifie que l'utilisateur est propriétaire du lien actif avant modif.
     */
    public void validateOwnerOfActiveLink(MatchLiveLink active, String auth0Id, Long matchId) {
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
    }

    /**
     * Applique les quotas "live" :
     * - max de versions par match
     * - max de matchs par jour.
     */
    public void validateLinkQuotas(
            Long matchId,
            String auth0Id,
            long linksForMatchAndOwner,
            long matchesToday,
            boolean alreadyHasLinkForThisMatch) {

        if (linksForMatchAndOwner >= MAX_LINKS_PER_MATCH_PER_OWNER) {
            logger.info("User reached per-match live link limit",
                    keyValue("action", "set_live_link_rejected_match_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("links_for_match", linksForMatchAndOwner));
            throw new IllegalStateException("Tu as déjà publié trop de versions de live pour ce match.");
        }

        if (!alreadyHasLinkForThisMatch && matchesToday >= MAX_MATCHES_PER_DAY_PER_OWNER) {
            logger.info("User reached per-day match limit for live links",
                    keyValue("action", "set_live_link_rejected_daily_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("matches_today", matchesToday));
            throw new IllegalStateException(
                    "Tu as déjà publié des lives pour trop de matchs aujourd’hui. Réessaie demain.");
        }
    }

    /**
     * Règles post-match : fenêtre de 7 jours + max 2 rediff par owner + owner du lien.
     */
    public void validatePostMatchRediffRules(
            Match match,
            MatchLiveLink active,
            String auth0Id,
            Long matchId,
            Instant now,
            long rediffCountForOwner
    ) {
        // Si le match est déjà "figé", on ne touche plus à la rediff
        if (match.isLiveEditLocked()) {
            logger.info("Live link refused because match is locked (post-match rediff)",
                    keyValue("action", "set_live_link_rejected_locked"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id));
            throw new IllegalStateException("Ce match est verrouillé, le lien ne peut plus être modifié.");
        }

        // Seul le diffuseur actuel peut mettre à jour la rediff existante
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

        // Fenêtre de 7 jours après la date du match
        if (match.getMatchDate() != null) {
            Instant limit = match.getMatchDate().plus(REDIFF_EDIT_WINDOW_DAYS, ChronoUnit.DAYS);
            if (now.isAfter(limit)) {
                logger.info("Rediff update refused because beyond edit window",
                        keyValue("action", "set_live_link_rejected_rediff_window"),
                        keyValue("match_id", matchId),
                        keyValue("auth0_id", auth0Id),
                        keyValue("match_date", match.getMatchDate()),
                        keyValue("now", now),
                        keyValue("limit", limit));
                throw new IllegalStateException(
                        "Tu ne peux plus modifier la rediffusion une semaine après le match.");
            }
        }

        // Max 2 rediff pour ce match et cet owner
        if (rediffCountForOwner >= MAX_REDIFF_UPDATES_PER_OWNER) {
            logger.info("Rediff update refused because user reached rediff limit",
                    keyValue("action", "set_live_link_rejected_rediff_quota"),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id),
                    keyValue("rediff_count_for_owner", rediffCountForOwner));
            throw new IllegalStateException(
                    "Tu as déjà mis à jour la rediffusion trop de fois pour ce match.");
        }
    }

    /**
     * Décide si on doit verrouiller définitivement les rediff après cette sauvegarde.
     */
    public boolean shouldLockRediffAfterSave(Match match, long rediffCountAfterSave, Instant now) {
        boolean reachedMaxRediff = rediffCountAfterSave >= MAX_REDIFF_UPDATES_PER_OWNER;

        boolean outOfWindow = false;
        if (match.getMatchDate() != null) {
            Instant limit = match.getMatchDate().plus(REDIFF_EDIT_WINDOW_DAYS, ChronoUnit.DAYS);
            outOfWindow = now.isAfter(limit);
        }

        // On fige si on a atteint le quota ou si on sort de la fenêtre
        return reachedMaxRediff || outOfWindow;
    }

    /**
     * Retourne le seuil de reports pour auto-hide (différent pour rediff finale).
     */
    public int determineAutoHideThreshold(Match match) {
        int threshold = AUTO_HIDE_THRESHOLD;
        if (match != null && match.getStatus() == MatchStatus.FINISHED && match.isLiveEditLocked()) {
            threshold = FINAL_AUTO_HIDE_THRESHOLD;
        }
        return threshold;
    }

    /**
     * Vérifie que l'utilisateur peut masquer/supprimer le lien actif.
     */
    public void validateDeletePermission(MatchLiveLink link, String auth0Id, Long matchId) {
        if (!auth0Id.equals(link.getOwnerAuth0Id())) {
            logger.warn("User tried to delete a live link he does not own",
                    keyValue("action", "delete_live_link_forbidden_not_owner"),
                    keyValue("match_id", matchId),
                    keyValue("live_link_id", link.getId()),
                    keyValue("auth0_id", auth0Id),
                    keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
            throw new AccessDeniedException("Seul l’utilisateur qui a publié ce lien peut le supprimer.");
        }
    }
}