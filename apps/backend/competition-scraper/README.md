# Competition scraper

The application imports FFVB departmental, regional, and national competitions,
then enriches professional competitions with LNV data before writing through
Blockout's internal APIs.

## Local setup

```shell
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

Run the local checks through Nx from the repository root:

```shell
npm exec nx run @blockout/competition-scraper:format-check
npm exec nx run @blockout/competition-scraper:test
npm exec nx run @blockout/competition-scraper:syntax-check
```

`main.py` is only the executable entry point. Production code lives in the
application-local `scraper` package, split into application orchestration,
provider-independent domain rules, external adapters, configuration, scheduling,
and observability.
