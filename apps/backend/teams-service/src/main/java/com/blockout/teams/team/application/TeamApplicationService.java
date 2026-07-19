package com.blockout.teams.team.application;

import com.blockout.teams.team.application.commands.CreateTeamCommand;
import com.blockout.teams.team.application.commands.TeamImageCommand;
import com.blockout.teams.team.application.commands.UpdateTeamCommand;
import com.blockout.teams.team.application.exceptions.TeamNotFoundException;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.application.ports.TeamEventPublisher;
import com.blockout.teams.team.application.ports.TeamImageStorage;
import com.blockout.teams.team.application.views.TeamView;
import com.blockout.teams.team.infrastructure.persistence.entities.TeamEntity;
import com.blockout.teams.team.infrastructure.persistence.repositories.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for V1 teams. */
@Service
@RequiredArgsConstructor
public class TeamApplicationService implements TeamService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TeamApplicationService.class);
    private static final long MAX_IMAGE_SIZE = 5L * 1024L * 1024L;

    private final TeamRepository teamRepository;
    private final TeamEventPublisher eventPublisher;
    private final TeamImageStorage imageStorage;

    @Override
    @Transactional(readOnly = true)
    public List<TeamView> findTeams(Long divisionId, Format format, Gender gender, String season,
            String clubId, List<Long> ids, Boolean active) {
        List<Long> safeIds = ids == null ? Collections.emptyList() : ids;
        List<TeamView> teams = teamRepository.findFiltered(
                divisionId, format, gender, season, clubId, safeIds, safeIds.size(), active).stream()
                .map(this::toView)
                .toList();
        LOGGER.debug("Filtered teams", keyValue("action", "list_teams"), keyValue("count", teams.size()));
        return teams;
    }

    @Override
    @Transactional(readOnly = true)
    public TeamView getTeamById(Long id) {
        return toView(loadTeam(id));
    }

    @Override
    @Transactional
    public TeamView createTeam(CreateTeamCommand command) {
        TeamEntity team = TeamEntity.builder()
                .clubId(command.clubId())
                .rawName(command.rawName())
                .name(command.name())
                .shortName(command.shortName())
                .leagueCode(command.leagueCode())
                .divisionId(command.divisionId())
                .season(command.season())
                .format(command.format())
                .gender(command.gender())
                .followersCount(command.followersCount() == null ? 0L : command.followersCount())
                .logoUrl(command.logoUrl())
                .active(command.active() == null ? true : command.active())
                .build();
        TeamView created = toView(teamRepository.saveAndFlush(team));
        eventPublisher.publishTeamUpsert(created);
        LOGGER.info("Created team", keyValue("action", "create_team"), keyValue("teamId", created.id()));
        return created;
    }

    @Override
    @Transactional
    public TeamView updateTeam(Long id, UpdateTeamCommand command) {
        TeamEntity team = loadTeam(id);
        applyUpdates(team, command);
        updateLogo(team, command);
        TeamView updated = toView(teamRepository.saveAndFlush(team));
        eventPublisher.publishTeamUpsert(updated);
        LOGGER.info("Updated team", keyValue("action", "update_team"), keyValue("teamId", id));
        return updated;
    }

    @Override
    @Transactional
    public void deactivateTeam(Long id) {
        TeamEntity team = loadTeam(id);
        team.setActive(false);
        teamRepository.saveAndFlush(team);
        LOGGER.info("Deactivated team", keyValue("action", "deactivate_team"), keyValue("teamId", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getUniqueClubIds() {
        return teamRepository.findDistinctClubIds();
    }

    @Override
    @Transactional
    public TeamView incrementFollowersCount(Long teamId, Long userId) {
        TeamEntity team = loadTeam(teamId);
        team.setFollowersCount(team.getFollowersCount() + 1L);
        TeamView updated = toView(teamRepository.saveAndFlush(team));
        LOGGER.info("Incremented Team followers", keyValue("action", "increment_followers_count"),
                keyValue("teamId", teamId), keyValue("userId", userId));
        return updated;
    }

    @Override
    @Transactional
    public TeamView decrementFollowersCount(Long teamId, Long userId) {
        TeamEntity team = loadTeam(teamId);
        team.setFollowersCount(Math.max(0L, team.getFollowersCount() - 1L));
        TeamView updated = toView(teamRepository.saveAndFlush(team));
        LOGGER.info("Decremented Team followers", keyValue("action", "decrement_followers_count"),
                keyValue("teamId", teamId), keyValue("userId", userId));
        return updated;
    }

    @Override
    @Transactional
    public void deactivateTeamsByClubId(String clubId) {
        List<TeamEntity> teams = teamRepository.findByClubIdAndActiveTrue(clubId);
        teams.forEach(team -> team.setActive(false));
        teamRepository.saveAllAndFlush(teams);
        LOGGER.info("Deactivated teams for Club", keyValue("action", "deactivate_teams_by_club"),
                keyValue("clubId", clubId), keyValue("count", teams.size()));
    }

    private TeamEntity loadTeam(Long id) {
        return teamRepository.findById(id).orElseThrow(() -> new TeamNotFoundException(id));
    }

    private void applyUpdates(TeamEntity team, UpdateTeamCommand command) {
        if (command.clubId() != null) team.setClubId(command.clubId());
        if (command.rawName() != null) team.setRawName(command.rawName());
        if (command.name() != null) team.setName(command.name());
        if (command.shortName() != null) team.setShortName(command.shortName());
        if (command.leagueCode() != null) team.setLeagueCode(command.leagueCode());
        if (command.divisionId() != null) team.setDivisionId(command.divisionId());
        if (command.season() != null) team.setSeason(command.season());
        if (command.format() != null) team.setFormat(command.format());
        if (command.gender() != null) team.setGender(command.gender());
        if (command.active() != null) team.setActive(command.active());
    }

    private void updateLogo(TeamEntity team, UpdateTeamCommand command) {
        if (hasImage(command.image())) {
            validateImage(command.image());
            deleteLogo(team.getLogoUrl());
            team.setLogoUrl(imageStorage.uploadTeamImage(command.image()));
        } else if (command.logoUrl() == null) {
            deleteLogo(team.getLogoUrl());
            team.setLogoUrl(null);
        }
    }

    private boolean hasImage(TeamImageCommand image) {
        return image != null && !image.isEmpty();
    }

    private void validateImage(TeamImageCommand image) {
        if (!"image/png".equals(image.contentType()) && !"image/jpeg".equals(image.contentType())) {
            throw new IllegalArgumentException("Only PNG and JPEG images are allowed.");
        }
        if (image.content().length > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("The maximum image size is 5 MB.");
        }
    }

    private void deleteLogo(String logoUrl) {
        if (logoUrl != null) imageStorage.deleteTeamImage(logoUrl);
    }

    private TeamView toView(TeamEntity team) {
        return new TeamView(team.getId(), team.getClubId(), team.getRawName(), team.getName(), team.getShortName(),
                team.getLeagueCode(), team.getDivisionId(), team.getSeason(), team.getFormat(), team.getGender(),
                team.getFollowersCount(), team.getLogoUrl(), team.getActive(), team.getCreatedAt(), team.getLastUpdate());
    }
}
