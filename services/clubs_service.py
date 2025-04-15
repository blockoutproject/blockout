from typing import Optional
import aiohttp
from models.club import Club
from api.clubs_api import create_club, update_club

async def add_or_update_club(session: aiohttp.ClientSession, club: Club, existing_club: Optional[Club]) -> Club:
    """
    Vérifie si un club existe et le met à jour ou le crée selon les besoins.
    """
    required_fields = ['id', 'name']
    missing_fields = [field for field in required_fields if not getattr(club, field, None)]
    if missing_fields:
        raise ValueError(f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}.")

    if existing_club:
        changes_list = []
        club.id = existing_club.id  # pour être sûr qu'on garde le même ID

        for field in ['name', 'city', 'postal_code', 'email', 'phone_number', 'website']:
            if getattr(existing_club, field, None) != getattr(club, field, None):
                changes_list.append(f"{field}: {getattr(existing_club, field)} -> {getattr(club, field)}")

        if not existing_club.active:
            club.active = True
            changes_list.append("Club réactivé.")

        if changes_list:
            return await update_club(session, club, changes_list)
        return existing_club
    else:
        new_club = await create_club(session, club)
        return new_club