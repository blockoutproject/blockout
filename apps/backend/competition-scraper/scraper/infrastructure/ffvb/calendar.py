"""Download and parse FFVB calendar exports."""

import asyncio
import csv
import io

import httpx

from scraper.application.source import Scraper
from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.infrastructure.ffvb.models import (
    FfvbCalendarMatch,
    FfvbCalendarSnapshot,
)
from scraper.observability.logging import log_event

_CSV_DOWNLOAD_SEMAPHORE = asyncio.Semaphore(20)
_EXPECTED_COLUMNS = {
    "Match",
    "EQA_no",
    "EQB_no",
    "EQA_nom",
    "EQB_nom",
    "Date",
    "Heure",
    "Set",
    "Score",
    "Salle",
    "Arb1",
    "Arb2",
}


def validate_columns(actual_columns: set[str], expected_columns: set[str]) -> None:
    """Reject a provider export whose required schema is incomplete."""
    missing_columns = expected_columns - actual_columns
    if not missing_columns:
        return
    ordered = sorted(missing_columns)
    log_event(
        action="validate_columns",
        level="error",
        missing_columns=ordered,
        message=f"Colonnes manquantes dans le CSV: {', '.join(ordered)}",
    )
    raise ValueError(f"Colonnes manquantes dans le CSV : {', '.join(ordered)}")


def parse_csv_from_content(content: str) -> FfvbCalendarSnapshot:
    """Parse one complete FFVB export into typed rows."""
    reader = csv.DictReader(io.StringIO(content), delimiter=";")
    fieldnames = reader.fieldnames or []
    validate_columns(set(fieldnames), _EXPECTED_COLUMNS)
    league_column = fieldnames[0]
    matches: list[FfvbCalendarMatch] = []
    complete = True

    for line_number, row in enumerate(reader, start=2):
        try:
            match = FfvbCalendarMatch(
                league_code=row[league_column].strip(),
                match_code=row["Match"].strip(),
                home_club_id=row["EQA_no"].strip(),
                away_club_id=row["EQB_no"].strip(),
                home_team_name=row["EQA_nom"].strip(),
                away_team_name=row["EQB_nom"].strip(),
                match_date=row["Date"].strip(),
                match_time=row["Heure"].strip(),
                set_score=row["Set"].strip() or None,
                points_score=row["Score"].strip() or None,
                venue=row["Salle"].strip() or None,
                first_referee=row["Arb1"].strip() or None,
                second_referee=row["Arb2"].strip() or None,
            )
        except (AttributeError, KeyError, TypeError) as error:
            complete = False
            log_event(
                action="parse_csv_row",
                level="error",
                line_number=line_number,
                error=repr(error),
                message="Ligne FFVB inutilisable.",
            )
            continue
        matches.append(match)
    return FfvbCalendarSnapshot(matches=tuple(matches), complete=complete)


async def download_and_parse_csv(
    scraper: Scraper,
    pool: PoolInternalResponse,
    raw_season: str,
    retries: int = 3,
    delay: int = 5,
    timeout: int = 20,
) -> FfvbCalendarSnapshot | None:
    """Download one export, returning ``None`` only when it is unavailable."""
    download_url = "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier_export.php"
    data = {
        "cal_saison": raw_season,
        "cal_codent": pool.leagueCode,
        "cal_codpoule": pool.poolCode,
    }
    name = f"{pool.leagueCode}_{pool.poolCode}"

    async with _CSV_DOWNLOAD_SEMAPHORE:
        for attempt in range(1, retries + 1):
            try:
                response = await scraper.post_provider_form(download_url, data, timeout)
                raw_content = response.content
                snapshot = parse_csv_from_content(
                    raw_content.decode("windows-1252", errors="replace")
                )
                log_event(
                    action="download_success",
                    level="info",
                    attempt=attempt,
                    leagueCode=pool.leagueCode,
                    poolCode=pool.poolCode,
                    status=response.status_code,
                    bytes=len(raw_content),
                    content_type=response.headers.get("Content-Type"),
                    message=f"CSV téléchargé pour {name}.",
                )
                return snapshot
            except httpx.HTTPStatusError as error:
                _log_download_failure("download_http_error", pool, attempt, error)
            except httpx.ConnectError as error:
                _log_download_failure(
                    "download_client_connector_error", pool, attempt, error
                )
            except httpx.TimeoutException as error:
                _log_download_failure("download_timeout", pool, attempt, error)
            except ValueError as error:
                log_event(
                    action="download_invalid_response",
                    level="error",
                    leagueCode=pool.leagueCode,
                    poolCode=pool.poolCode,
                    error=repr(error),
                    message=f"CSV invalide pour {name}.",
                )
                return None
            except Exception as error:
                _log_download_failure("download_unexpected_error", pool, attempt, error)

            if attempt < retries:
                await asyncio.sleep(delay)

    log_event(
        action="download_failed",
        level="error",
        attempts=retries,
        leagueCode=pool.leagueCode,
        poolCode=pool.poolCode,
        message=f"Échec complet pour {name} après {retries} tentatives.",
    )
    return None


def _log_download_failure(
    action: str,
    pool: PoolInternalResponse,
    attempt: int,
    error: Exception,
) -> None:
    log_event(
        action=action,
        level="error",
        attempt=attempt,
        leagueCode=pool.leagueCode,
        poolCode=pool.poolCode,
        error=repr(error),
    )
