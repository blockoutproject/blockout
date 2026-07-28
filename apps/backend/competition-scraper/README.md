# Competition scraper

The application imports FFVB departmental, regional, and national competitions,
then enriches professional competitions with LNV data before writing through
Blockout's internal APIs.

## Local setup

From the repository root, create the single shared Python environment:

```shell
uv sync --locked --all-packages
```

Do not run `uv sync` from this application directory. Nx uses the root
workspace `.venv` without synchronizing it, so run the local checks from the
repository root after the explicit sync:

```shell
npm exec nx run @blockout/competition-scraper:format-check
npm exec nx run @blockout/competition-scraper:test
npm exec nx run @blockout/competition-scraper:syntax-check
```

`main.py` is only the executable entry point. Production code lives in the
application-local `scraper` package, split into application orchestration,
provider-independent domain rules, external adapters, configuration, scheduling,
and observability.
