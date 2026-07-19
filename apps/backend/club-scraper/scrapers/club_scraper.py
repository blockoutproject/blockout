import asyncio
import re
from typing import Optional
import aiohttp
from bs4 import BeautifulSoup
from api.competitions_api import bulk_deactivate_clubs
from config.logger_config import log_event
from models.scraper import Scraper
from models.club import Club
from services.clubs_service import add_or_update_club
from utils.utils import capitalize_words

class ClubScraper(Scraper):
    def __init__(self, session: aiohttp.ClientSession):
        super().__init__(
            session=session,
            name="club_scraper",
        )
        # Compteur de succès de requêtes vers l'adressier (HTML non vide récupéré)
        self.scrape_success: int = 0

    async def run_scraping(self, club_id_list: list[str]):
        """
        Logique principale du scraping des clubs.
        On itère sur la liste d'IDs, on fetch la page correspondante,
        puis on parse et on sauvegarde en base.
        """
        try:
            tasks = []
            for clubId in club_id_list:
                url = "https://www.ffvbbeach.org/ffvbapp/adressier/rech_aff_club.php"
                tasks.append(self.scrape_one_club(url, clubId))

            await asyncio.gather(*tasks)

            # Ne désactiver que si on a AU MOINS un succès de requête vers l'adressier
            if self.scrape_success > 0:
                # Désactivation des clubs non scrapés
                missing_clubs_ids = {
                    updated.id for (_, updated) in self._clubs_cache.values()
                    if updated.id not in self.scraped_club_ids
                }
                if missing_clubs_ids:
                    log_event(
                        action="bulk_deactivate_clubs",
                        level="info",
                        missing_pool_ids=missing_clubs_ids,
                        message="Désactivation en masse des clubs non scrapés (au moins une requête réussie)."
                    )
                    await bulk_deactivate_clubs(self.session, missing_clubs_ids)
            else:
                # Aucune requête réussie -> on NE désactive PAS
                log_event(
                    action="skip_bulk_deactivate_no_contact",
                    level="warning",
                    message=(
                        "Aucune page de l'adressier n'a pu être récupérée (HTML vide/erreur réseau). "
                        "On saute la désactivation pour éviter un faux positif (IP bloquée, site indisponible, etc.)."
                    )
                )

        except Exception as e:
            log_event(
                action="club_scraper_critical_error",
                level="error",
                error=str(e),
                message="Erreur critique lors du scraping des clubs."
            )

    async def scrape_one_club(self, url: str, clubId: str):
        """Scrape et enregistre un club unique."""
        try:
            form_data = {
                "id_club": clubId,
            }
            html_content = await self.fetch(url, form_data)

            if not html_content:
                log_event(
                    action="club_scraper_fetch_html_error",
                    level="error",
                    url=url,
                    message=f"{url} - Contenu HTML vide ou inexistant."
                )
                return

            # À partir d'ici, on considère qu'on a bien contacté l'adressier au moins une fois
            self.scrape_success += 1


            # On parse le HTML
            club = self.parse_club_page(html_content, clubId)
            if club is None:
                return

            club_key = club.id
            existing_obj, updated_obj = self._clubs_cache.get(club_key, (None, club))

            # Si le club existe déjà en cache (donc cloné via replace), on met à jour le clone
            if existing_obj:
                for field in ['name', 'city', 'postalCode', 'email', 'phoneNumber', 'website', 'address']:
                    setattr(updated_obj, field, getattr(club, field, None))

            new_club = await add_or_update_club(self.session, updated_obj, existing_obj)
            self.scraped_club_ids.add(new_club.id)

        except Exception as e:
            log_event(
                action="club_scraper_error",
                level="error",
                url=url,
                error=str(e),
                message=f"{url} - Erreur lors du scraping d'un club."
            )

    def parse_club_page(self, html_content: str, clubId: str) -> Optional[Club]:
        try:
            soup = BeautifulSoup(html_content, 'html.parser')

            # 1) Nom du club
            name_tag = soup.find('td', class_='titreblanc_gd')
            raw_club_name = None
            if name_tag:
                raw_club_name = name_tag.get_text(strip=True).split(maxsplit=1)[-1]

            # 2) Téléphone portable
            phoneNumber = None
            portable_label = soup.find(text=re.compile(r"(Portable|T[ée]l\.?)", re.IGNORECASE))
            if portable_label:
                parent_td = portable_label.find_parent("td")
                if parent_td:
                    next_td = parent_td.find_next("td")
                    if next_td:
                        phoneNumber = next_td.get_text(strip=True)

            # 3) Email
            email = None
            mail_link = soup.find('a', href=lambda h: h and h.startswith('mailto:'))
            if mail_link:
                email = mail_link.get_text(strip=True)

            # 4) Website
            website = None
            site_img = soup.find('img', {'title': 'Site Web'})
            if site_img:
                parent_td = site_img.find_parent('td')
                if parent_td:
                    next_td = parent_td.find_next('td')
                    if next_td:
                        link_tag = next_td.find('a', href=True)
                        if link_tag:
                            website = link_tag.get_text(strip=True).rstrip('/')

            # 5) Adresse (code postal + ville)
            postalCode, city = None, None

            address_td = soup.find(
                "td",
                class_="lienquestion",
                string=re.compile(r"^\d{5}\s+[A-Za-zÀ-ÖØ-öø-ÿ].*", re.IGNORECASE)
            )

            if address_td:
                address_line = address_td.get_text(strip=True)
                parts = address_line.split(maxsplit=1)
                if len(parts) == 2:
                    postalCode, city = parts
            else:
                all_tds = soup.find_all("td", class_="lienquestion")
                pattern_fallback = re.compile(r"(?P<cp>\d{5})(?:\s+\d{5})?\s*-\s*(?P<ville>.+)", re.IGNORECASE)

                for td in all_tds:
                    text = td.get_text(strip=True)
                    match = pattern_fallback.match(text)
                    if match:
                        postalCode = match.group("cp")
                        city = match.group("ville").strip()
                        break

            # 6) Adresse brute (sans toucher city/postal)
            address = None
            address_lines = []

            siege_header = soup.find("td", string=re.compile("Siège Social", re.IGNORECASE))
            if siege_header:
                siege_table = siege_header.find_parent("table")
                if siege_table:
                    tds = siege_table.find_all("td", class_="lienquestion")
                    for td in tds:
                        text = td.get_text(strip=True)

                        # stop dès qu'on atteint la ligne CP + ville
                        if re.match(r"^\d{5}\s+", text):
                            break

                        address_lines.append(text)

            if address_lines:
                raw_address = ", ".join(address_lines)

                # ✅ NOUVEAU: si on a 3+ "parties" (séparées par virgule), on garde les 2 dernières
                parts = [p.strip() for p in raw_address.split(",") if p.strip()]
                if len(parts) >= 3:
                    raw_address = ", ".join(parts[-2:])

                address = raw_address

            # 7) Construire l’objet Club
            return Club(
                id=clubId,
                rawName=raw_club_name,
                name=raw_club_name,
                address=address,
                phoneNumber=phoneNumber,
                email=email,
                website=website,
                city=capitalize_words(city),
                postalCode=postalCode
            )

        except Exception as e:
            log_event(
                action="club_scraper_parse_error",
                level="error",
                clubId=clubId,
                error=str(e),
                message=f"Erreur lors du parsing HTML du club {clubId}."
            )
            return None