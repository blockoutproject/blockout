import asyncio
import csv
import io
from typing import Iterator, Optional

import aiohttp

from config.logger_config import log_event
from models.pool import Pool
from models.scraper import Scraper

_CSV_DOWNLOAD_SEMAPHORE = asyncio.Semaphore(20)


def validate_columns(actual_columns: set, expected_columns: set) -> None:
    missing_columns = expected_columns - actual_columns
    if missing_columns:
        log_event(
            action="validate_columns",
            level="error",
            missing_columns=list(missing_columns),
            message=f"Colonnes manquantes dans le CSV: {', '.join(missing_columns)}",
        )
        raise ValueError(f"Colonnes manquantes dans le CSV : {', '.join(missing_columns)}")


def parse_csv_from_content(content: str) -> Iterator[dict]:
    expected_columns = {
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
    csv_stream = io.StringIO(content)
    reader = csv.DictReader(csv_stream, delimiter=";")
    validate_columns(set(reader.fieldnames or []), expected_columns)

    for line_num, row in enumerate(reader, start=1):
        try:
            yield {
                "league_code": row[(reader.fieldnames or [""])[0]].strip(),
                "match_code": row["Match"].strip(),
                "club_a_id": row["EQA_no"].strip(),
                "club_b_id": row["EQB_no"].strip(),
                "team_a_name": row["EQA_nom"].strip(),
                "team_b_name": row["EQB_nom"].strip(),
                "match_date": row["Date"].strip(),
                "match_time": row["Heure"].strip(),
                "set": row["Set"].strip() or None,
                "score": row["Score"].strip() or None,
                "venue": row["Salle"].strip() or None,
                "first_referee": row["Arb1"].strip() or None,
                "second_referee": row["Arb2"].strip() or None,
            }
        except KeyError as e:
            log_event(
                action="parse_csv",
                level="error",
                line_num=line_num,
                error=str(e),
                message=f"Ligne {line_num}: Colonne manquante : {e}",
            )
        except Exception as e:
            log_event(
                action="parse_csv",
                level="error",
                line_num=line_num,
                error=repr(e),
                message=f"Ligne {line_num}: Erreur inattendue : {e}",
            )


async def download_and_parse_csv(
    scraper: Scraper,
    pool: Pool,
    raw_season: str,
    retries: int = 3,
    delay: int = 5,
    timeout: int = 20,
) -> Optional[Iterator[dict]]:
    download_url = "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier_export.php"
    data = {
        "cal_saison": raw_season,
        "cal_codent": pool.league_code,
        "cal_codpoule": pool.pool_code,
    }
    name = f"{pool.league_code}_{pool.pool_code}"

    async with _CSV_DOWNLOAD_SEMAPHORE:
        for attempt in range(1, retries + 1):
            try:
                async with scraper.session.post(
                    download_url,
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=timeout),
                    ssl=False,
                ) as response:
                    response.raise_for_status()

                    raw_content = await response.content.read()
                    content_decoded = raw_content.decode("windows-1252", errors="replace")

                    log_event(
                        action="download_success",
                        level="info",
                        attempt=attempt,
                        league_code=pool.league_code,
                        pool_code=pool.pool_code,
                        status=response.status,
                        bytes=len(raw_content),
                        content_type=response.headers.get("Content-Type"),
                        message=f"CSV téléchargé pour {name}.",
                    )

                    if attempt > 1:
                        log_event(
                            action="download_retry_success",
                            level="debug",
                            attempt=attempt,
                            league_code=pool.league_code,
                            pool_code=pool.pool_code,
                            message=f"Succès après retry {attempt}/{retries}: CSV téléchargé pour {name}.",
                        )

                    return parse_csv_from_content(content_decoded)

            except aiohttp.ClientResponseError as e:
                log_event(
                    action="download_http_error",
                    level="debug",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    status=e.status,
                    error=repr(e),
                    message=f"Erreur HTTP {e.status} lors du téléchargement pour {name}.",
                )
            except aiohttp.ClientConnectorDNSError as e:
                log_event(
                    action="download_dns_error",
                    level="error",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error=repr(e),
                    message=f"Erreur DNS lors de la résolution du domaine pour {name}.",
                )
            except aiohttp.ClientConnectorError as e:
                log_event(
                    action="download_client_connector_error",
                    level="error",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error=repr(e),
                    message=f"Erreur réseau/DNS générale lors du téléchargement pour {name}.",
                )
            except asyncio.TimeoutError as e:
                log_event(
                    action="download_timeout",
                    level="debug",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error=repr(e),
                    message=f"Timeout lors du téléchargement pour {name}.",
                )
            except Exception as e:
                log_event(
                    action="download_unexpected_error",
                    level="error",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error_type=type(e).__name__,
                    error=repr(e),
                    message=f"Erreur inattendue lors du téléchargement pour {name}.",
                )

            if attempt < retries:
                log_event(
                    action="download_retry",
                    level="debug",
                    delay=delay,
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    message=f"Nouvelle tentative de téléchargement pour '{name}' après un délai de {delay} secondes.",
                )
                await asyncio.sleep(delay)
            else:
                log_event(
                    action="download_failed",
                    level="error",
                    attempts=retries,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    message=f"Échec complet pour {name} après {retries} tentatives.",
                )

    return None