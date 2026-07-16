# Python Scraper Policy

The competition and club scrapers are standalone Python deployables represented by explicit Nx projects.

- Do not add a Python Nx plugin by default.
- Keep requirements, Dockerfile, scheduler, Auth0 client-credentials flow, proxy behavior, and Prometheus port owned by
  the scraper.
- Preserve scheduler frequency and enabled/disabled gating unless an explicit runtime task changes them.
- Use async HTTP clients consistently and keep bounded timeouts and concurrency.
- Never log tokens, credentials, proxy passwords, or raw sensitive responses.
- Keep proxy credentials in environment files or deployment secrets.
- No scraper test suite is currently collected. Run the Nx syntax check and build the owning Docker image after
  packaging changes; do not report pytest as passing until real tests exist.
