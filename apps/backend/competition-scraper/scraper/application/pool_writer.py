from scraper.application.ports import BlockoutPort
from scraper.domain.models import Pool


async def add_or_update_pool(
    blockout: BlockoutPort,
    pool: Pool,
    existing_pool: Pool | None,
    allow_reactivation: bool = True,
) -> Pool:
    """Create a pool or apply the legacy owner-controlled update fields."""
    required_fields = ["pool_code", "league_code", "season", "raw_name", "division_id"]
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

        for field in ["raw_name", "division_id", "league_name", "format", "gender"]:
            if getattr(existing_pool, field, None) != getattr(pool, field, None):
                changes_list.append(
                    f"{field}: {getattr(existing_pool, field)} -> {getattr(pool, field)}"
                )

        if not existing_pool.active and allow_reactivation:
            pool.active = True
            changes_list.append("Pool réactivée.")

        if changes_list:
            return await blockout.update_pool(pool, changes_list)
        return existing_pool
    return await blockout.create_pool(pool)
