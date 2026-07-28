# Club scraper

The application imports club details from the FFVB address book and writes them through Blockout's internal APIs.

## Local setup

From the repository root, create the single shared Python environment:

```shell
uv sync --locked --all-packages
```

Do not run `uv sync` from this application directory. Nx uses the root
workspace `.venv` without synchronizing it, so run checks from the repository
root after the explicit sync:

```shell
npm exec nx run @blockout/club-scraper:format-check
npm exec nx run @blockout/club-scraper:test
```
