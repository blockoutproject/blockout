from functools import wraps
import aiohttp
import inspect
import traceback
from config.logger_config import logger

def handle_errors(func):
    """
    Décorateur pour gérer les erreurs réseau et générales, 
    compatible avec les fonctions synchrones et asynchrones.
    Log l'erreur avec la ligne où elle s'est produite.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        if inspect.iscoroutinefunction(func):
            # Fonction asynchrone
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except aiohttp.ClientError as e:
                    tb = traceback.format_exc()
                    logger.error(f"[{func.__name__}] Erreur réseau ou de connexion: {str(e)}\n{tb}")
                    raise
                except ValueError as ve:
                    tb = traceback.format_exc()
                    logger.error(f"[{func.__name__}] Validation échouée : {ve}\n{tb}")
                    raise
                except Exception as e:
                    tb = traceback.format_exc()
                    logger.error(f"[{func.__name__}] Erreur inattendue: {str(e)}\n{tb}")
                    raise
            return async_wrapper(*args, **kwargs)
        else:
            # Fonction synchrone
            try:
                return func(*args, **kwargs)
            except ValueError as ve:
                tb = traceback.format_exc()
                logger.error(f"[{func.__name__}] Validation échouée : {ve}\n{tb}")
                raise
            except Exception as e:
                tb = traceback.format_exc()
                logger.error(f"[{func.__name__}] Erreur inattendue: {str(e)}\n{tb}")
                raise
    return wrapper