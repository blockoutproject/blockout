# Club Scraper

## Local setup

```bash
cp apps/scrapers/club-scraper/.env.example apps/scrapers/club-scraper/.env
npm exec nx run @blockout/python-contract-clients:sync
npm exec nx run @blockout/club-scraper:serve
```

The Prometheus endpoint listens on port `8001`.

## Workspace validation

```bash
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/club-scraper:docker-build
```

No pytest test cases are currently collected. Do not report the scraper test suite as passing until real tests exist.
