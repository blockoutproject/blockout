from typing import Optional
import aiohttp
from config.logger_config import log_event
from models.club import Club
from api.clubs_api import create_club, update_club

async def add_or_update_club(session: aiohttp.ClientSession, club: Club, existing_club: Optional[Club]) -> Club:
    """
    Vérifie si un club existe et le met à jour ou le crée selon les besoins.
    """
    required_fields = ['id', 'rawName']
    missing_fields = [field for field in required_fields if not getattr(club, field, None)]
    if missing_fields:
        raise ValueError(f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}.")

    if existing_club:
        changes_list = []
        club.id = existing_club.id  # pour être sûr qu'on garde le même ID
        club.logoUrl = existing_club.logoUrl

        for field in ['rawName', 'name', 'address', 'city', 'postalCode', 'email', 'phoneNumber', 'website']:
            if getattr(existing_club, field, None) != getattr(club, field, None):
                changes_list.append(f"{field}: {getattr(existing_club, field)} -> {getattr(club, field)}")

        if not existing_club.active:
            club.active = True
            changes_list.append("Club réactivé.")

        if changes_list:
            new_club = await update_club(session, club)
            log_event(
                action="update_club",
                level="info",
                clubId=club.id,
                changes_list=changes_list,
                message=f"Mise à jour du club : {club.name}"
            )
            return new_club

        # Si aucune modification n'est nécessaire, on ne fait rien
        return existing_club
    else:
        new_club = await create_club(session, club)
        log_event(
            action="create_club",
            level="info",
            clubId=new_club.id,
            message=f"Création du club : {new_club.name}"
        )
        return new_club
