import logging
from config.env_config import LOG_LEVEL

# Récupérer le niveau de log depuis une variable d'environnement
log_level = getattr(logging, LOG_LEVEL, logging.INFO)  # Convertir en niveau numérique

# Configurer le logger de base
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(levelname)s - %(message)s'
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
    log_message = {
        "action": action,
        **kwargs
    }
    if level == "info":
        logger.info(log_message)
    elif level == "warning":
        logger.warning(log_message)
    elif level == "error":
        logger.error(log_message)
    elif level == "debug":
        logger.debug(log_message)