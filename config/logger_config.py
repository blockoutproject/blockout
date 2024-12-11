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

def log_event(action: str, level: str = "info", **kwargs):
    """
    Fonction générique pour générer des logs structurés.

    Parameters:
    - action (str): Type d'action ou événement (ex: "create_team", "deactivate_team", "error").
    - level (str): Niveau de log (info, warning, error).
    - kwargs: Métadonnées additionnelles pour enrichir les logs.
    """
    # Construire le log en tant qu'objet JSON
    log_message = {
        "action": action,
        "level": level,
        "timestamp": logging.Formatter().formatTime(logging.makeLogRecord({})),
        **kwargs
    }

    # Sérialiser en JSON
    log_message_json = json.dumps(log_message)

    # Log selon le niveau
    if level == "info":
        logger.info(log_message_json)
    elif level == "warning":
        logger.warning(log_message_json)
    elif level == "error":
        logger.error(log_message_json)
    elif level == "debug":
        logger.debug(log_message_json)