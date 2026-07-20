from club_scraper.application.ports import BlockoutPort
from club_scraper.infrastructure.blockout.contracts import ClubInternalResponse
from club_scraper.observability.logging import log_event


class ClubWriter:
    """Decide whether an observed club requires an internal owner write."""

    _compared_fields = (
        "rawName",
        "name",
        "address",
        "city",
        "postalCode",
        "email",
        "phoneNumber",
        "website",
    )

    def __init__(self, blockout: BlockoutPort) -> None:
        self._blockout = blockout

    async def save(
        self,
        club: ClubInternalResponse,
        existing: ClubInternalResponse | None,
    ) -> ClubInternalResponse:
        """Create, update, reactivate, or retain the owner resource."""
        missing = [
            field for field in ("id", "rawName") if not getattr(club, field, None)
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
        club.logoUrl = existing.logoUrl
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
