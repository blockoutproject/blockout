# Club scraper

The application imports club details from the FFVB address book and writes them through Blockout's internal APIs.

## Local setup

```shell
uv sync --locked --all-packages
```

The command creates the single ignored workspace `.venv`. Run checks through Nx
from the repository root:

```shell
npm exec nx run @blockout/club-scraper:format-check
npm exec nx run @blockout/club-scraper:test
```
