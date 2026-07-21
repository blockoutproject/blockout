# Competition scraper

The application imports FFVB departmental, regional, and national competitions,
then enriches professional competitions with LNV data before writing through
Blockout's internal APIs.

## Local setup

```shell
uv sync --locked --all-packages
```

The command creates the single ignored workspace `.venv`. Run the local checks
through Nx from the repository root:

```shell
npm exec nx run @blockout/competition-scraper:format-check
npm exec nx run @blockout/competition-scraper:test
npm exec nx run @blockout/competition-scraper:syntax-check
```

`main.py` is only the executable entry point. Production code lives in the
application-local `scraper` package, split into application orchestration,
provider-independent domain rules, external adapters, configuration, scheduling,
and observability.
