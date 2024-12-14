from contextvars import ContextVar
import logging
import json
from config.env_config import LOG_LEVEL

# Récupérer le niveau de log depuis une variable d'environnement
log_level = getattr(logging, LOG_LEVEL, logging.INFO) 

# Configurer le logger de base
logging.basicConfig(
    level=log_level,
    format='%(message)s' 
)

logger = logging.getLogger(__name__)

current_scraper = ContextVar("current_scraper", default="unknown_scraper")

def log_event(action: str, level: str = "info", **kwargs):
    """
    Fonction générique pour générer des logs structurés.

    Parameters:
    - action (str): Type d'action ou événement (ex: "create_team", "deactivate_team", "error").
    - level (str): Niveau de log (info, warning, error).
    - kwargs: Métadonnées additionnelles pour enrichir les logs.
    """
    # Récupérer le nom du scraper actif depuis le contexte
    scraper_name = current_scraper.get()

    # Construire le log en tant qu'objet JSON
    log_message = {
        "timestamp": logging.Formatter().formatTime(logging.makeLogRecord({})),
        "action": action,
        "level": level,
        "scraper": scraper_name,  # Ajouter automatiquement le nom du scraper
        **kwargs
    }

    # Sérialiser en JSON
    log_message_json = json.dumps(log_message, ensure_ascii=False)

    # Log selon le niveau
    if level == "info":
        logger.info(log_message_json)
    elif level == "warning":
        logger.warning(log_message_json)
    elif level == "error":
        logger.error(log_message_json)
    elif level == "debug":
        logger.debug(log_message_json)