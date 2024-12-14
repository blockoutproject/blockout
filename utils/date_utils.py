from datetime import datetime
from typing import Optional
from config.logger_config import logger

def parse_date(date_str: str, time_str: str) -> Optional[datetime]:
    """
    Convertit des chaînes de date et d'heure en objet datetime.

    Parameters:
    - date_str (str): La date au format 'YYYY-MM-DD'.
    - time_str (str): L'heure au format 'HH:MM'.

    Returns:
    - Optional[datetime]: L'objet datetime correspondant ou None en cas d'erreur.
    """    
    date_time = datetime.strptime(f'{date_str} {time_str}', '%Y-%m-%d %H:%M')
    return date_time

