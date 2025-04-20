from typing import Optional
import aiohttp
from api.pools_api import create_pool, update_pool
from models.pool import Pool

async def add_or_update_pool(
    session: aiohttp.ClientSession, 
    pool: Pool, 
    existing_pool: Optional[Pool],
    allow_reactivation: bool = True
) -> Pool:
    """
    Vérifie si une pool existe et la met à jour ou la crée selon les besoins.
    """
    required_fields = ['pool_code', 'league_code', 'season', 'pool_name', 'division_code', 'division_name']
    missing_fields = [field for field in required_fields if not getattr(pool, field, None)]
    if missing_fields:
        raise ValueError(f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}.")

    if existing_pool:
        changes_list = []
        pool.id = existing_pool.id

        for field in ['pool_name', 'division_code', 'division_name', 'format', 'gender']:
            if getattr(existing_pool, field, None) != getattr(pool, field, None):
                changes_list.append(f"{field}: {getattr(existing_pool, field)} -> {getattr(pool, field)}")

        if not existing_pool.active and allow_reactivation:
            # Si la pool est inactive et qu'on permet la réactivation
            pool.active = True
            changes_list.append("Pool réactivée.")

        if changes_list:
            return await update_pool(session, pool, changes_list)
        return existing_pool
    else:
        new_pool = await create_pool(session, pool)
        return new_pool