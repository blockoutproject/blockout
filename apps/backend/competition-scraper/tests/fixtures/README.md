# Provider fixture provenance

Every FFVB HTML/CSV fixture and LNV Data Project HTML fixture is a sanitized,
reduced excerpt of a public provider response captured on 2026-07-20. Reduction
keeps the original elements and values read by the parser; it removes unrelated
layout, scripts, assets, additional rows, and referee names.

The REF-026 FFVB matrix covers five real calendar exports and their pool pages
for each supported family:

- departmental: PTRA01/JFA and PTRA69/BM1, SMA, JF1, QFA (2025/2026);
- regional: LIAQ/PFA, LIBR/RFA, LIIDF/1FA (2025/2026), plus LIRA/PFA and
  LIPL/8F1 (2026/2027);
- national: ABCCS/2FA, 2MA, 3FA, 3MA, EFA (2026/2027).

`departmental_pool_access.html`, `regional_pool_access.html`, and
`national_pool_access.html` retain the authentic navigation elements leading to
those pools. The three `competition-124/125/126.html` fixtures retain match
blocks from the current Saforelle Power 6, Marmara SpikeLigue, and Ligue B
Masculine Data Project pages.

The live LNV XML endpoints were temporarily unavailable during REF-026. Their
URLs, transport, parsing, and fixtures are intentionally unchanged by this task.
The existing XML fixtures remain reduced excerpts of official responses archived
by the Internet Archive on 2023-01-30.
