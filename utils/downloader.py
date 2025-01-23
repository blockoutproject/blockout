import asyncio
import aiohttp
from config.logger_config import log_event
from models.pool import Pool
from models.scraper import Scraper
from utils.file_utils import write_to_file

def process_response_content(raw_content: bytes, filename: str) -> None:
    """
    Lit le contenu de la réponse HTTP, détecte l'encodage, 
    décode le contenu, et écrit dans un fichier.

    Parameters:
    - response: Réponse HTTP.
    - filename: Chemin du fichier où écrire.
    """
    try:
        # Décoder le contenu
        content_decoded = raw_content.decode('windows-1252', errors='replace')

        # Écrire le contenu décodé dans le fichier
        write_to_file(filename, content_decoded)
    except Exception as e:
        log_event(
            action="process_response_content_error",
            level="error",
            filename=filename,
            error=str(e),
            message="Erreur lors du traitement du contenu de la réponse."
        )
        raise

async def download_csv(
    scraper: Scraper,
    pool: Pool,
    raw_season: str,
    retries: int = 3, 
    delay: int = 2, 
    sem: int = 5,
    timeout: int = 20
) -> str:
    """
    Télécharge un fichier CSV contenant les données spécifiques d'une pool.

    Parameters:
    - session (aiohttp.ClientSession): La session aiohttp active.
    - league_code (str): Le code de la ligue.
    - pool_code (str): Le code de la pool.
    - raw_season (str): La saison.
    - folder (str): Le dossier où le fichier CSV sera sauvegardé.

    Returns:
    - str: Le chemin du fichier CSV téléchargé, ou None en cas d'échec.
    """
    download_url = "http://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier_export.php"
    data = {
        'cal_saison': raw_season,
        'cal_codent': pool.league_code,
        'cal_codpoule': pool.pool_code,
    }
    filename = f"{scraper.folder}/poule_{pool.league_code}_{pool.pool_code}.csv"
    name = f"{pool.league_code}_{pool.pool_code}"  # Identifiant unique pour les logs
    
    async with asyncio.Semaphore(sem):
        for attempt in range(1, retries + 1):
            try:
                async with scraper.session.post(download_url, data=data, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                    response.raise_for_status()
                    raw_content = await response.content.read()
                    process_response_content(raw_content, filename)

                    if attempt > 1:
                        log_event(
                            action="download_retry_success",
                            level="info",
                            attempt=attempt,
                            filename=filename,
                            message=f"Succès après retry {attempt}/{retries}: CSV téléchargé pour {name}."
                        )
                    return filename

            except aiohttp.ClientResponseError as e:
                # Gestion des erreurs HTTP (codes 4xx, 5xx)
                log_event(
                    action="download_http_error",
                    level="warning",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    status=e.status,
                    error=str(e),
                    message=f"Erreur HTTP {e.status} lors du téléchargement pour {name}."
                )

            except aiohttp.ClientConnectorDNSError as e:
                # Erreur DNS spécifique
                log_event(
                    action="download_dns_error",
                    level="error",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error=str(e),
                    message=f"Erreur DNS lors de la résolution du domaine pour {name}."
                )

            except aiohttp.ClientConnectorError as e:
                log_event(
                    action="download_client_connector_error",
                    level="error",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error=str(e),
                    message=f"Erreur réseau/DNS générale lors du téléchargement pour {name}."
                )
                
            except asyncio.TimeoutError:
                log_event(
                    action="download_timeout",
                    level="warning",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    message=f"Timeout lors du téléchargement pour {name}."
                )
            except Exception as e:
                log_event(
                    action="download_unexpected_error",
                    level="error",
                    attempt=attempt,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    error=str(e),
                    message=f"Erreur inattendue lors du téléchargement pour {name}."
                )

            # Si une tentative échoue
            if attempt < retries:
                log_event(
                    action="download_retry",
                    level="warning",
                    delay=delay,
                    attempt=attempt,
                    message=f"Nouvelle tentative de téléchargement pour '{name}' après un délai de {delay} secondes."
                )
                await asyncio.sleep(delay)
            else:
                log_event(
                    action="download_failed",
                    level="error",
                    attempts=retries,
                    league_code=pool.league_code,
                    pool_code=pool.pool_code,
                    message=f"Échec complet pour {name} après {retries} tentatives."
                )

    return None