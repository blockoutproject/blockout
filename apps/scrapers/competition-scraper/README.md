# Competition Scraper

## Local setup

```bash
cp apps/scrapers/competition-scraper/.env.example apps/scrapers/competition-scraper/.env
npm exec nx run @blockout/python-contract-clients:sync
npm exec nx run @blockout/competition-scraper:serve
```

The Prometheus endpoint listens on port `8000`. To use the centralized local VPN proxy, configure
`infra/compose/.env` and start the `scraping` profile documented in `infra/compose/README.md`.

## Workspace validation

```bash
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:docker-build
```

No pytest test cases are currently collected. Do not report the scraper test suite as passing until real tests exist.
