import asyncio
import aiohttp
import chardet
from config.logger_config import logger
from utils.file_utils import decode_content, detect_encoding, write_to_file
from utils.handlers.error_handler import handle_errors

MAX_RETRIES = 3
RETRY_DELAY = 2  # En secondes
TIMEOUT = 30  # Timeout pour les requêtes
SEM = asyncio.Semaphore(5)  # Limite des téléchargements simultanés

@handle_errors
async def process_response_content(response: aiohttp.ClientResponse, filename: str) -> None:
    """
    Lit le contenu de la réponse HTTP, détecte l'encodage, 
    décode le contenu, et écrit dans un fichier.

    Parameters:
    - response: Réponse HTTP.
    - filename: Chemin du fichier où écrire.
    """
    try:
        # Lire le contenu brut
        content = await response.content.read()

        # Détecter l'encodage
        encoding = detect_encoding(content)

        # Décoder le contenu
        content_decoded = decode_content(content)
        logger.debug(f"Premier aperçu du contenu décodé : {content_decoded[:20]}")

        # Écrire le contenu décodé dans le fichier
        write_to_file(filename, content_decoded)
    except Exception as e:
        logger.error(f"Erreur lors du traitement du contenu de la réponse : {e}")
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
                    if response.status == 200:
                        
                        await process_response_content(response, filename)

                        if attempt > 1:
                            logger.info(f"Succès après retry {attempt}/{MAX_RETRIES} : CSV téléchargé pour {name} dans {filename}")
                        return filename
                    else:
                        if attempt > 1:
                            logger.warning(f"Retry {attempt}/{MAX_RETRIES}: Échec pour {name}, HTTP {response.status}")

        except asyncio.TimeoutError:
            logger.warning(f"Retry {attempt}/{MAX_RETRIES}: Timeout pour {name}")
        except aiohttp.ClientError as e:
            logger.warning(f"Retry {attempt}/{MAX_RETRIES}: Erreur réseau pour {name} - {e}")
        except Exception as e:
            logger.warning(f"Retry {attempt}/{MAX_RETRIES}: Erreur inattendue pour {name} - {e}")

        # Si une tentative échoue
        if attempt < MAX_RETRIES:
            backoff = RETRY_DELAY * (2 ** (attempt - 1))
            logger.warning(f"Attente de {backoff} secondes avant la tentative suivante pour {name}...")
            await asyncio.sleep(RETRY_DELAY * (2 ** (attempt - 1)))
        else:
            logger.error(f"Retry {attempt}/{MAX_RETRIES}: Échec complet pour {name} après {MAX_RETRIES} tentatives.")

    return None