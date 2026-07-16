# Club Scraper

## Local setup

```bash
cd apps/scrapers/club-scraper
cp .env.example .env
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

The Prometheus endpoint listens on port `8001`.

## Workspace validation

```bash
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/club-scraper:docker-build
```

No pytest test cases are currently collected. Do not report the scraper test suite as passing until real tests exist.
