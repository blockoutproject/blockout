import asyncio
import re
import aiohttp
from bs4 import BeautifulSoup
from api.competitions_api import bulk_deactivate_clubs
from config.logger_config import log_event
from models.scraper import Scraper
from models.club import Club
from services.clubs_service import add_or_update_club

class ClubScraper(Scraper):
    def __init__(self, session: aiohttp.ClientSession):
        super().__init__(
            session=session,
            name="club_scraper",
        )

    async def run_scraping(self, club_id_list: list[str]):
        """
        Logique principale du scraping des clubs.
        On itère sur la liste d'IDs, on fetch la page correspondante,
        puis on parse et on sauvegarde en base.
        """
        try:
            tasks = []
            for club_id in club_id_list:
                url = f"https://www.ffvbbeach.org/ffvbapp/adressier/rech_aff.php?id_club={club_id}"
                tasks.append(self.scrape_one_club(url, club_id))

            await asyncio.gather(*tasks)
            
            # Désactivation des clubs non scrapées
            missing_clubs_ids = {
                updated.id for (_, updated) in self._clubs_cache.values()
                if updated.id not in self.scraped_club_ids
            }
            if missing_clubs_ids:
                await bulk_deactivate_clubs(self.session, missing_clubs_ids)

        except Exception as e:
            log_event(
                action="club_scraper_critical_error",
                level="error",
                error=str(e),
                message="[club_scraper + run_scraping] - Erreur critique lors du scraping des clubs."
            )

    async def scrape_one_club(self, url: str, club_id: str):
        """Scrape et enregistre un club unique."""
        try:
            html_content = await self.fetch(url)
            if not html_content:
                log_event(
                    action="club_scraper_fetch_html_error",
                    level="error",
                    url=url,
                    message=f"[club_scraper + {url}] - Contenu HTML vide ou inexistant."
                )
                return
            
            # On parse le HTML
            club = self.parse_club_page(html_content, club_id)
            club_key = (club.id)
            existing_obj, updated_obj = self._clubs_cache.get(club_key, (None, club))
        
            new_club = await add_or_update_club(self.session, club, existing_obj)
            
            self.scraped_club_ids.add(new_club.id)
        except Exception as e:
            log_event(
                action="club_scraper_error",
                level="error",
                url=url,
                error=str(e),
                message=f"[club_scraper + {url}] - Erreur lors du scraping d'un club."
            )
            
    def parse_club_page(self, html_content: str, club_id: str) -> Club:
        try:
            soup = BeautifulSoup(html_content, 'html.parser')

            # 1) Nom du club
            name_tag = soup.find('td', class_='titreblanc_gd')
            club_name = None
            if name_tag:
                club_name = name_tag.get_text(strip=True).split(maxsplit=1)[-1]

            # 2) Téléphone portable
            phone_number = None
            portable_label = soup.find(text=re.compile(r"Portable", re.IGNORECASE))
            if portable_label:
                parent_td = portable_label.find_parent("td")
                if parent_td:
                    next_td = parent_td.find_next("td")
                    if next_td:
                        phone_number = next_td.get_text(strip=True)

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
            postal_code, city = None, None

            # Tentative 1 : format classique "XXXXX VILLE"
            address_td = soup.find(
                "td",
                class_="lienquestion",
                string=re.compile(r"^\d{5}\s+[A-Za-zÀ-ÖØ-öø-ÿ].*", re.IGNORECASE)
            )

            if address_td:
                address_line = address_td.get_text(strip=True)
                parts = address_line.split(maxsplit=1)
                if len(parts) == 2:
                    postal_code, city = parts
            else:
                # Tentative 2 : format doublon + tiret "XXXXX XXXXX - VILLE"
                all_tds = soup.find_all("td", class_="lienquestion")
                pattern_fallback = re.compile(r"(?P<cp>\d{5})(?:\s+\d{5})?\s*-\s*(?P<ville>.+)", re.IGNORECASE)

                for td in all_tds:
                    text = td.get_text(strip=True)
                    match = pattern_fallback.match(text)
                    if match:
                        postal_code = match.group("cp")
                        city = match.group("ville").strip()
                        break

            # 6) Construire l’objet Club
            return Club(
                id=club_id,
                name=club_name,
                phone_number=phone_number,
                email=email,
                website=website,
                city=city,
                postal_code=postal_code
            )

        except Exception as e:
            log_event(
                action="club_scraper_parse_error",
                level="error",
                club_id=club_id,
                error=str(e),
                message=f"[club_scraper + parse_club_page] - Erreur lors du parsing HTML du club {club_id}."
            )
            return None