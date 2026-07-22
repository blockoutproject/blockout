from scraper.application.models import Club
from scraper.application.ports import BlockoutPort
from scraper.observability.logging import log_event


class ClubWriter:
    """Decide whether an observed club requires an internal owner write."""

    _compared_fields = (
        "raw_name",
        "name",
        "address",
        "city",
        "postal_code",
        "email",
        "phone_number",
        "website",
    )

    def __init__(self, blockout: BlockoutPort) -> None:
        self._blockout = blockout

    async def save(
        self,
        club: Club,
        existing: Club | None,
    ) -> Club:
        """Create, update, reactivate, or retain the owner resource."""
        missing = [
            field for field in ("id", "raw_name") if not getattr(club, field, None)
        ]
        if missing:
            raise ValueError(
                f"Les champs obligatoires suivants sont manquants : {', '.join(missing)}."
            )

        if existing is None:
            created = await self._blockout.create_club(club)
            log_event(
                action="create_club",
                level="info",
                clubId=created.id,
                message=f"Création du club : {created.name}",
            )
            return created

        club.id = existing.id
        club.logo_url = existing.logo_url
        changes = [
            f"{field}: {getattr(existing, field)} -> {getattr(club, field)}"
            for field in self._compared_fields
            if getattr(existing, field, None) != getattr(club, field, None)
        ]
        if not existing.active:
            club.active = True
            changes.append("Club réactivé.")

        if not changes:
            return existing

        updated = await self._blockout.update_club(club)
        log_event(
            action="update_club",
            level="info",
            clubId=club.id,
            changes_list=changes,
            message=f"Mise à jour du club : {club.name}",
        )
        return updated
