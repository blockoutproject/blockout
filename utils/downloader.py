import asyncio
import aiohttp
import chardet
from config.logger_config import logger
from utils.handlers.error_handler import handle_errors

MAX_RETRIES = 3
RETRY_DELAY = 2  # En secondes
TIMEOUT = 30  # Timeout pour les requêtes
SEM = asyncio.Semaphore(5)  # Limite des téléchargements simultanés

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
        # Ajouter le log de début de téléchargement ici
        if attempt > 1:
            logger.warning(f"Tentative {attempt}/{MAX_RETRIES} : Téléchargement démarré pour {name}")

        try:
            # Limiter les téléchargements simultanés avec le sémaphore
            async with SEM:
                async with session.post(download_url, data=data, timeout=TIMEOUT) as response:
                    if response.status == 200:
                        content = await response.read()

                        # Détecter l'encodage
                        detected = chardet.detect(content)
                        encoding = detected.get('encoding', 'utf-8')
                        content = content.decode(encoding, errors='replace')

                        # Écriture dans un fichier de manière asynchrone
                        with open(filename, 'w', encoding='utf-8', errors='replace') as f:
                            f.write(content)

                        logger.info(f"Succès : CSV téléchargé pour {name} dans {filename}")
                        return filename
                    else:
                        logger.warning(f"Tentative {attempt}/{MAX_RETRIES}: Échec pour {name}, HTTP {response.status}")

        except asyncio.TimeoutError:
            logger.error(f"Tentative {attempt}/{MAX_RETRIES}: Timeout pour {name}")
        except aiohttp.ClientError as e:
            logger.error(f"Tentative {attempt}/{MAX_RETRIES}: Erreur réseau pour {name} - {e}")
        except Exception as e:
            logger.error(f"Tentative {attempt}/{MAX_RETRIES}: Erreur inattendue pour {name} - {e}")

        # Si une tentative échoue
        if attempt < MAX_RETRIES:
            logger.warning(f"Retrying ({attempt + 1}/{MAX_RETRIES}) pour {name}")
            backoff = RETRY_DELAY * (2 ** (attempt - 1))  # Backoff exponentiel
            logger.debug(f"Attente de {backoff} secondes avant la prochaine tentative pour {name}...")
            await asyncio.sleep(backoff)
        else:
            logger.error(f"Échec complet : Impossible de télécharger {name} après {MAX_RETRIES} tentatives.")

    return None