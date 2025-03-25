import asyncio
from datetime import datetime, timezone
import io
import os
import shutil
import csv
from typing import Iterator
import aiohttp
import chardet
from config.logger_config import log_event
from models.pool import Pool
from models.scraper import Scraper

def delete_output_directory(folder_path: str) -> None:
    """
    Supprime un répertoire de sortie et tout son contenu.

    Parameters:
    - folder_path (str): Le chemin du répertoire à supprimer.
    """
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)
    else:
        log_event(
            action="delete_output_directory",
            level="warning",
            folder_path=folder_path,
            message=f"Tentative de suppression : le répertoire {folder_path} n'existe pas."
        )

def detect_encoding(data: bytes, default: str = 'windows-1252') -> str:
    """
    Détecte l'encodage d'un contenu binaire.

    Parameters:
    - data (bytes): Le contenu binaire à analyser.
    - default (str): Encodage par défaut si la détection échoue.

    Returns:
    - str: L'encodage détecté ou le défaut.
    """
    result = chardet.detect(data)
    encoding = result.get('encoding', default)
    return encoding

def write_to_file(filename: str, content: str, pool_code: str, encoding: str = 'windows-1252'):
    """
    Écrit un contenu texte dans un fichier avec l'encodage spécifié.

    Parameters:
    - filename (str): Le chemin du fichier.
    - content (str): Le contenu texte à écrire.
    - encoding (str): L'encodage à utiliser pour l'écriture.
    """
    try:
        with open(filename, 'w', encoding=encoding, errors='replace') as f:
            f.write(content)
    except Exception as e:
        log_event(
            action="write_to_file",
            level="error",
            filename=filename,
            encoding=encoding,
            error=str(e),
            error_type=type(e).__name__,
            message=f"Erreur lors de l'écriture dans le fichier {filename}: {e}"
        )
        raise

def validate_columns(actual_columns: set, expected_columns: set) -> None:
    """
    Valide que toutes les colonnes attendues sont présentes dans le fichier CSV.

    Parameters:
    - actual_columns (set): Colonnes trouvées dans le fichier.
    - expected_columns (set): Colonnes attendues.

    Raises:
    - ValueError: Si des colonnes manquent.
    """
    missing_columns = expected_columns - actual_columns
    if missing_columns:
        log_event(
            action="validate_columns",
            level="error",
            missing_columns=list(missing_columns),
            message=f"Colonnes manquantes dans le CSV: {', '.join(missing_columns)}"
        )
        raise ValueError(f"Colonnes manquantes dans le CSV : {', '.join(missing_columns)}")

def parse_csv_from_content(content: str) -> Iterator[dict]:
    """
    Parse le contenu CSV fourni sous forme de chaîne de caractères,
    et génère chaque ligne sous forme de dictionnaire.
    """
    expected_columns = {'Match', 'EQA_no', 'EQB_no', 'EQA_nom', 'EQB_nom',
                        'Date', 'Heure', 'Set', 'Score', 'Salle', 'Arb1', 'Arb2'}
    csv_stream = io.StringIO(content)
    reader = csv.DictReader(csv_stream, delimiter=';')
    
    # Validation des colonnes
    validate_columns(set(reader.fieldnames), expected_columns)

    for line_num, row in enumerate(reader, start=1):
        try:
            yield {
                'league_code': row[reader.fieldnames[0]].strip(),
                'match_code': row['Match'].strip(),
                'club_a_id': row['EQA_no'].strip(),
                'club_b_id': row['EQB_no'].strip(),
                'team_a_name': row['EQA_nom'].strip(),
                'team_b_name': row['EQB_nom'].strip(),
                'match_date': row['Date'].strip(),
                'match_time': row['Heure'].strip(),
                'set': row['Set'].strip() or None,
                'score': row['Score'].strip() or None,
                'venue': row['Salle'].strip() or None,
                'referee1': row['Arb1'].strip() or None,
                'referee2': row['Arb2'].strip() or None,
            }
        except KeyError as e:
            log_event(
                action="parse_csv",
                level="error",
                line_num=line_num,
                error=str(e),
                message=f"Ligne {line_num}: Colonne manquante : {e}"
            )
        except Exception as e:
            log_event(
                action="parse_csv",
                level="error",
                line_num=line_num,
                error=str(e),
                message=f"Ligne {line_num}: Erreur inattendue : {e}"
            )

def create_output_directory(league: str) -> str:
    """
    Crée un répertoire de sortie sous la structure CSV/league, 
    nommé avec la date et l'heure actuelles.

    Parameters:
    - league (str): Le nom de la ligue.

    Returns:
    - str: Le chemin du répertoire créé.
    """
    now = datetime.now(timezone.utc)
    folder_name = now.strftime(f"CSV/{league}/%Y%m%d_%H%M%S")
    os.makedirs(folder_name, exist_ok=True)
    return folder_name

async def download_and_parse_csv(
    scraper: Scraper,
    pool: Pool,
    raw_season: str,
    retries: int = 3,
    delay: int = 2,
    sem: int = 5,
    timeout: int = 20
) -> Iterator[dict]:
    """
    Télécharge le CSV et le parse en mémoire sans le sauvegarder sur disque.

    Parameters:
    - scraper (Scraper): L'instance scraper avec une session aiohttp.
    - pool (Pool): L'objet pool contenant les infos de la ligue et du pool.
    - raw_season (str): La saison.
    - retries (int): Nombre de tentatives en cas d'échec.
    - delay (int): Délai entre les tentatives.
    - sem (int): Valeur de la sémaphore pour limiter la concurrence.
    - timeout (int): Timeout pour la requête.

    Returns:
    - Iterator[dict]: Un itérateur sur les lignes du CSV parsé, ou None en cas d'échec.
    """
    download_url = "http://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier_export.php"
    data = {
        'cal_saison': raw_season,
        'cal_codent': pool.league_code,
        'cal_codpoule': pool.pool_code,
    }
    name = f"{pool.league_code}_{pool.pool_code}"
    async with asyncio.Semaphore(sem):
        for attempt in range(1, retries + 1):
            try:
                async with scraper.session.post(
                    download_url, 
                    data=data, 
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    response.raise_for_status()
                    raw_content = await response.content.read()
                    # Décodage du contenu CSV
                    content_decoded = raw_content.decode('windows-1252', errors='replace')
                    
                    if attempt > 1:
                        log_event(
                            action="download_retry_success",
                            level="info",
                            attempt=attempt,
                            message=f"Succès après retry {attempt}/{retries}: CSV téléchargé pour {name}."
                        )
                    # Retourne l'itérateur sur les données parsées en mémoire
                    return parse_csv_from_content(content_decoded)
            except aiohttp.ClientResponseError as e:
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
                    error_type=type(e).__name__,
                    error=str(e),
                    message=f"Erreur inattendue lors du téléchargement pour {name}."
                )

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