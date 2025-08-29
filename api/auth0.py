import asyncio
from auth0.authentication import GetToken
from config.env_config import AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
from config.logger_config import log_event

MIRROR_TOKEN = None

def set_token(token: str):
    """
    Met à jour la variable globale du token.
    """
    global MIRROR_TOKEN
    MIRROR_TOKEN = token

def get_token() -> str:
    """
    Récupère la valeur du token.
    """
    global MIRROR_TOKEN
    if MIRROR_TOKEN is None:
        raise ValueError("Le token n'est pas encore défini.")
    return MIRROR_TOKEN

def _get_headers() -> dict:
    """
    Génère les headers d'authentification avec le token JWT.
    """
    token = get_token()
    return {"Authorization": f"Bearer {token}"}

async def fetch_auth0_token():
    """
    Utilise le SDK Auth0 pour récupérer un token d'accès JWT.
    """
    domain = AUTH0_DOMAIN
    client_id = AUTH0_CLIENT_ID
    client_secret = AUTH0_CLIENT_SECRET
    audience = AUTH0_AUDIENCE

    # Utilisation du SDK Auth0 pour obtenir un token
    get_token = GetToken(domain, client_id, client_secret)
    token = get_token.client_credentials(audience)
    return token['access_token']

async def refresh_token_task():
    """
    Tâche pour rafraîchir le token toutes les heures.
    """
    while True:
        try:
            token = await fetch_auth0_token()
            set_token(token)
            log_event(
                action="token_refreshed",
                level="info",
                message="Le token a été mis à jour."
            )
            await asyncio.sleep(172800)
        except Exception as e:
            log_event(
                action="refresh_token_error",
                level="error",
                error=str(e),
                message="Erreur lors de la mise à jour du token."
            )
            await asyncio.sleep(60)