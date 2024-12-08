import asyncio
import aiohttp
from config.logger_config import log_event, logger
from utils.file_utils import decode_content, write_to_file
from utils.handlers.error_handler import handle_errors

MAX_RETRIES = 3
RETRY_DELAY = 2  # En secondes
TIMEOUT = 30  # Timeout pour les requêtes
SEM = asyncio.Semaphore(5)  # Limite des téléchargements simultanés

@handle_errors
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
        content_decoded = decode_content(raw_content)
        log_event(
            action="process_response_content",
            level="debug",
            filename=filename,
            preview_content=content_decoded[:20],
            message="Contenu décodé pour écriture dans le fichier."
        )

        # Écrire le contenu décodé dans le fichier
        write_to_file(filename, content_decoded)
        log_event(
            action="write_to_file",
            level="info",
            filename=filename,
            message="Contenu écrit dans le fichier avec succès."
        )
    except Exception as e:
        log_event(
            action="process_response_content_error",
            level="error",
            filename=filename,
            error=str(e),
            message="Erreur lors du traitement du contenu de la réponse."
        )
        raise

@handle_errors
async def download_csv(
    session: aiohttp.ClientSession,
    league_code: str,
    pool_code: str,
    raw_season: str,
    folder: str
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
        'cal_codent': league_code,
        'cal_codpoule': pool_code,
    }
    filename = f"{folder}/poule_{league_code}_{pool_code}.csv"
    name = f"{league_code}_{pool_code}"  # Identifiant unique pour les logs

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # Limiter les téléchargements simultanés avec le sémaphore
            async with SEM:
                async with session.post(download_url, data=data, timeout=TIMEOUT) as response:
                    response.raise_for_status()
                    raw_content = await response.content.read()

                    process_response_content(raw_content, filename)

                    if attempt > 1:
                        log_event(
                            action="download_retry_success",
                            level="info",
                            attempt=attempt,
                            filename=filename,
                            message=f"Succès après retry {attempt}/{MAX_RETRIES}: CSV téléchargé pour {name}."
                        )
                    return filename

        except asyncio.TimeoutError:
            log_event(
                action="download_timeout",
                level="warning",
                attempt=attempt,
                league_code=league_code,
                pool_code=pool_code,
                message=f"Timeout lors du téléchargement pour {name}."
            )
        except aiohttp.ClientError as e:
            log_event(
                action="download_client_error",
                level="warning",
                attempt=attempt,
                league_code=league_code,
                pool_code=pool_code,
                error=str(e),
                message=f"Erreur réseau lors du téléchargement pour {name}."
            )
        except Exception as e:
            log_event(
                action="download_unexpected_error",
                level="error",
                attempt=attempt,
                league_code=league_code,
                pool_code=pool_code,
                error=str(e),
                message=f"Erreur inattendue lors du téléchargement pour {name}."
            )

        # Si une tentative échoue
        if attempt < MAX_RETRIES:
            backoff = RETRY_DELAY * (2 ** (attempt - 1))
            log_event(
                action="download_retry_backoff",
                level="warning",
                backoff=backoff,
                attempt=attempt,
                message=f"Attente de {backoff} secondes avant la tentative suivante pour {name}."
            )
            await asyncio.sleep(backoff)
        else:
            log_event(
                action="download_failed",
                level="error",
                attempts=MAX_RETRIES,
                league_code=league_code,
                pool_code=pool_code,
                message=f"Échec complet pour {name} après {MAX_RETRIES} tentatives."
            )

    return None