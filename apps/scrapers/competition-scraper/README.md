# Competition Scraper

## Local setup

```bash
cd apps/scrapers/competition-scraper
cp .env.example .env
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

The Prometheus endpoint listens on port `8000`. To use the centralized local VPN proxy, configure
`infra/compose/.env` and start the `scraping` profile documented in `infra/compose/README.md`.

## Workspace validation

```bash
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:docker-build
```

No pytest test cases are currently collected. Do not report the scraper test suite as passing until real tests exist.
