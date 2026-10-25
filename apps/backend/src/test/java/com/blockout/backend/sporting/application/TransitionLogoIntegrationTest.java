package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation.Edit;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingPresentation.View;
import com.blockout.backend.sporting.application.model.SportingViews.ClubView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingImageFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Rehearses manual F14 logo reassociation through real F02 owners and migrated PostgreSQL. All
 * identities, files and accounts are synthetic; no V1 source or external image host is accessed.
 */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@DisplayName("Protected transition club logos")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class TransitionLogoIntegrationTest {
  @Autowired private com.blockout.backend.access.application.CurrentPermissions permissions;
  @Autowired private SportingStore store;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private ChangeSportingPresentation presentation;
  @Autowired private ReadSportingConfiguration configurationReads;
  @Autowired private ReadSportingData reads;
  @Autowired private ReadSportingAcquisition acquisitionReads;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private AccountStore accounts;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private JdbcTemplate sql;
  @TempDir private Path preservedFiles;
  private UUID account;
  private UUID pool;
  private UUID club;
  private UUID team;

  /** Establishes synthetic rebuilt clubs through F02 and a current explicitly granted operator. */
  @BeforeEach
  void prepareOwners() {
    sql.update("DELETE FROM sporting_participation");
    sql.update("DELETE FROM sporting_match");
    sql.update("DELETE FROM sporting_team");
    sql.update("DELETE FROM sporting_pool");
    sql.update("DELETE FROM sporting_club");
    sql.update("DELETE FROM account");
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000339");
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic transition',TRUE,'#112233') ON CONFLICT DO NOTHING",
        division);
    pool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    seasons.getOrCreate(2026).id(),
                    "SYNTHETIC",
                    "COMP",
                    null,
                    null,
                    "POOL"),
                "PACK",
                "Synthetic pool",
                new SportingClassification(division, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    account =
        new TransactionTemplate(transactions)
            .execute(
                state ->
                    accounts
                        .create(
                            "https://identity.example.invalid/",
                            "auth0|transition-logo",
                            "Operator_339",
                            "operator@example.invalid",
                            null)
                        .id());
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'sporting-presentation.manage')",
        account);
    team =
        identities
            .identifyMatch(
                pool,
                "LOGOS",
                new TeamCandidate(null, "Home", "000339", "Same synthetic club name"),
                new TeamCandidate(null, "Away", "339", "Same synthetic club name"))
            .homeTeamId();
    club = acquisitionReads.team(team).orElseThrow().clubId();
  }

  @ParameterizedTest
  @ValueSource(strings = {"PNG", "JPEG"})
  @DisplayName("Reassociates original file bytes only to the exact FFVB string")
  void reassociatesExactClub(String format) throws Exception {
    // Given
    String reference = "000339";
    byte[] original = SportingImageFixture.image(format, 0x112233);
    Path preserved = Files.write(preservedFiles.resolve("original-logo"), original);
    ClubView target = store.club(CollectionProviderEnum.FFVB, reference).orElseThrow();
    UUID similar = store.club(CollectionProviderEnum.FFVB, "339").orElseThrow().id();
    View current =
        presentation.set(
            account,
            Kind.CLUB,
            target.id(),
            new Edit("0", "Current V2 club name", null, LogoActionEnum.KEEP, null));

    // When
    permissions.requireForRead(account, Permission.MANAGE_SPORTING_PRESENTATION);
    Image validated = new ValidateSportingImage().validate(Files.readAllBytes(preserved));
    View saved =
        presentation.set(
            account,
            Kind.CLUB,
            target.id(),
            new Edit(
                current.revision(),
                current.names().manualName(),
                null,
                LogoActionEnum.REPLACE,
                validated));

    // Then
    assertThat(target.id()).isEqualTo(club).isNotEqualTo(similar);
    assertThat(reads.club(club).orElseThrow().reference()).isEqualTo(reference);
    assertThat(saved.names()).isEqualTo(current.names());
    assertThat(saved.logo().manualUrl()).isEqualTo("/clubs/" + club + "/logo");
    assertThat(reads.publicLogo(Kind.CLUB, club).orElseThrow().bytes()).isEqualTo(original);
    assertThat(reads.publicLogo(Kind.CLUB, similar)).isEmpty();
    assertThat(sql.queryForObject("SELECT logo FROM sporting_club WHERE id=?", byte[].class, club))
        .isEqualTo(original);
  }

  @Test
  @DisplayName("Leaves an unmatched exact FFVB reference unresolved without creating a club")
  void leavesUnmatchedReferenceUnresolved() {
    // Given
    String reference = "0000339";

    // When
    Optional<ClubView> target = store.club(CollectionProviderEnum.FFVB, reference);

    // Then
    assertThat(target).isEmpty();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_club", Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("Refuses club creation without an application transaction before writing")
  void rejectsCreationOutsideTransaction() {
    // Given
    String reference = "0000340";

    // When
    ThrowingCallable create =
        () -> store.createClub(CollectionProviderEnum.FFVB, reference, "Synthetic club");

    // Then
    assertThatThrownBy(create).isInstanceOf(IllegalTransactionStateException.class);
    assertThat(store.club(CollectionProviderEnum.FFVB, reference)).isEmpty();
  }

  @Test
  @DisplayName("Refuses a duplicate FFVB club reference through native database uniqueness")
  void refusesDuplicateClubIdentity() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    ThrowingCallable duplicate =
        () ->
            transaction.executeWithoutResult(
                state ->
                    store.createClub(
                        CollectionProviderEnum.FFVB, "000339", "Conflicting synthetic club"));

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_club_identity");
    assertThat(store.club(CollectionProviderEnum.FFVB, "000339").orElseThrow().id())
        .isEqualTo(club);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_club", Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("Stops a missing-file attempt before any presentation mutation")
  void refusesMissingFile() {
    // Given
    Path missing = preservedFiles.resolve("missing-logo.png");
    View current = configurationReads.presentation(account, Kind.CLUB, club);

    // When
    ThrowingCallable apply =
        () -> {
          permissions.requireForRead(account, Permission.MANAGE_SPORTING_PRESENTATION);
          Image validated = new ValidateSportingImage().validate(Files.readAllBytes(missing));
          presentation.set(
              account,
              Kind.CLUB,
              club,
              new Edit(current.revision(), null, null, LogoActionEnum.REPLACE, validated));
        };

    // Then
    assertThatThrownBy(apply).isInstanceOf(NoSuchFileException.class);
    assertThat(configurationReads.presentation(account, Kind.CLUB, club)).isEqualTo(current);
    assertThat(reads.publicLogo(Kind.CLUB, club)).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "not an image", "\u0089PNG\r\n"})
  @DisplayName("Stops empty or corrupt preserved content before replacing a protected logo")
  void refusesCorruptBytes(String corrupt) throws Exception {
    // Given
    Image original =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    View current =
        presentation.set(
            account, Kind.CLUB, club, new Edit("0", null, null, LogoActionEnum.REPLACE, original));
    Path preserved =
        Files.write(
            preservedFiles.resolve("corrupt.png"), corrupt.getBytes(StandardCharsets.ISO_8859_1));

    // When
    ThrowingCallable apply =
        () -> {
          permissions.requireForRead(account, Permission.MANAGE_SPORTING_PRESENTATION);
          Image validated = new ValidateSportingImage().validate(Files.readAllBytes(preserved));
          presentation.set(
              account,
              Kind.CLUB,
              club,
              new Edit(current.revision(), null, null, LogoActionEnum.REPLACE, validated));
        };

    // Then
    assertThatThrownBy(apply).isInstanceOf(SportingValidationException.class);
    assertThat(configurationReads.presentation(account, Kind.CLUB, club)).isEqualTo(current);
    assertThat(reads.publicLogo(Kind.CLUB, club).orElseThrow().bytes()).isEqualTo(original.bytes());
  }

  @Test
  @DisplayName("Refuses reassociation after the current operator grant is withdrawn")
  void refusesRevokedGrant() throws Exception {
    // Given
    View current = configurationReads.presentation(account, Kind.CLUB, club);
    Image original =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    sql.update("DELETE FROM account_permission WHERE account_id=?", account);

    // When
    ThrowingCallable apply =
        () ->
            presentation.set(
                account,
                Kind.CLUB,
                club,
                new Edit(current.revision(), null, null, LogoActionEnum.REPLACE, original));

    // Then
    assertThatThrownBy(apply).isInstanceOf(AccessDeniedException.class);
    assertThat(reads.publicLogo(Kind.CLUB, club)).isEmpty();
  }

  @Test
  @DisplayName("Preserves a newer manual logo when an earlier revision is resubmitted")
  void refusesStaleReplacement() throws Exception {
    // Given
    View earlier = configurationReads.presentation(account, Kind.CLUB, club);
    Image newer = new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x445566));
    View current =
        presentation.set(
            account,
            Kind.CLUB,
            club,
            new Edit(earlier.revision(), null, null, LogoActionEnum.REPLACE, newer));
    Image oldCopy =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));

    // When
    ThrowingCallable apply =
        () ->
            presentation.set(
                account,
                Kind.CLUB,
                club,
                new Edit(earlier.revision(), null, null, LogoActionEnum.REPLACE, oldCopy));

    // Then
    assertThatThrownBy(apply).isInstanceOf(SportingConflictException.class);
    assertThat(configurationReads.presentation(account, Kind.CLUB, club)).isEqualTo(current);
    assertThat(reads.publicLogo(Kind.CLUB, club).orElseThrow().bytes()).isEqualTo(newer.bytes());
  }

  @Test
  @DisplayName(
      "Inherits the preserved club image across seasons without guessing a professional link")
  void inheritsOnlyEstablishedClub() throws Exception {
    // Given
    UUID season = seasons.getOrCreate(2027).id();
    PoolKey currentKey = acquisitionReads.pool(pool).orElseThrow().key();
    UUID nextPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    season,
                    currentKey.organizerReference(),
                    currentKey.competitionReference(),
                    null,
                    null,
                    "NEXT"),
                "PACK",
                "Next synthetic season",
                acquisitionReads.pool(pool).orElseThrow().classification())
            .id();
    UUID nextTeam =
        identities
            .identifyMatch(
                nextPool,
                "NEXT",
                new TeamCandidate(null, "Next home", "000339", "Same synthetic club name"),
                new TeamCandidate(null, "Next away", "339", "Same synthetic club name"))
            .homeTeamId();
    UUID professionalPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.LNV,
                    season,
                    "SYNTHETIC-LNV",
                    "COMP",
                    null,
                    null,
                    "PHASE"),
                "PACK",
                "Synthetic professional pool",
                acquisitionReads.pool(pool).orElseThrow().classification())
            .id();
    UUID professional =
        identities
            .identifyMatch(
                professionalPool,
                "PRO",
                new TeamCandidate("000339", "Home", null, null),
                new TeamCandidate("339", "Away", null, null))
            .homeTeamId();
    Image original =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));

    // When
    presentation.set(
        account, Kind.CLUB, club, new Edit("0", null, null, LogoActionEnum.REPLACE, original));

    // Then
    assertThat(reads.publicLogo(Kind.TEAM, team).orElseThrow().bytes()).isEqualTo(original.bytes());
    assertThat(acquisitionReads.team(nextTeam).orElseThrow().clubId()).isEqualTo(club);
    assertThat(reads.publicLogo(Kind.TEAM, nextTeam).orElseThrow().bytes())
        .isEqualTo(original.bytes());
    assertThat(acquisitionReads.team(professional).orElseThrow().clubId()).isNull();
    assertThat(reads.publicLogo(Kind.TEAM, professional)).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_team WHERE logo IS NOT NULL", Integer.class))
        .isZero();
  }
}
