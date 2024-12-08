from functools import wraps
import inspect
import traceback
from config.logger_config import log_event


def handle_errors(func):
    """
    Décorateur pour gérer les erreurs réseau et générales, 
    compatible avec les fonctions synchrones et asynchrones.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        if inspect.iscoroutinefunction(func):
            # Fonction asynchrone
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    tb = traceback.format_exc()
                    log_event(
                        action="error",
                        level="error",
                        function=func.__name__,
                        args=args,
                        kwargs=kwargs,
                        error=str(e),
                        traceback=tb
                    )
                    raise
            return async_wrapper(*args, **kwargs)
        else:
            # Fonction synchrone
            try:
                return func(*args, **kwargs)
            except Exception as e:
                tb = traceback.format_exc()
                log_event(
                    action="error",
                    level="error",
                    function=func.__name__,
                    args=args,
                    kwargs=kwargs,
                    error=str(e),
                    traceback=tb
                )
                raise
    return wrapper