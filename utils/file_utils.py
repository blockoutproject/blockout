from datetime import datetime, timezone
import os
import shutil
import csv
from typing import Iterator
from config.logger_config import logger

def delete_output_directory(folder_path: str) -> None:
    """
    Supprime un répertoire de sortie et tout son contenu.

    Parameters:
    - folder_path (str): Le chemin du répertoire à supprimer.
    """
    
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)
        logger.debug(f"Répertoire supprimé: {folder_path}")
    else:
        logger.warning(f"Tentative de suppression : le répertoire {folder_path} n'existe pas.")

import chardet

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

def decode_content(content: bytes, encoding: str = 'windows-1252') -> str:
    """
    Décode un contenu binaire en texte.

    Parameters:
    - content (bytes): Le contenu binaire.
    - encoding (str): L'encodage à utiliser.

    Returns:
    - str: Le contenu décodé.
    """
    try:
        content_decoded = content.decode(encoding, errors='replace')
        return content_decoded
    except Exception as e:
        logger.error(f"Erreur lors du décodage avec l'encodage {encoding} : {e}")
        raise

def write_to_file(filename: str, content: str, encoding: str = 'windows-1252'):
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
        logger.debug(f"Fichier écrit avec succès : {filename}")
    except Exception as e:
        logger.error(f"Erreur lors de l'écriture dans le fichier {filename} : {e}")
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
        raise ValueError(f"Colonnes manquantes dans le CSV : {', '.join(missing_columns)}")
    logger.debug("Validation des colonnes réussie.")
    
def detect_file_encoding(file_path: str, default: str = 'windows-1252') -> str:
    """
    Détecte l'encodage d'un fichier.

    Parameters:
    - file_path (str): Chemin du fichier à analyser.
    - default (str): Encodage par défaut si la détection échoue.

    Returns:
    - str: L'encodage détecté ou le défaut.
    """
    with open(file_path, 'rb') as f:
        raw_data = f.read(1024)  # Analyse des premiers 1024 octets
        result = chardet.detect(raw_data)
        encoding = result.get('encoding', default)
        return encoding

def parse_csv(file_path: str) -> Iterator[dict]:
    """
    Parse un fichier CSV et génère chaque ligne sous forme de dictionnaire.

    Parameters:
    - file_path (str): Le chemin du fichier CSV.

    Yields:
    - dict: Un dictionnaire représentant une ligne du CSV.
    """
    # Colonnes attendues
    expected_columns = {'Match', 'EQA_no', 'EQB_no', 'EQA_nom', 'EQB_nom',
                        'Date', 'Heure', 'Set', 'Score', 'Salle', 'Arb1', 'Arb2'}

    # Détection de l'encodage
    encoding = detect_file_encoding(file_path)

    # Lecture du fichier CSV
    with open(file_path, encoding=encoding) as file:
        reader = csv.DictReader(file, delimiter=';')

        # Validation des colonnes
        validate_columns(set(reader.fieldnames), expected_columns)

        # Lecture des lignes
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
                logger.error(f"Ligne {line_num} : Colonne manquante : {e}")
            except Exception as e:
                logger.error(f"Ligne {line_num} : Erreur inattendue : {e}")
            
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
    logger.debug(f"Répertoire de sortie créé: {folder_name}")
    return folder_name


