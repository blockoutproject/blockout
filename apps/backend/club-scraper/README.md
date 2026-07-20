# Club scraper

The application imports club details from the FFVB address book and writes them through Blockout's internal APIs.

## Local setup

```shell
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

Run checks through Nx from the repository root:

```shell
npm exec nx run @blockout/club-scraper:format-check
npm exec nx run @blockout/club-scraper:test
```
