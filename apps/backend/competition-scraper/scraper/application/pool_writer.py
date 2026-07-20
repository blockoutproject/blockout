import aiohttp

from scraper.infrastructure.blockout.pool import PoolInternalResponse
from scraper.infrastructure.blockout.pools import create_pool, update_pool


async def add_or_update_pool(
    session: aiohttp.ClientSession,
    pool: PoolInternalResponse,
    existing_pool: PoolInternalResponse | None,
    allow_reactivation: bool = True,
) -> PoolInternalResponse:
    """Create a pool or apply the legacy owner-controlled update fields."""
    required_fields = ["poolCode", "leagueCode", "season", "rawName", "divisionId"]
    missing_fields = [
        field for field in required_fields if not getattr(pool, field, None)
    ]
    if missing_fields:
        raise ValueError(
            f"Les champs obligatoires suivants sont manquants : {', '.join(missing_fields)}."
        )

    if existing_pool:
        changes_list = []
        pool.id = existing_pool.id

        for field in ["rawName", "divisionId", "leagueName", "format", "gender"]:
            if getattr(existing_pool, field, None) != getattr(pool, field, None):
                changes_list.append(
                    f"{field}: {getattr(existing_pool, field)} -> {getattr(pool, field)}"
                )

        if not existing_pool.active and allow_reactivation:
            pool.active = True
            changes_list.append("Pool réactivée.")

        if changes_list:
            return await update_pool(session, pool, changes_list)
        return existing_pool
    return await create_pool(session, pool)
