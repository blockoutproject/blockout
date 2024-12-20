import asyncio
from auth0.authentication import GetToken
from config.env_config import AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET

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

def _get_auth_headers() -> dict:
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
    get_token = GetToken(domain, client_id, client_secret=client_secret)
    token = get_token.client_credentials(audience)
    return token['access_token']

async def refresh_token_task():
    """
    Tâche pour rafraîchir le token toutes les heures.
    """
    while True:
        try:
            token = await fetch_auth0_token()
            set_token(token)  # Mettre à jour le token via le setter
            print("Token JWT rafraîchi et stocké globalement.")
            await asyncio.sleep(3600)  # Rafraîchir toutes les heures
        except Exception as e:
            print(f"Erreur lors du rafraîchissement du token : {e}")
            await asyncio.sleep(60)