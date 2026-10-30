package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.application.ContributionStore.VersionPage;
import com.blockout.backend.contributions.application.ModerationStore;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;

/** Native moderation slices and SQL counts; callers own short repeatable-read snapshots. */
@Repository
@RequiredArgsConstructor
public class JpaContributionReadAdapter implements ModerationStore {
  private final ContributionModerationRepository reads;
  private final ContributionReportRepository reports;
  private final ContributionPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Set<UUID> seasonIds() {
    return reads.seasonIds();
  }

  /** {@inheritDoc} */
  @Override
  public QueuePage queue(UUID season, String query, String platform, String state, int page) {
    String pattern =
        "%" + query.strip().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    Slice<UUID> found = reads.queue(season, pattern, platform, state, PageRequest.of(page, 20));
    return new QueuePage(found.getContent(), found.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, Activity> activities(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return reads.activities(ids).stream()
        .collect(
            Collectors.toUnmodifiableMap(
                ContributionModerationRepository.ActivityRow::getMatchId,
                row ->
                    new Activity(
                        row.getMatchId(),
                        new Counts(
                            row.getActive(),
                            row.getPending(),
                            row.getHidden(),
                            row.getReports(),
                            row.getRejected()),
                        row.getHold(),
                        row.getLastActivityAt())));
  }

  /** {@inheritDoc} */
  @Override
  public VersionPage versions(UUID matchId, String state, int page) {
    Slice<ContributionVersionEntity> found =
        reads.versions(matchId, state, PageRequest.of(page, 20));
    return new VersionPage(
        found.getContent().stream().map(mapper::toDomain).toList(), found.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, Long> reportCounts(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return reads.reportCounts(ids).stream()
        .collect(
            Collectors.toUnmodifiableMap(
                ContributionModerationRepository.ReportCount::getId,
                ContributionModerationRepository.ReportCount::getCount));
  }

  /** {@inheritDoc} */
  @Override
  public ReportPage reports(UUID versionId, int page) {
    Slice<Report> found = reads.reports(versionId, PageRequest.of(page, 20));
    return new ReportPage(reports.countByVersionId(versionId), found.getContent(), found.hasNext());
  }
}
