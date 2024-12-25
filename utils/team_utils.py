import json
from typing import Optional
from config.logger_config import logger

# Chargement du fichier JSON contenant les alias
try:
    with open('config/mapping/team_aliases.json', 'r', encoding='utf-8') as f:
        team_aliases = json.load(f)
except Exception as e:
    logger.error(f"Erreur lors du chargement de 'team_aliases': {e}")
    team_aliases = {}

def get_full_team_name(name: str, gender: str) -> Optional[str]:
    """
    Récupère le nom complet de l'équipe correspondant au nom donné en tenant compte du genre.
    """    
    for team in team_aliases.get('teams', []):
        if team.get('gender') == gender:
            if name in team.get('aliases', []):
                return team['full']
    
    logger.warning(f"Aucun alias trouvé pour '{name}' avec le genre '{gender}'")
